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

const IOS_FALLBACK_WORKFLOW = "build-ios-lovable.yml";
const GH_EXPR = "${{";
const IOS_FALLBACK_WORKFLOW_CONTENT = `name: Build iOS (Lovable)

on:
  workflow_dispatch:
    inputs:
      build_id:
        description: "Build record ID from Build Center"
        required: true
        type: string

jobs:
  build-ios:
    runs-on: macos-latest
    env:
      FLUTTER_VERSION: "3.24.5"

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Flutter
        uses: subosito/flutter-action@v2
        with:
          flutter-version: "3.24.5"
          channel: stable

      - name: Flutter pub get
        working-directory: flutter_app
        run: flutter pub get

      - name: Setup signing assets
        env:
          BUILD_CERTIFICATE_BASE64: ${GH_EXPR} secrets.BUILD_CERTIFICATE_BASE64 }}
          P12_PASSWORD: ${GH_EXPR} secrets.P12_PASSWORD }}
          BUILD_PROVISION_PROFILE_BASE64: ${GH_EXPR} secrets.BUILD_PROVISION_PROFILE_BASE64 }}
        run: |
          CERT_PATH=$RUNNER_TEMP/build_certificate.p12
          PP_PATH=$RUNNER_TEMP/build_pp.mobileprovision
          KEYCHAIN_PATH=$RUNNER_TEMP/app-signing.keychain-db

          echo -n "$BUILD_CERTIFICATE_BASE64" | base64 --decode -o "$CERT_PATH"
          echo -n "$BUILD_PROVISION_PROFILE_BASE64" | base64 --decode -o "$PP_PATH"

          security create-keychain -p "$P12_PASSWORD" "$KEYCHAIN_PATH"
          security set-keychain-settings -lut 21600 "$KEYCHAIN_PATH"
          security unlock-keychain -p "$P12_PASSWORD" "$KEYCHAIN_PATH"
          security import "$CERT_PATH" -P "$P12_PASSWORD" -A -t cert -f pkcs12 -k "$KEYCHAIN_PATH"
          security list-keychain -d user -s "$KEYCHAIN_PATH"

          mkdir -p ~/Library/MobileDevice/Provisioning\ Profiles
          cp "$PP_PATH" ~/Library/MobileDevice/Provisioning\ Profiles/AppStoreTimetrade.mobileprovision

      - name: Build IPA
        working-directory: flutter_app
        run: flutter build ipa --release --export-options-plist=ios/ExportOptions.plist

      - name: Upload IPA artifact
        uses: actions/upload-artifact@v4
        with:
          name: ios-ipa-${GH_EXPR} github.run_id }}
          path: flutter_app/build/ios/ipa/*.ipa
          if-no-files-found: error

      - name: Notify build complete
        if: always()
        run: echo "Build ID: ${GH_EXPR} inputs.build_id }} finished with status ${GH_EXPR} job.status }}"
`;

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

function addWorkflowDispatchTrigger(content: string): string | null {
  if (/\bworkflow_dispatch\s*:/m.test(content)) return content;

  const onBlock = /^on:\s*\n/m;
  if (onBlock.test(content)) {
    return content.replace(onBlock, "on:\n  workflow_dispatch:\n");
  }

  const onArray = /^on:\s*\[([^\]]+)\]\s*$/m;
  if (onArray.test(content)) {
    return content.replace(onArray, (_match, eventsRaw: string) => {
      const events = eventsRaw.split(",").map((e) => e.trim()).filter(Boolean);
      const eventLines = events.map((e) => `  ${e}:`).join("\n");
      return `on:\n  workflow_dispatch:\n${eventLines}`;
    });
  }

  const onSingle = /^on:\s*([a-zA-Z_][\w-]*)\s*$/m;
  if (onSingle.test(content)) {
    return content.replace(onSingle, (_match, eventName: string) => {
      return `on:\n  workflow_dispatch:\n  ${eventName}:`;
    });
  }

  return null;
}

async function ensureWorkflowDispatchTrigger(
  githubRepo: string,
  workflowFile: string,
  ref: string,
  token: string
): Promise<{ updated: boolean; note: string }> {
  const workflowPath = `.github/workflows/${workflowFile}`;
  const encodedPath = encodeURIComponent(workflowPath);

  const file = await githubAPI(
    `/repos/${githubRepo}/contents/${encodedPath}?ref=${encodeURIComponent(ref)}`,
    token
  ) as { content?: string; sha?: string; encoding?: string };

  if (!file.content || !file.sha) {
    throw new Error(`Unable to read workflow file ${workflowPath} on branch ${ref}`);
  }

  const decoded = atob(file.content.replace(/\n/g, ""));
  const patched = addWorkflowDispatchTrigger(decoded);

  if (!patched) {
    throw new Error(`Could not auto-patch workflow ${workflowPath}; unsupported 'on:' format`);
  }

  if (patched === decoded) {
    return { updated: false, note: `${workflowPath} already has workflow_dispatch` };
  }

  await githubAPI(
    `/repos/${githubRepo}/contents/${encodedPath}`,
    token,
    "PUT",
    {
      message: `fix(ci): add workflow_dispatch to ${workflowFile}`,
      content: btoa(patched),
      sha: file.sha,
      branch: ref,
    }
  );

  return { updated: true, note: `Added workflow_dispatch to ${workflowPath} on ${ref}` };
}

async function upsertWorkflowFile(
  githubRepo: string,
  workflowFile: string,
  ref: string,
  content: string,
  token: string
): Promise<void> {
  const workflowPath = `.github/workflows/${workflowFile}`;
  const encodedPath = encodeURIComponent(workflowPath);

  let existingSha: string | undefined;
  let existingContent = "";

  try {
    const file = await githubAPI(
      `/repos/${githubRepo}/contents/${encodedPath}?ref=${encodeURIComponent(ref)}`,
      token
    ) as { content?: string; sha?: string };

    existingSha = file.sha;
    if (file.content) {
      existingContent = atob(file.content.replace(/\n/g, ""));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("GitHub API error [404]")) {
      throw error;
    }
  }

  if (existingContent === content) return;

  await githubAPI(
    `/repos/${githubRepo}/contents/${encodedPath}`,
    token,
    "PUT",
    {
      message: `chore(ci): ensure ${workflowFile} for Build Center`,
      content: btoa(content),
      ...(existingSha ? { sha: existingSha } : {}),
      branch: ref,
    }
  );
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

        let workflow = WORKFLOW_MAP[platform];
        const repoInfo = await githubAPI(`/repos/${githubRepo}`, GITHUB_PAT) as { default_branch?: string };
        const dispatchRef = repoInfo.default_branch || "main";

        if (platform === "ios") {
          await upsertWorkflowFile(
            githubRepo,
            IOS_FALLBACK_WORKFLOW,
            dispatchRef,
            IOS_FALLBACK_WORKFLOW_CONTENT,
            GITHUB_PAT
          );
          workflow = IOS_FALLBACK_WORKFLOW;
        }
        try {
          const workflows = await githubAPI(
            `/repos/${githubRepo}/actions/workflows?per_page=100`,
            GITHUB_PAT
          ) as { workflows?: Array<{ id: number; name: string; path: string }> };

          const allWorkflows = workflows.workflows || [];
          const exactMatch = allWorkflows.find((w) =>
            w.path === `.github/workflows/${workflow}` || w.path.endsWith(`/${workflow}`)
          );

          const platformKeyword = platform.toLowerCase();
          const candidateWorkflows = [
            ...(exactMatch ? [exactMatch] : []),
            ...allWorkflows.filter((w) =>
              w !== exactMatch &&
              (`${w.name} ${w.path}`).toLowerCase().includes(platformKeyword)
            ),
          ];

          if (candidateWorkflows.length === 0) {
            const available = allWorkflows.map((w) => w.path || w.name).join(", ") || "none";
            throw new Error(`Workflow ${workflow} not found in ${githubRepo}. Available: ${available}`);
          }

          let dispatched = false;
          let lastDispatchError: unknown = null;

          for (const candidate of candidateWorkflows) {
            try {
              await githubAPI(
                `/repos/${githubRepo}/actions/workflows/${candidate.id}/dispatches`,
                GITHUB_PAT,
                "POST",
                {
                  ref: dispatchRef,
                  inputs: { build_id: build.id },
                }
              );
              dispatched = true;
              break;
            } catch (dispatchError) {
              const message = dispatchError instanceof Error ? dispatchError.message : String(dispatchError);
              const isWorkflowDispatch422 =
                message.includes("GitHub API error [422]") &&
                message.includes("workflow_dispatch");

              if (!isWorkflowDispatch422) throw dispatchError;
              lastDispatchError = dispatchError;
            }
          }

          if (!dispatched) {
            // Final fallback: dispatch by configured workflow file name.
            await githubAPI(
              `/repos/${githubRepo}/actions/workflows/${workflow}/dispatches`,
              GITHUB_PAT,
              "POST",
              {
                ref: dispatchRef,
                inputs: { build_id: build.id },
              }
            ).catch((e) => {
              throw (lastDispatchError ?? e);
            });
          }
        } catch (dispatchErr) {
          const dispatchMessage = dispatchErr instanceof Error ? dispatchErr.message : "Dispatch failed";
          const isWorkflowDispatch422 =
            dispatchMessage.includes("GitHub API error [422]") &&
            dispatchMessage.includes("workflow_dispatch");

          if (isWorkflowDispatch422) {
            let repairNote: string | null = null;

            // First fallback: auto-repair workflow file in GitHub and retry dispatch.
            try {
              const targetWorkflow = WORKFLOW_MAP[platform];
              const repair = await ensureWorkflowDispatchTrigger(
                githubRepo,
                targetWorkflow,
                dispatchRef,
                GITHUB_PAT
              );
              repairNote = repair.note;

              await githubAPI(
                `/repos/${githubRepo}/actions/workflows/${targetWorkflow}/dispatches`,
                GITHUB_PAT,
                "POST",
                {
                  ref: dispatchRef,
                  inputs: { build_id: build.id },
                }
              );

              await supabase.from("builds").update({
                status: "building",
                error_message: null,
              }).eq("id", build.id);

              return new Response(
                JSON.stringify({
                  success: true,
                  fallback: "auto-repair-dispatch",
                  message: "I auto-fixed the GitHub workflow by adding workflow_dispatch and retried the build trigger.",
                  note: repairNote,
                  build: {
                    ...build,
                    status: "building",
                  },
                }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            } catch (repairErr) {
              const repairErrorMessage = repairErr instanceof Error ? repairErr.message : String(repairErr);
              repairNote = repairNote ? `${repairNote}; ${repairErrorMessage}` : repairErrorMessage;
              console.error("Auto-repair workflow fallback failed:", repairErr);
            }

            // Second fallback: rerun latest completed workflow run for this platform.
            try {
              const workflows = await githubAPI(
                `/repos/${githubRepo}/actions/workflows?per_page=100`,
                GITHUB_PAT
              ) as { workflows?: Array<{ id: number; name: string; path: string }> };

              const targetWorkflow = WORKFLOW_MAP[platform];
              const allWorkflows = workflows.workflows || [];
              const candidates = allWorkflows.filter((w) =>
                w.path === `.github/workflows/${targetWorkflow}` ||
                w.path.endsWith(`/${targetWorkflow}`) ||
                (`${w.name} ${w.path}`).toLowerCase().includes(platform.toLowerCase())
              );

              for (const candidate of candidates) {
                const runsRes = await githubAPI(
                  `/repos/${githubRepo}/actions/workflows/${candidate.id}/runs?per_page=10`,
                  GITHUB_PAT
                ) as { workflow_runs?: Array<{ id: number; status: string; html_url: string }> };

                const rerunnable = (runsRes.workflow_runs || []).find((r) => r.status === "completed");
                if (!rerunnable) continue;

                await githubAPI(
                  `/repos/${githubRepo}/actions/runs/${rerunnable.id}/rerun`,
                  GITHUB_PAT,
                  "POST"
                );

                await supabase.from("builds").update({
                  status: "building",
                  artifact_url: rerunnable.html_url,
                  error_message: null,
                }).eq("id", build.id);

                return new Response(
                  JSON.stringify({
                    success: true,
                    fallback: "rerun",
                    message: "workflow_dispatch unavailable; triggered rerun of latest workflow run instead.",
                    note: repairNote,
                    run_id: rerunnable.id,
                    run_url: rerunnable.html_url,
                    build: {
                      ...build,
                      status: "building",
                      artifact_url: rerunnable.html_url,
                    },
                  }),
                  { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
              }
            } catch (fallbackErr) {
              console.error("Fallback rerun failed:", fallbackErr);
            }
          }

          await supabase.from("builds").update({
            status: "failed",
            error_message: dispatchMessage,
            completed_at: new Date().toISOString(),
          }).eq("id", build.id);

          if (isWorkflowDispatch422) {
            return new Response(
              JSON.stringify({
                success: false,
                retryable: false,
                error: dispatchMessage,
                hint: "GitHub rejected workflow_dispatch and fallback rerun could not be started. Ensure at least one completed iOS run exists, or sync/update .github/workflows/build-ios.yml in the connected GitHub repo.",
                build,
              }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

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
