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

// Every element inside the panel that can hold keyboard focus, in DOM order.
// Queried fresh each Tab so a panel whose contents change (a revealed field, a
// toggled section) always traps against its current focusables.
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusableWithin(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  );
}

// Centered dialog over a blurred scrim. Closes on Escape or backdrop click,
// locks body scroll while open, moves focus into the panel, traps Tab within it,
// and returns focus to whatever was focused before it opened.
export function Modal({ open, onClose, title, size = "md", children }: ModalProps) {
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const isClient = useIsClient();

  // Keep the latest onClose without making it an effect dependency. A fresh
  // closure each render would otherwise re-run the focus effect on every
  // keystroke and yank focus back to the panel, mid-typing, in every dialog.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    // The element to hand focus back to once the dialog closes.
    const restoreTo = document.activeElement as HTMLElement | null;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const focusables = focusableWithin(panel);
      // Nothing tabbable: keep focus pinned to the panel itself.
      if (focusables.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey) {
        if (active === first || !panel.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !panel.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Move focus in, but never steal it from an element that already claimed it
    // (an autoFocus input inside the panel mounts focused — leave it there).
    if (panel && !panel.contains(document.activeElement)) {
      (focusableWithin(panel)[0] ?? panel).focus();
    }

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      // Restore focus only if it is still inside the dialog, so we never wrench
      // it away from wherever the user has since moved.
      if (restoreTo && panel?.contains(document.activeElement)) {
        restoreTo.focus();
      }
    };
  }, [open]);

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
            className={`relative z-10 flex max-h-[90vh] w-full ${SIZES[size]} flex-col rounded-sm border border-border bg-surface-raised outline-none`}
            initial={reduce ? false : { y: 10, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { y: 8, opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.18 }}
          >
            {title ? (
              <div className="shrink-0 border-b border-border px-5 py-4 font-serif text-lg text-text">
                {title}
              </div>
            ) : null}
            <div className="overflow-y-auto px-5 py-4">{children}</div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
