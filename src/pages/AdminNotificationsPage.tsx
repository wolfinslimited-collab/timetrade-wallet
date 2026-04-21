import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Send, Bell, Smartphone, Monitor, Globe, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const PLATFORMS = [
  { value: "all", label: "All", icon: Globe },
  { value: "iphone", label: "iPhone", icon: Smartphone },
  { value: "android", label: "Android", icon: Smartphone },
  { value: "web", label: "Web", icon: Monitor },
] as const;

const TYPES = [
  { value: "info", label: "Info", icon: "ℹ️" },
  { value: "security", label: "Security", icon: "🔒" },
  { value: "price_alert", label: "Price Alert", icon: "📈" },
  { value: "transaction", label: "Transaction", icon: "💰" },
] as const;

export default function AdminNotificationsPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("info");
  const [icon, setIcon] = useState("");
  const [targetPlatform, setTargetPlatform] = useState("all");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number; total: number; cleaned: number } | null>(null);
  const [devices, setDevices] = useState<{ platform: string; count: number }[]>([]);

  useEffect(() => {
    supabase
      .from("fcm_tokens")
      .select("platform")
      .then(({ data }) => {
        if (!data) return;
        const counts: Record<string, number> = {};
        data.forEach((d: any) => {
          counts[d.platform] = (counts[d.platform] || 0) + 1;
        });
        setDevices(Object.entries(counts).map(([platform, count]) => ({ platform, count })));
      });
  }, [sendResult]);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error("Title and message are required");
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("fcm-push", {
        body: { title, message, type, icon: icon || null, target_platform: targetPlatform },
      });

      if (error) throw error;

      const result = data as any;
      setSendResult(result);
      toast.success(`Sent to ${result?.sent || 0} devices`);
      setTitle("");
      setMessage("");
      setIcon("");
    } catch (e) {
      toast.error("Failed to send: " + (e as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-background text-foreground">
      <div className="flex items-center gap-3 px-4 pt-12 pb-4 border-b border-border/30">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Bell className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-semibold">Send Notification</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {/* Registered Devices */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Registered Devices
          </Label>
          <div className="flex gap-2 flex-wrap">
            {devices.length === 0 ? (
              <span className="text-xs text-muted-foreground">No devices registered</span>
            ) : (
              devices.map((d) => (
                <span key={d.platform} className="px-3 py-1.5 rounded-lg bg-card/50 border border-border/30 text-xs font-medium">
                  {d.platform}: {d.count}
                </span>
              ))
            )}
          </div>
        </div>

        {/* Send Result */}
        {sendResult && (
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-sm space-y-1">
            <p className="font-medium text-primary">Last send result</p>
            <p className="text-xs text-muted-foreground">
              Sent: {sendResult.sent} | Failed: {sendResult.failed} | Total: {sendResult.total}
              {sendResult.cleaned > 0 && ` | Cleaned: ${sendResult.cleaned} invalid tokens`}
            </p>
          </div>
        )}

        {/* Platform */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Target Platform</Label>
          <div className="grid grid-cols-4 gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p.value}
                onClick={() => setTargetPlatform(p.value)}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-colors",
                  targetPlatform === p.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/30 bg-card/50 text-muted-foreground"
                )}
              >
                <p.icon className="w-5 h-5" />
                <span className="text-xs font-medium">{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Type */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Type</Label>
          <div className="grid grid-cols-4 gap-2">
            {TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setType(t.value)}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-colors",
                  type === t.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/30 bg-card/50 text-muted-foreground"
                )}
              >
                <span className="text-lg">{t.icon}</span>
                <span className="text-xs font-medium">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Notification title..."
            className="bg-card/50 border-border/30"
          />
        </div>

        {/* Message */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Message</Label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Notification message..."
            rows={3}
            className="bg-card/50 border-border/30"
          />
        </div>

        {/* Icon */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Icon (emoji, optional)</Label>
          <Input
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            placeholder="e.g. 🔔 📢 🚀"
            className="bg-card/50 border-border/30"
          />
        </div>
      </div>

      <div className="p-4 border-t border-border/30">
        {(!title.trim() || !message.trim()) && (
          <p className="text-xs text-warning mb-2 text-center">
            {!title.trim() && !message.trim()
              ? "Please fill in title and message"
              : !title.trim()
              ? "Please fill in the title"
              : "Please fill in the message"}
          </p>
        )}
        <Button
          onClick={handleSend}
          disabled={sending || !title.trim() || !message.trim()}
          className="w-full h-12 text-base font-semibold gap-2"
        >
          <Send className="w-4 h-4" />
          {sending ? "Sending..." : "Send Notification"}
        </Button>
      </div>
    </div>
  );
}