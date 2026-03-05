import { useState, useEffect } from "react";
import { Copy, Check, Apple, Smartphone, Monitor, Terminal, ChevronDown, ChevronRight, AlertTriangle, Info, Play, Square, Loader2, Download, Clock, CheckCircle2, XCircle, Server, Github, ExternalLink, FileText, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Platform = "android" | "ios" | "flutter_android" | "flutter_ios";
type BuildStatus = "pending" | "provisioning" | "building" | "uploading" | "completed" | "failed";

interface Build {
  id: string;
  platform: Platform;
  status: BuildStatus;
  runpod_pod_id: string | null;
  artifact_url: string | null;
  build_log: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

interface BuildStep {
  title: string;
  command?: string;
  note?: string;
  warning?: string;
}

const PLATFORM_META: Record<Platform, { label: string; icon: typeof Monitor; color: string; desc: string }> = {
  android: { label: "Android APK/AAB", icon: Smartphone, color: "text-green-400", desc: "Capacitor · GitHub Actions · ubuntu-latest" },
  ios: { label: "iOS IPA", icon: Apple, color: "text-gray-300", desc: "Capacitor · GitHub Actions · macos-latest" },
  flutter_android: { label: "Flutter Android", icon: Smartphone, color: "text-emerald-400", desc: "Flutter · GitHub Actions · ubuntu-latest" },
  flutter_ios: { label: "Flutter iOS", icon: Apple, color: "text-blue-300", desc: "Flutter · GitHub Actions · macos-latest" },
};

const STATUS_META: Record<BuildStatus, { label: string; color: string; spinning: boolean }> = {
  pending: { label: "Pending", color: "text-muted-foreground", spinning: false },
  provisioning: { label: "Queued", color: "text-yellow-400", spinning: true },
  building: { label: "Building", color: "text-blue-400", spinning: true },
  uploading: { label: "Uploading", color: "text-purple-400", spinning: true },
  completed: { label: "Completed", color: "text-green-400", spinning: false },
  failed: { label: "Failed", color: "text-red-400", spinning: false },
};

const MANUAL_STEPS: Record<Platform, BuildStep[]> = {
  android: [
    { title: "Install dependencies", command: "npm install" },
    { title: "Build web app", command: "npm run build" },
    { title: "Add Android platform", command: "npx cap add android" },
    { title: "Sync Capacitor", command: "npx cap sync android" },
    { title: "Run on device/emulator", command: "npx cap run android", note: "Requires Android Studio" },
  ],
  ios: [
    { title: "Install dependencies", command: "npm install" },
    { title: "Build web app", command: "npm run build" },
    { title: "Add iOS platform", command: "npx cap add ios" },
    { title: "Sync Capacitor", command: "npx cap sync ios" },
    { title: "Run on device/simulator", command: "npx cap run ios", note: "Requires Mac with Xcode" },
  ],
  flutter_android: [
    { title: "Navigate to Flutter app", command: "cd flutter_app" },
    { title: "Install dependencies", command: "flutter pub get" },
    { title: "Build debug APK", command: "flutter build apk --debug" },
    { title: "Build release APK", command: "flutter build apk --release", note: "Requires signing keystore for release" },
    { title: "Build AAB (Play Store)", command: "flutter build appbundle --release", note: "Requires signing keystore" },
  ],
  flutter_ios: [
    { title: "Navigate to Flutter app", command: "cd flutter_app" },
    { title: "Install dependencies", command: "flutter pub get" },
    { title: "Build iOS", command: "flutter build ipa --release", note: "Requires Mac with Xcode and signing certificates" },
  ],
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="p-1.5 rounded hover:bg-white/10 transition-colors shrink-0">
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
    </button>
  );
}

function CommandBlock({ step }: { step: BuildStep }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Terminal className="w-3.5 h-3.5 text-muted-foreground" />
        {step.title}
      </div>
      {step.command && (
        <div className="flex items-center gap-2 bg-black/40 rounded-md px-3 py-2 font-mono text-xs border border-white/5">
          <code className="flex-1 text-green-400 select-all">{step.command}</code>
          <CopyButton text={step.command} />
        </div>
      )}
      {step.note && (
        <div className="flex items-start gap-1.5 text-xs text-muted-foreground pl-1">
          <Info className="w-3 h-3 mt-0.5 shrink-0" />
          {step.note}
        </div>
      )}
      {step.warning && (
        <div className="flex items-start gap-1.5 text-xs text-amber-400 pl-1">
          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
          {step.warning}
        </div>
      )}
    </div>
  );
}

interface JobLog {
  name: string;
  status: string;
  conclusion: string | null;
  steps: Array<{ name: string; status: string; conclusion: string | null }>;
  failed_step_log?: string;
}

function BuildCard({ build, onFixTriggered, onCancelled }: { build: Build; onFixTriggered?: () => void; onCancelled?: () => void }) {
  const meta = PLATFORM_META[build.platform] || { label: build.platform, icon: Monitor, color: "text-muted-foreground", desc: "" };
  const statusMeta = STATUS_META[build.status];
  const Icon = meta.icon;
  const [downloading, setDownloading] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logs, setLogs] = useState<JobLog[] | null>(null);
  const [logMessage, setLogMessage] = useState<string | null>(null);
  const [runUrl, setRunUrl] = useState<string | null>(null);
  const [fixing, setFixing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [autoFixState, setAutoFixState] = useState<{ newBuildId: string; iteration: number; maxIterations: number } | null>(null);

  const isActive = ["pending", "provisioning", "building", "uploading"].includes(build.status);

  async function handleDownload() {
    if (!build.artifact_url) return;
    const match = build.artifact_url.match(/\/runs\/(\d+)/);
    if (!match) {
      window.open(build.artifact_url, "_blank");
      return;
    }

    setDownloading(true);
    try {
      const { data, error } = await supabase.functions.invoke("github-build", {
        body: { action: "download-artifact", runId: parseInt(match[1]) },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to get download link");
      window.open(data.artifact.download_url, "_blank");
      toast.success(`Downloading ${data.artifact.name}...`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Download failed";
      toast.error(msg);
    } finally {
      setDownloading(false);
    }
  }

  async function fetchLogs() {
    setLoadingLogs(true);
    setLogMessage(null);
    try {
      const { data, error } = await supabase.functions.invoke("github-build", {
        body: { action: "fetch-logs", buildId: build.id },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to fetch logs");
      setLogs(data.jobs || []);
      if (data.message) setLogMessage(data.message);
      if (data.run_url) setRunUrl(data.run_url);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to fetch logs";
      toast.error(msg);
    } finally {
      setLoadingLogs(false);
    }
  }

  function toggleLogs() {
    const next = !showLogs;
    setShowLogs(next);
    if (next && !logs) fetchLogs();
  }

  useEffect(() => {
    if (!showLogs || !isActive) return;
    const interval = setInterval(fetchLogs, 8000);
    return () => clearInterval(interval);
  }, [showLogs, isActive, build.id]);

  useEffect(() => {
    if (isActive && !showLogs) {
      setShowLogs(true);
      fetchLogs();
    }
  }, []);

  useEffect(() => {
    if (!autoFixState) return;
    const { newBuildId, iteration, maxIterations } = autoFixState;
    if (iteration >= maxIterations) return;

    const poll = setInterval(async () => {
      try {
        const { data: newBuild } = await supabase
          .from("builds")
          .select("*")
          .eq("id", newBuildId)
          .single();
        
        if (!newBuild) return;

        if (newBuild.status === "failed") {
          clearInterval(poll);
          const { data: logData } = await supabase.functions.invoke("github-build", {
            body: { action: "fetch-logs", buildId: newBuildId },
          });
          
          const failedJob = logData?.jobs?.find((j: JobLog) => j.failed_step_log);
          if (!failedJob?.failed_step_log) {
            toast.error(`Iteration ${iteration + 1} build failed but no error log found`);
            setAutoFixState(null);
            return;
          }

          toast.info(`Build failed again. Auto-fixing (iteration ${iteration + 1}/${maxIterations})...`);
          setFixing(true);

          const { data, error } = await supabase.functions.invoke("fix-and-rebuild", {
            body: {
              buildId: newBuildId,
              platform: build.platform,
              errorLog: failedJob.failed_step_log,
              iteration: iteration + 1,
              maxIterations,
            },
          });

          setFixing(false);
          if (error || !data?.success) {
            toast.error(data?.error || "Auto-fix failed");
            setAutoFixState(null);
          } else {
            toast.success(`Iteration ${iteration + 1}: Fixed ${data.fixes.length} file(s) & rebuilding!`, {
              description: data.summary,
            });
            setAutoFixState({
              newBuildId: data.newBuildId,
              iteration: data.iteration,
              maxIterations: data.maxIterations,
            });
            onFixTriggered?.();
          }
        } else if (newBuild.status === "completed") {
          clearInterval(poll);
          toast.success(`Build succeeded after ${iteration} fix iteration(s)!`);
          setAutoFixState(null);
          onFixTriggered?.();
        }
      } catch {
        // Ignore polling errors
      }
    }, 15000);

    return () => clearInterval(poll);
  }, [autoFixState]);

  const stepIcon = (conclusion: string | null, status: string) => {
    if (status === "in_progress") return <Loader2 className="w-3 h-3 animate-spin text-blue-400" />;
    if (status === "queued") return <Clock className="w-3 h-3 text-muted-foreground" />;
    if (conclusion === "success") return <CheckCircle2 className="w-3 h-3 text-green-400" />;
    if (conclusion === "failure") return <XCircle className="w-3 h-3 text-red-400" />;
    if (conclusion === "skipped") return <span className="w-3 h-3 text-muted-foreground">—</span>;
    return <Clock className="w-3 h-3 text-muted-foreground" />;
  };

  return (
    <div className="rounded-lg bg-black/20 border border-white/5 overflow-hidden">
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3 min-w-0">
          <Icon className={`w-4 h-4 shrink-0 ${meta.color}`} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">{meta.label}</span>
              <Badge variant="outline" className={`${statusMeta.color} gap-1`}>
                {statusMeta.spinning && <Loader2 className="w-3 h-3 animate-spin" />}
                {!statusMeta.spinning && build.status === "completed" && <CheckCircle2 className="w-3 h-3" />}
                {!statusMeta.spinning && build.status === "failed" && <XCircle className="w-3 h-3" />}
                {statusMeta.label}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">
              {new Date(build.created_at).toLocaleString()}
            </span>
            {build.error_message && (
              <p className="text-xs text-red-400 mt-1 truncate">{build.error_message}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {isActive && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-red-400 hover:text-red-300 hover:bg-red-400/10"
              disabled={cancelling}
              onClick={async () => {
                setCancelling(true);
                try {
                  const { data, error } = await supabase.functions.invoke("github-build", {
                    body: { action: "cancel", buildId: build.id },
                  });
                  if (error) throw error;
                  if (!data?.success) throw new Error(data?.error || "Cancel failed");
                  toast.success("Build cancelled");
                  onCancelled?.();
                } catch (err: unknown) {
                  const msg = err instanceof Error ? err.message : "Cancel failed";
                  toast.error(msg);
                } finally {
                  setCancelling(false);
                }
              }}
            >
              {cancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Square className="w-3.5 h-3.5" />}
            </Button>
          )}
          {runUrl && (
            <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => window.open(runUrl, "_blank")}>
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-8 px-2" onClick={toggleLogs}>
            <FileText className="w-3.5 h-3.5" />
          </Button>
          {build.artifact_url && build.status === "completed" && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
              ) : (
                <Download className="w-3.5 h-3.5 mr-1" />
              )}
              {downloading ? "Getting link..." : "Download"}
            </Button>
          )}
        </div>
      </div>

      {showLogs && (
        <div className="border-t border-white/5 p-3 bg-black/30">
          {loadingLogs && !logs ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <Loader2 className="w-3 h-3 animate-spin" /> Fetching build logs...
            </div>
          ) : logMessage && (!logs || logs.length === 0) ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                {logMessage}
              </div>
              {isActive && (
                <p className="text-[10px] text-muted-foreground">Auto-refreshing every 8s...</p>
              )}
            </div>
          ) : logs && logs.length > 0 ? (
            <div className="space-y-3">
              {isActive && (
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  Live · refreshing every 8s
                </div>
              )}
              {logs.map((job, i) => (
                <div key={i}>
                  <div className="flex items-center gap-2 text-xs font-medium mb-1.5">
                    {stepIcon(job.conclusion, job.status)}
                    <span>{job.name}</span>
                    {job.conclusion && (
                      <span className={`text-[10px] ${job.conclusion === "success" ? "text-green-400" : job.conclusion === "failure" ? "text-red-400" : "text-muted-foreground"}`}>
                        ({job.conclusion})
                      </span>
                    )}
                  </div>
                  <div className="ml-5 space-y-0.5">
                    {job.steps.map((step, j) => (
                      <div key={j} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        {stepIcon(step.conclusion, step.status)}
                        <span className={step.conclusion === "failure" ? "text-red-400" : ""}>{step.name}</span>
                      </div>
                    ))}
                  </div>
                  {job.failed_step_log && (
                    <div className="ml-5 mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-[10px] font-medium text-red-400">Error Output:</div>
                        {build.status === "failed" && (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-6 px-2 text-[10px] gap-1"
                            disabled={fixing}
                            onClick={async () => {
                              setFixing(true);
                              try {
                                const { data, error } = await supabase.functions.invoke("fix-and-rebuild", {
                                  body: {
                                    buildId: build.id,
                                    platform: build.platform,
                                    errorLog: job.failed_step_log,
                                    iteration: 1,
                                    maxIterations: 3,
                                  },
                                });
                                if (error) throw error;
                                if (data?.success) {
                                  toast.success(`Fixed ${data.fixes.length} file(s) & triggered rebuild!`, {
                                    description: `${data.summary} — Will auto-retry up to ${data.maxIterations} times if it fails again.`,
                                  });
                                  setAutoFixState({
                                    newBuildId: data.newBuildId,
                                    iteration: data.iteration,
                                    maxIterations: data.maxIterations,
                                  });
                                  onFixTriggered?.();
                                } else {
                                  toast.error(data?.error || "Could not auto-fix");
                                }
                              } catch (err: unknown) {
                                const msg = err instanceof Error ? err.message : "Fix failed";
                                toast.error(msg);
                              } finally {
                                setFixing(false);
                              }
                            }}
                          >
                            {fixing ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Wrench className="w-3 h-3" />
                            )}
                            {fixing ? "Fixing..." : "Fix & Rebuild"}
                          </Button>
                        )}
                        {autoFixState && (
                          <div className="flex items-center gap-1.5 text-[10px] text-blue-400">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Monitoring rebuild (iteration {autoFixState.iteration}/{autoFixState.maxIterations})...
                          </div>
                        )}
                      </div>
                      <div className="relative group">
                        <pre className="bg-black/60 border border-red-500/20 rounded-md p-3 pr-10 text-[10px] leading-relaxed text-red-300 overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap break-words font-mono">
                          {job.failed_step_log}
                        </pre>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-200 hover:bg-red-500/20"
                          onClick={() => {
                            navigator.clipboard.writeText(job.failed_step_log || "");
                            toast.success("Logs copied to clipboard");
                          }}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-2">No log data available yet.</p>
          )}
          <Button size="sm" variant="ghost" className="mt-2 h-7 text-xs" onClick={fetchLogs} disabled={loadingLogs}>
            {loadingLogs ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
            Refresh Logs
          </Button>
        </div>
      )}
    </div>
  );
}

export default function Build() {
  const [builds, setBuilds] = useState<Build[]>([]);
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState<Platform | null>(null);
  const [showManual, setShowManual] = useState<Platform | null>(null);

  useEffect(() => {
    loadBuilds();

    const channel = supabase
      .channel("builds-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "builds" }, (payload) => {
        if (payload.eventType === "INSERT") {
          setBuilds((prev) => [payload.new as Build, ...prev]);
        } else if (payload.eventType === "UPDATE") {
          setBuilds((prev) =>
            prev.map((b) => (b.id === (payload.new as Build).id ? (payload.new as Build) : b))
          );
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function loadBuilds() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("builds")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) setBuilds(data as unknown as Build[]);
    } finally {
      setLoading(false);
    }
  }

  async function triggerBuild(platform: Platform) {
    setTriggering(platform);
    try {
      const { data, error } = await supabase.functions.invoke("github-build", {
        body: { action: "trigger", platform },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to trigger build");
      toast.success(`${PLATFORM_META[platform].label} build triggered on GitHub Actions!`);
      loadBuilds();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to trigger build";
      toast.error(msg);
    } finally {
      setTriggering(null);
    }
  }

  return (
    <div className="h-full bg-background text-foreground overflow-hidden">
      <div className="max-w-3xl mx-auto h-full overflow-y-auto px-4 pt-4 pb-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Timetrade Build Center</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Capacitor builds via GitHub Actions · iOS & Android
          </p>
        </div>

        <Separator className="bg-border/30" />

        {/* Build Triggers */}
        {/* Capacitor Builds */}
        <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Github className="w-4 h-4" />
              Capacitor Builds
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(["ios", "android"] as Platform[]).map((p) => {
                const meta = PLATFORM_META[p];
                const Icon = meta.icon;
                const isTriggering = triggering === p;

                return (
                  <Button
                    key={p}
                    variant="outline"
                    className="h-auto py-4 flex-col gap-1.5"
                    onClick={() => triggerBuild(p)}
                    disabled={isTriggering}
                  >
                    {isTriggering ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Icon className={`w-5 h-5 ${meta.color}`} />
                    )}
                    <span className="text-xs font-medium">
                      {isTriggering ? "Triggering..." : `Build ${meta.label}`}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{meta.desc}</span>
                  </Button>
                );
              })}
            </div>

            <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <Info className="w-3 h-3 mt-0.5 shrink-0" />
              Wraps the React web app as native iOS/Android via Capacitor. iOS requires signing secrets in GitHub.
            </div>
          </CardContent>
        </Card>

        {/* Flutter Builds */}
        <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Github className="w-4 h-4" />
              Flutter Builds
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(["flutter_ios", "flutter_android"] as Platform[]).map((p) => {
                const meta = PLATFORM_META[p];
                const Icon = meta.icon;
                const isTriggering = triggering === p;

                return (
                  <Button
                    key={p}
                    variant="outline"
                    className="h-auto py-4 flex-col gap-1.5"
                    onClick={() => triggerBuild(p)}
                    disabled={isTriggering}
                  >
                    {isTriggering ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Icon className={`w-5 h-5 ${meta.color}`} />
                    )}
                    <span className="text-xs font-medium">
                      {isTriggering ? "Triggering..." : `Build ${meta.label}`}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{meta.desc}</span>
                  </Button>
                );
              })}
            </div>

            <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <Info className="w-3 h-3 mt-0.5 shrink-0" />
              Native Flutter app builds from <code className="text-primary">flutter_app/</code>. iOS requires signing secrets + TestFlight credentials in GitHub.
            </div>

            <div className="flex items-start gap-1.5 text-xs text-amber-400 bg-amber-400/10 rounded-md px-3 py-2 border border-amber-400/20">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>For App Store submissions, use <strong>Capacitor iOS</strong> above. The Flutter iOS pipeline does not include App Store icon compliance checks.</span>
            </div>
          </CardContent>
        </Card>

        {/* Build History */}
        <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Build History
              </div>
              <Button size="sm" variant="ghost" onClick={loadBuilds} disabled={loading}>
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Refresh"}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {builds.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No builds yet. Trigger one above!
              </p>
            ) : (
              <div className="space-y-2">
                {builds.map((b) => (
                  <BuildCard key={b.id} build={b} onFixTriggered={loadBuilds} onCancelled={loadBuilds} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Separator className="bg-border/30" />

        {/* Manual Commands */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Manual Build Commands</h2>
          <div className="space-y-3">
            {(["ios", "android", "flutter_ios", "flutter_android"] as Platform[]).map((p) => {
              const meta = PLATFORM_META[p];
              const Icon = meta.icon;
              const isOpen = showManual === p;
              return (
                <Card key={p} className="bg-card/50 border-border/50 backdrop-blur-sm">
                  <CardHeader className="cursor-pointer select-none py-3" onClick={() => setShowManual(isOpen ? null : p)}>
                    <CardTitle className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${meta.color}`} />
                        {meta.label}
                      </div>
                      {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </CardTitle>
                  </CardHeader>
                  {isOpen && (
                    <CardContent className="space-y-3 pt-0">
                      {MANUAL_STEPS[p].map((step, i) => (
                        <div key={i} className="flex gap-3">
                          <div className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] flex items-center justify-center font-bold shrink-0 mt-0.5">
                            {i + 1}
                          </div>
                          <div className="flex-1">
                            <CommandBlock step={step} />
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center pb-8">
          Repo: <code className="text-primary">wolfinslimited-collab/timetrade-wallet</code> · 
          Capacitor + Flutter · <code className="text-primary">.github/workflows/</code>
        </p>
      </div>
    </div>
  );
}
