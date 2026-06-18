"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils/cn";

type ToastTone = "default" | "success" | "error";
type ToastItem = { id: number; message: string; tone: ToastTone };

const DURATION_MS = 4000;

const ToastContext = createContext<{
  toast: (message: string, tone?: ToastTone) => void;
} | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider.");
  }
  return ctx;
}

// Toasts slide up from the bottom right and auto dismiss with a progress bar.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, tone: ToastTone = "default") => {
      const id = Date.now() + Math.random();
      setToasts((list) => [...list, { id, message, tone }]);
      window.setTimeout(() => remove(id), DURATION_MS);
    },
    [remove],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[120] flex w-[min(92vw,22rem)] flex-col gap-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <Toast key={t.id} toast={t} onClose={() => remove(t.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

const TONE_BAR: Record<ToastTone, string> = {
  default: "bg-text-muted",
  success: "bg-pos",
  error: "bg-neg",
};

function Toast({
  toast,
  onClose,
}: {
  toast: ToastItem;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      layout
      role="status"
      className="pointer-events-auto overflow-hidden rounded-sm border border-border bg-surface-raised"
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
      transition={{ duration: reduce ? 0 : 0.2 }}
    >
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <p className="text-sm text-text">{toast.message}</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss"
          className="text-text-faint transition hover:text-text"
        >
          &times;
        </button>
      </div>
      {/* Progress bar counts the dismissal down. */}
      <motion.div
        className={cn("h-0.5", TONE_BAR[toast.tone])}
        initial={{ width: "100%" }}
        animate={{ width: reduce ? "100%" : "0%" }}
        transition={{ duration: reduce ? 0 : DURATION_MS / 1000, ease: "linear" }}
      />
    </motion.div>
  );
}
