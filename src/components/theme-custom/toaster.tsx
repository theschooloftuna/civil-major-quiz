"use client";

import { Toaster as SonnerToaster } from "@/components/ui/sonner";

/**
 * This project's actual toast styling — success toasts match theme-custom/
 * alert.tsx's acid-green "notice" look. Built on top of
 * src/components/ui/sonner.tsx rather than editing that file.
 */
function Toaster(props: React.ComponentProps<typeof SonnerToaster>) {
  return (
    <SonnerToaster
      toastOptions={{
        classNames: {
          toast: "rounded-lg border border-moss shadow-hard-sm",
          success: "bg-acid text-moss border-moss",
          error: "bg-destructive/10 text-destructive border-moss",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
