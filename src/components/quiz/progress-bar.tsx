import { cn } from "@/lib/utils";

interface ProgressBarProps {
  /** 0-1 */
  progress: number;
  className?: string;
}

function ProgressBar({ progress, className }: ProgressBarProps) {
  const clamped = Math.min(1, Math.max(0, progress));

  return (
    <div
      data-slot="quiz-progress-bar"
      role="progressbar"
      aria-valuenow={Math.round(clamped * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("fixed inset-x-0 bottom-0 z-50 h-1.5 bg-muted", className)}
    >
      <div
        className="h-full bg-primary transition-[width] duration-300 ease-out"
        style={{ width: `${clamped * 100}%` }}
      />
    </div>
  );
}

export { ProgressBar };
