"use client";

import { useQuietMode } from "./QuietMode";
import { EyeIcon, EyeOffIcon } from "@/components/svg/icons";

// Toggles app wide balance blur. Lives in the sidebar footer.
export function QuietModeToggle() {
  const { quiet, toggle } = useQuietMode();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={quiet}
      className="flex w-full items-center gap-3 rounded-sm px-3 py-2 text-xs uppercase tracking-[0.14em] text-text-muted transition hover:bg-surface-hover hover:text-text"
    >
      {quiet ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
      {quiet ? "Balances hidden" : "Quiet mode"}
    </button>
  );
}
