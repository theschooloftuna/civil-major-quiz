import { cva, type VariantProps } from "class-variance-authority";

import {
  Alert as AlertPrimitive,
  AlertTitle,
  AlertDescription,
  AlertAction,
} from "@/components/ui/alert";
import { cn } from "@/lib/utils";

/**
 * This project's actual Alert/callout — the acid-green banner style from
 * phosphoricons.com's notice boxes. Built on top of src/components/ui/alert.tsx
 * (reused as-is for AlertTitle/AlertDescription/AlertAction) rather than
 * editing that file.
 */
const alertVariants = cva("border shadow-hard-sm", {
  variants: {
    variant: {
      notice: "border-moss bg-acid text-moss [&_[data-slot=alert-description]]:text-moss/80",
      success: "border-moss bg-acid text-moss [&_[data-slot=alert-description]]:text-moss/80",
      destructive:
        "border-moss bg-destructive/10 text-destructive [&_[data-slot=alert-description]]:text-destructive/80",
    },
  },
  defaultVariants: {
    variant: "notice",
  },
});

function Alert({
  className,
  variant,
  ...props
}: Omit<React.ComponentProps<typeof AlertPrimitive>, "variant"> & VariantProps<typeof alertVariants>) {
  return <AlertPrimitive className={cn(alertVariants({ variant }), className)} {...props} />;
}

export { Alert, AlertTitle, AlertDescription, AlertAction };
