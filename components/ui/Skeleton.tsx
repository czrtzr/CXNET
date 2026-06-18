import { cn } from "@/lib/utils/cn";

// Loading placeholder. A soft engraved shimmer sweeps across, never a spinner.
// The shimmer is paused under reduced motion by the global rule, leaving a
// quiet static block.
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative overflow-hidden rounded-sm bg-surface-raised",
        className,
      )}
    >
      <div
        className="absolute inset-0 -translate-x-full"
        style={{
          animation: "cxnet-shimmer 1.8s ease-in-out infinite",
          background:
            "linear-gradient(90deg, transparent, rgba(241,236,228,0.06), transparent)",
        }}
      />
    </div>
  );
}
