import { cn } from "@/lib/utils";

/**
 * Small hand-drawn-style line-art decorations, in our own style (not the
 * reference site's paperclips) — civil-engineering-themed pieces to break
 * up empty space on the landing/results screens. Stroke-only, inherits
 * color via `currentColor` so a `text-*` className controls the tint.
 */

function CompassDoodle({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 80 90"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-16 w-16", className)}
      {...props}
    >
      <circle cx={40} cy={12} r={6} />
      <path d="M40 18 L14 84" />
      <path d="M40 18 L66 78" />
      <path d="M22 62 L58 62" />
      <circle cx={14} cy={86} r={2.5} fill="currentColor" stroke="none" />
      <circle cx={66} cy={80} r={2.5} fill="currentColor" stroke="none" />
    </svg>
  );
}

function TSquareDoodle({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 90 70"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-14 w-16", className)}
      {...props}
    >
      <path d="M4 8 H86" />
      <path d="M4 8 V22" />
      <path d="M4 22 H60" />
      <path d="M18 8 V16" />
      <path d="M32 8 V16" />
      <path d="M46 8 V16" />
      <path d="M60 8 V16" />
      <path d="M74 8 V16" />
      <path d="M60 22 V58" />
    </svg>
  );
}

function TrussDoodle({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 140 40"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-8 w-32", className)}
      {...props}
    >
      <path d="M4 36 H136" />
      <path d="M4 36 L24 4 L44 36 L64 4 L84 36 L104 4 L124 36 L136 36" />
    </svg>
  );
}

export { CompassDoodle, TSquareDoodle, TrussDoodle };
