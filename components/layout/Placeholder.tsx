import { PageTransition } from "./PageTransition";
import { Crest } from "@/components/svg/Crest";

// Quiet styled stand in for a section that a later phase fills with real
// screens. Keeps the shell fully navigable at the Phase 2 checkpoint.
export function Placeholder({ section }: { section: string }) {
  return (
    <PageTransition>
      <p className="text-xs uppercase tracking-[0.22em] text-text-faint">
        {section}
      </p>
      <div className="mt-24 flex flex-col items-center text-center">
        <Crest size={44} className="text-leather" />
        <p className="mt-6 font-serif text-2xl text-text">In preparation</p>
        <p className="mt-2 max-w-xs text-sm text-text-muted">
          This section opens in a coming phase of the build.
        </p>
      </div>
    </PageTransition>
  );
}
