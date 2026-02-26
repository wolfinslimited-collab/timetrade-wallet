import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_GITHUB_REPO = "wolfinslimited-collab/ai-wallet";

const WORKFLOW_MAP: Record<string, string> = {
  android: "build-android.yml",
  macos: "build-macos.yml",
  ios: "build-ios.yml",
};

interface BuildRequest {
  action: "trigger" | "status" | "list-runs" | "download-artifact" | "fetch-logs" | "cancel";
  platform?: string;
  buildId?: string;
  runId?: number;
}

async function githubAPI(path: string, token: string, method = "GET", body?: unknown, retries = 2): Promise<unknown> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
    try {
      const res = await fetch(`https://api.github.com${path}`, {
        method,
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`GitHub API error [${res.status}]: ${text}`);
      }

      // 204 No Content for dispatch
      if (res.status === 204) return { success: true };
      return res.json();
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const isTimeout = err instanceof DOMException && err.name === "AbortError";
      const isNetwork = err instanceof TypeError && (err as Error).message.includes("error sending request");
      if ((isTimeout || isNetwork) && attempt < retries) {
        console.log(`GitHub API attempt ${attempt + 1} failed, retrying in ${(attempt + 1) * 2}s...`);
        await new Promise(r => setTimeout(r, (attempt + 1) * 2000));
        continue;
      }
      throw err;
    }
  }
  throw new Error("GitHub API: max retries exceeded");
}

async function fetchJobLogText(jobId: number, token: string, githubRepo: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${githubRepo}/actions/jobs/${jobId}/logs`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        redirect: "follow",
      }
    );
    if (!res.ok) return null;
    const text = await res.text();
    return text;
  } catch {
    return null;
  }
}

function extractFailedStepLogs(fullLog: string, failedStepName: string): string {
  const lines = fullLog.split("\n");
  let capturing = false;
  let captured: string[] = [];
  
  // Try to find the step's ##[group] section
  for (const line of lines) {
    if (line.includes(`##[group]${failedStepName}`)) {
      capturing = true;
      captured = [];
      continue;
    }
    if (capturing) {
      if (line.includes("##[endgroup]")) {
        capturing = false;
        continue;
      }
      captured.push(line);
    }
  }

  if (captured.length > 0) {
    return captured.slice(-150).join("\n");
  }

  // Fallback: return last 150 lines of the entire log (captures set -ex output)
  return lines.slice(-150).join("\n");
}

function sanitizeRepo(repo: string): string {
  return repo.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\.git$/, "").replace(/^\/+|\/+$/g, "");
}

function toErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return "Unknown error";
  if (error.message.includes("GitHub API error [404]")) {
    return `${error.message} — verify the repo slug and that GITHUB_PAT has repo + workflow permissions.`;
  }
  return error.message;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GITHUB_PAT = Deno.env.get("GITHUB_PAT");
    if (!GITHUB_PAT) throw new Error("GITHUB_PAT is not configured");
    const githubRepo = sanitizeRepo(Deno.env.get("GITHUB_REPO") || DEFAULT_GITHUB_REPO);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase credentials not configured");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body: BuildRequest = await req.json();

    switch (body.action) {
      case "trigger": {
        const { platform } = body;
        if (!platform || !WORKFLOW_MAP[platform]) {
          throw new Error(`Invalid platform: ${platform}. Must be: ${Object.keys(WORKFLOW_MAP).join(", ")}`);
        }

        const { data: build, error: insertError } = await supabase
          .from("builds")
          .insert({ platform, status: "provisioning" })
          .select()
          .single();
        if (insertError) throw new Error(`Failed to create build: ${insertError.message}`);

        const workflow = WORKFLOW_MAP[platform];
        try {
          const workflows = await githubAPI(
            `/repos/${githubRepo}/actions/workflows?per_page=100`,
            GITHUB_PAT
          ) as { workflows?: Array<{ id: number; name: string; path: string }> };

          const workflowMatch = (workflows.workflows || []).find((w) =>
            w.path === `.github/workflows/${workflow}` || w.path.endsWith(`/${workflow}`)
          );

          if (!workflowMatch) {
            const available = (workflows.workflows || []).map((w) => w.path || w.name).join(", ") || "none";
            throw new Error(`Workflow ${workflow} not found in ${githubRepo}. Available: ${available}`);
          }

          await githubAPI(
            `/repos/${githubRepo}/actions/workflows/${workflowMatch.id}/dispatches`,
            GITHUB_PAT,
            "POST",
            {
              ref: "main",
              inputs: { build_id: build.id },
            }
          );
        } catch (dispatchErr) {
          // Clean up the orphaned build record
          await supabase.from("builds").update({
            status: "failed",
            error_message: dispatchErr instanceof Error ? dispatchErr.message : "Dispatch failed",
            completed_at: new Date().toISOString(),
          }).eq("id", build.id);
          throw dispatchErr;
        }

        await supabase.from("builds").update({ status: "building" }).eq("id", build.id);

        return new Response(
          JSON.stringify({ success: true, build }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "status": {
        const { buildId } = body;

        if (buildId) {
          const { data: build } = await supabase.from("builds").select("*").eq("id", buildId).single();
          return new Response(
            JSON.stringify({ success: true, build }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: builds } = await supabase
          .from("builds")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(20);

        return new Response(
          JSON.stringify({ success: true, builds }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "list-runs": {
        const { platform } = body;
        const workflow = platform ? WORKFLOW_MAP[platform] : undefined;

        let path = `/repos/${githubRepo}/actions/runs?per_page=10`;
        if (workflow) {
          const workflows = await githubAPI(`/repos/${githubRepo}/actions/workflows`, GITHUB_PAT);
          const wf = workflows.workflows?.find((w: { path: string }) => w.path === `.github/workflows/${workflow}`);
          if (wf) {
            path = `/repos/${githubRepo}/actions/workflows/${wf.id}/runs?per_page=10`;
          }
        }

        const runs = await githubAPI(path, GITHUB_PAT);
        return new Response(
          JSON.stringify({ success: true, runs: runs.workflow_runs }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "download-artifact": {
        const { runId } = body;
        if (!runId) throw new Error("runId is required for download-artifact");

        // Retry up to 3 times with 2s delay - artifacts may not be immediately available
        let artifacts: any[] = [];
        for (let attempt = 0; attempt < 3; attempt++) {
          const artifactsRes = await githubAPI(
            `/repos/${githubRepo}/actions/runs/${runId}/artifacts`,
            GITHUB_PAT
          );
          artifacts = artifactsRes.artifacts || [];
          if (artifacts.length > 0) break;
          if (attempt < 2) {
            await new Promise(r => setTimeout(r, 2000));
          }
        }

        if (artifacts.length === 0) {
          // Return a non-500 response so the client can retry gracefully
          return new Response(
            JSON.stringify({
              success: false,
              retryable: true,
              error: "Artifacts not yet available. GitHub may still be processing. Please try again in a few seconds.",
            }),
            { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const artifact = artifacts.find((a: { name?: string }) => /ipa|ios/i.test(a.name || "")) || artifacts[0];
        const downloadRes = await fetch(
          `https://api.github.com/repos/${githubRepo}/actions/artifacts/${artifact.id}/zip`,
          {
            headers: {
              Authorization: `Bearer ${GITHUB_PAT}`,
              Accept: "application/vnd.github+json",
              "X-GitHub-Api-Version": "2022-11-28",
            },
            redirect: "manual",
          }
        );

        const downloadUrl = downloadRes.headers.get("Location");
        if (!downloadUrl) {
          throw new Error("Failed to get artifact download URL");
        }

        return new Response(
          JSON.stringify({
            success: true,
            artifact: {
              name: artifact.name,
              size_in_bytes: artifact.size_in_bytes,
              download_url: downloadUrl,
              expires_at: artifact.expires_at,
            },
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "fetch-logs": {
        const { buildId } = body;
        if (!buildId) throw new Error("buildId is required for fetch-logs");

        const { data: buildRecord } = await supabase
          .from("builds")
          .select("*")
          .eq("id", buildId)
          .single();

        if (!buildRecord) throw new Error("Build not found");

        // Try to extract run ID from artifact_url first
        let runId: string | null = null;
        const runMatch = buildRecord.artifact_url?.match(/\/runs\/(\d+)/);
        if (runMatch) {
          runId = runMatch[1];
        }

        // If no run ID yet, try to find matching run by platform and timing
        if (!runId) {
          const workflow = WORKFLOW_MAP[buildRecord.platform];
          if (workflow) {
            const workflows = await githubAPI(`/repos/${githubRepo}/actions/workflows`, GITHUB_PAT);
            const wf = workflows.workflows?.find((w: { path: string }) => w.path === `.github/workflows/${workflow}`);
            if (wf) {
              const runsRes = await githubAPI(
                `/repos/${githubRepo}/actions/workflows/${wf.id}/runs?per_page=5`,
                GITHUB_PAT
              );
              const runs = runsRes.workflow_runs || [];
              const buildTime = new Date(buildRecord.created_at).getTime();
              for (const r of runs) {
                const runTime = new Date(r.created_at).getTime();
                if (Math.abs(runTime - buildTime) < 120000) {
                  runId = String(r.id);
                  await supabase.from("builds").update({
                    artifact_url: r.html_url,
                  }).eq("id", buildId);
                  break;
                }
              }
            }
          }
        }

        // If we found a run ID, fetch job details
        if (runId) {
          const jobsRes = await githubAPI(
            `/repos/${githubRepo}/actions/runs/${runId}/jobs`,
            GITHUB_PAT
          );

          const runRes = await githubAPI(
            `/repos/${githubRepo}/actions/runs/${runId}`,
            GITHUB_PAT
          );

          const jobs = jobsRes.jobs || [];
          const logs: Array<{
            name: string;
            status: string;
            conclusion: string | null;
            steps: Array<{name: string; status: string; conclusion: string | null}>;
            failed_step_log?: string;
          }> = [];

          for (const job of jobs) {
            const jobEntry: typeof logs[number] = {
              name: job.name,
              status: job.status,
              conclusion: job.conclusion,
              steps: (job.steps || []).map((s: {name: string; status: string; conclusion: string | null}) => ({
                name: s.name,
                status: s.status,
                conclusion: s.conclusion,
              })),
            };

            // If the job has failed steps, fetch the actual log text (skip non-critical steps)
            const NON_CRITICAL = ["Notify build complete", "Post Checkout", "Post Setup Flutter", "Complete job"];
            if (job.conclusion === "failure" || job.status === "completed") {
              const failedStep = (job.steps || []).find(
                (s: { name: string; conclusion: string | null }) => 
                  s.conclusion === "failure" && !NON_CRITICAL.some(nc => s.name.includes(nc))
              );
              if (failedStep) {
                const fullLog = await fetchJobLogText(job.id, GITHUB_PAT, githubRepo);
                if (fullLog) {
                  jobEntry.failed_step_log = extractFailedStepLogs(fullLog, failedStep.name);
                }
              }
            }

            logs.push(jobEntry);
          }

          // Update build status based on GitHub run status
          const ghStatus = runRes.status;
          const ghConclusion = runRes.conclusion;
          let dbStatus = buildRecord.status;
          if (ghStatus === "completed") {
            // Check if failure was only in non-critical steps (e.g. "Notify build complete")
            const NON_CRITICAL_STEPS = ["Notify build complete", "Post Checkout", "Post Setup Flutter", "Complete job"];
            let artifactUploaded = false;
            let onlyNonCriticalFailed = true;
            
            for (const job of jobs) {
              const steps = job.steps || [];
              for (const s of steps) {
                const sAny = s as Record<string, unknown>;
                const stepName = String(sAny.name || "");
                const stepConclusion = sAny.conclusion as string | null;
                if (stepName.toLowerCase().includes("upload") && stepConclusion === "success") {
                  artifactUploaded = true;
                }
                if (stepConclusion === "failure") {
                  const isNonCritical = NON_CRITICAL_STEPS.some(nc => stepName.includes(nc));
                  if (!isNonCritical) {
                    onlyNonCriticalFailed = false;
                  }
                }
              }
            }
            
            console.log(`Build eval: artifactUploaded=${artifactUploaded}, onlyNonCriticalFailed=${onlyNonCriticalFailed}, ghConclusion=${ghConclusion}`);
            
            // If artifacts uploaded and only non-critical steps failed, treat as success
            if (ghConclusion === "failure" && artifactUploaded && onlyNonCriticalFailed) {
              dbStatus = "completed";
            } else {
              dbStatus = ghConclusion === "success" ? "completed" : "failed";
            }
            
            const updateData: Record<string, unknown> = {
              status: dbStatus,
              completed_at: new Date().toISOString(),
              artifact_url: runRes.html_url,
            };
            if (dbStatus === "failed") {
              updateData.error_message = `GitHub Actions: ${ghConclusion}`;
              // Store the failed step log in build_log for persistence
              const failedJobLog = logs.find(j => j.failed_step_log)?.failed_step_log;
              if (failedJobLog) {
                updateData.build_log = failedJobLog;
              }
            } else {
              // Clear any previous error
              updateData.error_message = null;
            }
            await supabase.from("builds").update(updateData).eq("id", buildId);
          } else if (ghStatus === "in_progress" && buildRecord.status !== "building") {
            await supabase.from("builds").update({ status: "building" }).eq("id", buildId);
          }

          return new Response(
            JSON.stringify({
              success: true,
              run_id: runId,
              run_url: runRes.html_url,
              status: ghStatus,
              conclusion: ghConclusion,
              jobs: logs,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Still no run found
        const runsRes = await githubAPI(
          `/repos/${githubRepo}/actions/runs?per_page=5`,
          GITHUB_PAT
        );
        const recentRuns = runsRes.workflow_runs || [];

        return new Response(
          JSON.stringify({
            success: true,
            run_id: null,
            status: buildRecord.status,
            conclusion: null,
            message: "Waiting for GitHub Actions to start the workflow...",
            recent_runs: recentRuns.map((r: {id: number; name: string; status: string; html_url: string}) => ({
              id: r.id,
              name: r.name,
              status: r.status,
              url: r.html_url,
            })),
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "cancel": {
        const { buildId } = body;
        if (!buildId) throw new Error("buildId is required");

        const { data: buildRecord } = await supabase
          .from("builds")
          .select("*")
          .eq("id", buildId)
          .single();
        if (!buildRecord) throw new Error("Build not found");

        // Try to cancel the GitHub Actions run if we have an artifact_url with a run ID
        if (buildRecord.artifact_url) {
          const runMatch = buildRecord.artifact_url.match(/\/runs\/(\d+)/);
          if (runMatch) {
            try {
              await githubAPI(
                `/repos/${githubRepo}/actions/runs/${runMatch[1]}/cancel`,
                GITHUB_PAT,
                "POST"
              );
            } catch {
              // Ignore - run may already be finished
            }
          }
        }

        // Mark as failed/cancelled in database
        await supabase
          .from("builds")
          .update({ status: "failed", error_message: "Cancelled by user", completed_at: new Date().toISOString() })
          .eq("id", buildId);

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        throw new Error(`Unknown action: ${body.action}`);
    }
  } catch (error: unknown) {
    console.error("GitHub build error:", error);
    const msg = toErrorMessage(error);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
