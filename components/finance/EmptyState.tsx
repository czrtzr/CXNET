import type { ReactNode } from "react";
import { Crest } from "@/components/svg/Crest";

// Designed empty state for a section with no rows yet. Quiet crest, a spare
// line, and an optional action. No exclamation, no chatter.
export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mt-16 flex flex-col items-center text-center">
      <Crest size={40} className="text-leather" />
      <p className="mt-6 font-serif text-2xl text-text">{title}</p>
      {hint ? (
        <p className="mt-2 max-w-xs text-sm text-text-muted">{hint}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
