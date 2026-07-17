import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * This project's actual Button — large, moss-bordered, moss-shadowed,
 * matching phosphoricons.com's real production CSS (`button.main-button`),
 * not an approximation of it. Built on the same @base-ui/react/button
 * primitive as src/components/ui/button.tsx, but lives here instead of
 * editing that file directly — src/components/ui/* stays untouched
 * shadcn output, always.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border font-semibold whitespace-nowrap shadow-hard transition-all outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-moss bg-white text-moss hover:bg-foam",
        primary: "border-moss bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "border-moss bg-secondary text-secondary-foreground hover:bg-lichen/80",
        ghost: "border-transparent text-foreground shadow-none hover:bg-muted active:shadow-none",
        destructive: "border-moss bg-destructive/10 text-destructive hover:bg-destructive/20",
        link: "border-transparent text-green underline-offset-4 shadow-none hover:underline active:translate-x-0 active:translate-y-0",
      },
      size: {
        sm: "h-10 pl-5 pr-5 text-sm shadow-hard-sm active:translate-x-px active:translate-y-px [&_svg]:size-4",
        default: "h-14 pl-7 pr-8 text-base [&_svg]:size-6",
        lg: "h-14 pl-7 pr-8 text-base [&_svg]:size-6",
        icon: "size-12 [&_svg]:size-5",
        "icon-sm": "size-10 shadow-hard-sm active:translate-x-px active:translate-y-px [&_svg]:size-4",
        "icon-lg": "size-14 [&_svg]:size-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
