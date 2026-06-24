import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

// Square cornered surface with a warm hairline border. The structural unit of
// every screen. `raised` lifts it onto the lighter surface tone. `interactive`
// adds the shared hover language for clickable cards: a small lift, a brighter
// hairline, and a soft drop shadow, so every tappable surface reacts the same.
export function Card({
  className,
  raised = false,
  interactive = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  raised?: boolean;
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-sm border border-border",
        raised ? "bg-surface-raised" : "bg-surface",
        interactive &&
          "transition duration-200 will-change-transform hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[0_14px_34px_-20px_rgba(0,0,0,0.85)]",
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
