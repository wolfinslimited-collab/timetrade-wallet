import { useAppUpdate } from "@/hooks/useAppUpdate";
import { Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function AppUpdateBanner() {
  const { showUpdate, updateConfig, dismiss, openStore } = useAppUpdate();

  return (
    <Dialog open={showUpdate} onOpenChange={(open) => { if (!open) dismiss(); }}>
      <DialogContent className="sm:max-w-[340px] rounded-2xl gap-6 [&>button]:hidden">
        <DialogHeader className="items-center text-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Download className="w-7 h-7 text-primary" />
          </div>
          <DialogTitle className="text-xl">Update Available</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            {updateConfig?.update_message}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2.5">
          <Button onClick={openStore} className="w-full rounded-xl h-12 font-semibold">
            Update Now
          </Button>
          <Button variant="ghost" onClick={dismiss} className="w-full rounded-xl h-10 text-muted-foreground">
            Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
