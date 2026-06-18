import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

// Square cornered surface with a warm hairline border. The structural unit of
// every screen. `raised` lifts it onto the lighter surface tone.
export function Card({
  className,
  raised = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & { raised?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-sm border border-border",
        raised ? "bg-surface-raised" : "bg-surface",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("border-b border-border px-5 py-4", className)}
      {...props}
    />
  );
}

export function CardBody({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-4", className)} {...props} />;
}
