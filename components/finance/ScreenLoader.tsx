"use client";

import { motion, useReducedMotion } from "motion/react";
import { Crest } from "@/components/svg/Crest";

// The inter-screen loading state. Rather than a grey skeleton, the crest holds
// at the center and rings diverge outward from it, the mark settling into the
// page while the server fetches. Mirrors each screen's eyebrow label so the
// layout does not jump when the real content arrives. Still at reduced motion.
export function ScreenLoader({ label }: { label: string }) {
  const reduce = useReducedMotion();

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.22em] text-text-faint">{label}</p>

      <div className="flex min-h-[58vh] flex-col items-center justify-center gap-6">
        <div className="relative flex h-28 w-28 items-center justify-center">
          <svg
            viewBox="0 0 112 112"
            className="absolute inset-0 h-full w-full text-brass"
            fill="none"
            aria-hidden
          >
            {[0, 1, 2].map((i) => (
              <motion.circle
                key={i}
                cx="56"
                cy="56"
                r="26"
                stroke="currentColor"
                strokeWidth="0.75"
                style={{ transformOrigin: "center" }}
                initial={reduce ? false : { scale: 0.5, opacity: 0 }}
                animate={
                  reduce
                    ? { scale: 1, opacity: 0.18 }
                    : { scale: [0.5, 1.7], opacity: [0.45, 0] }
                }
                transition={
                  reduce
                    ? { duration: 0 }
                    : {
                        duration: 2.4,
                        delay: i * 0.8,
                        repeat: Infinity,
                        ease: "easeOut",
                      }
                }
              />
            ))}
          </svg>

          <motion.div
            className="relative text-brass"
            initial={reduce ? false : { opacity: 0, scale: 0.92 }}
            animate={
              reduce ? { opacity: 1 } : { opacity: [0.55, 1, 0.55], scale: 1 }
            }
            transition={
              reduce
                ? { duration: 0 }
                : { duration: 2.2, repeat: Infinity, ease: "easeInOut" }
            }
          >
            <Crest size={40} />
          </motion.div>
        </div>

        <p className="text-xs uppercase tracking-[0.2em] text-text-faint">
          Assembling
        </p>
      </div>
    </div>
  );
}
