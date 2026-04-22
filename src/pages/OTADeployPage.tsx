import { useState } from "react";
import { ArrowLeft, Upload, Loader2, CheckCircle2, XCircle, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type DeployStatus = "idle" | "deploying" | "completed" | "failed";

export default function OTADeployPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<DeployStatus>("idle");
  const [buildId, setBuildId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const triggerDeploy = async () => {
    setStatus("deploying");
    setError(null);
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke("github-build", {
        body: { action: "trigger", platform: "capgo" },
      });
      if (invokeErr) throw invokeErr;
      if (!data?.success) throw new Error(data?.error || "Deploy trigger failed");
      setBuildId(data.build?.id || null);
      setStatus("completed");
      toast.success("OTA deploy triggered successfully");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Deploy failed";
      setError(msg);
      setStatus("failed");
      toast.error(msg);
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background">
      <div className="sticky top-0 z-30 flex items-center gap-3 px-4 pt-[max(env(safe-area-inset-top),12px)] pb-3 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-xl"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">OTA Update (Capgo)</h1>
      </div>

      <div className="flex-1 px-4 py-6 space-y-6">
        <Card className="bg-card/50 border-border/40">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                <Rocket className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Deploy OTA Bundle</p>
                <p className="text-xs text-muted-foreground">
                  Push a live update to all users without App Store review
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-muted/30 p-3 space-y-2">
              <p className="text-xs text-muted-foreground">How it works:</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>Builds the latest web bundle from your repo</li>
                <li>Uploads it to Capgo's production channel</li>
                <li>Users receive the update on next app launch</li>
              </ul>
            </div>

            {status === "failed" && error && (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3">
                <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-destructive">{error}</p>
              </div>
            )}

            {status === "completed" && (
              <div className="flex items-start gap-2 rounded-lg bg-green-500/10 p-3">
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-green-500 font-medium">Deploy triggered!</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Check the Build Center for progress.
                    {buildId && (
                      <> Build ID: <span className="font-mono">{buildId.slice(0, 8)}</span></>
                    )}
                  </p>
                </div>
              </div>
            )}

            <Button
              className="w-full h-12 rounded-xl font-semibold gap-2"
              disabled={status === "deploying"}
              onClick={triggerDeploy}
            >
              {status === "deploying" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deploying...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Deploy OTA Update
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/40">
          <CardContent className="p-5 space-y-3">
            <p className="text-sm font-medium">Requirements</p>
            <div className="space-y-2">
              {[
                { label: "Capgo app created", desc: "com.wallet.ai on capgo.app" },
                { label: "CAPGO_API_KEY secret", desc: "Added to GitHub repo secrets" },
                { label: "Capacitor Updater plugin", desc: "Installed and configured" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2.5">
                  <Badge variant="outline" className="text-green-400 border-green-400/30 text-[10px] px-1.5">
                    <CheckCircle2 className="w-3 h-3 mr-0.5" /> Done
                  </Badge>
                  <div>
                    <p className="text-xs font-medium">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}