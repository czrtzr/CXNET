"use client";

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

// Returns false during SSR and the first server render, true once on the
// client. Avoids portaling into a document that does not exist yet, without a
// setState-in-effect.
const noopSubscribe = () => () => {};
function useIsClient() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  size?: "md" | "lg" | "xl";
  children: ReactNode;
};

const SIZES: Record<NonNullable<ModalProps["size"]>, string> = {
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-3xl",
};

// Centered dialog over a blurred scrim. Closes on Escape or backdrop click,
// locks body scroll while open, and moves focus into the panel. A fuller focus
// trap is part of the Phase 7 accessibility pass.
export function Modal({ open, onClose, title, size = "md", children }: ModalProps) {
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const isClient = useIsClient();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!isClient) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.16 }}
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            className={`relative z-10 w-full ${SIZES[size]} rounded-sm border border-border bg-surface-raised outline-none`}
            initial={reduce ? false : { y: 10, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { y: 8, opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.18 }}
          >
            {title ? (
              <div className="border-b border-border px-5 py-4 font-serif text-lg text-text">
                {title}
              </div>
            ) : null}
            <div className="px-5 py-4">{children}</div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
