import { useEffect, useState } from "react";
import { Download, Share, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  // @ts-expect-error iOS Safari
  window.navigator.standalone === true;

const detectPlatform = () => {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
};

export const InstallAppButton = () => {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const installedHandler = () => {
      setInstalled(true);
      setOpen(false);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  if (installed) return null;

  const platform = detectPlatform();

  const handleClick = async () => {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setDeferred(null);
    } else {
      setOpen(true);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        className="font-mono text-xs uppercase tracking-wider border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
      >
        <Download className="h-3.5 w-3.5" />
        Install App
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono uppercase tracking-wider text-accent">
              Install PrepPi
            </DialogTitle>
            <DialogDescription className="text-dim">
              Add PrepPi to your home screen for one-tap access — works offline-style, full screen, no browser bars.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {platform === "ios" && (
              <div className="space-y-3">
                <div className="font-mono text-xs uppercase tracking-wider text-primary">
                  iPhone / iPad (Safari)
                </div>
                <ol className="space-y-2 text-sm text-foreground">
                  <li className="flex gap-2">
                    <span className="font-mono text-dim">1.</span>
                    <span>
                      Tap the <Share className="inline h-4 w-4 mx-1 -mt-0.5" /> Share button at the bottom of Safari
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-mono text-dim">2.</span>
                    <span>
                      Scroll down and tap <strong>Add to Home Screen</strong>{" "}
                      <Plus className="inline h-4 w-4 mx-1 -mt-0.5" />
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-mono text-dim">3.</span>
                    <span>Tap <strong>Add</strong> in the top right</span>
                  </li>
                </ol>
              </div>
            )}

            {platform === "android" && (
              <div className="space-y-3">
                <div className="font-mono text-xs uppercase tracking-wider text-primary">
                  Android (Chrome)
                </div>
                <ol className="space-y-2 text-sm text-foreground">
                  <li className="flex gap-2">
                    <span className="font-mono text-dim">1.</span>
                    <span>Tap the <strong>⋮</strong> menu in the top right of Chrome</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-mono text-dim">2.</span>
                    <span>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong></span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-mono text-dim">3.</span>
                    <span>Tap <strong>Install</strong> to confirm</span>
                  </li>
                </ol>
              </div>
            )}

            {platform === "desktop" && (
              <div className="space-y-3">
                <div className="font-mono text-xs uppercase tracking-wider text-primary">
                  Desktop
                </div>
                <p className="text-sm text-foreground">
                  Open this page on your iPhone or Android phone, then tap the <strong>Install App</strong> button to add PrepPi to your home screen.
                </p>
                <p className="text-xs text-dim">
                  In Chrome/Edge desktop, you can also click the install icon in the address bar.
                </p>
              </div>
            )}

            <div className="rounded-md border border-border bg-secondary/30 p-3 text-xs text-dim font-mono">
              Tip: install only works on the published site, not inside the editor preview.
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
