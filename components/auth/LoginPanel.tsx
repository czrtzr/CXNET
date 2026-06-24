"use client";

import { motion, useReducedMotion } from "motion/react";
import { CrestReveal } from "./CrestReveal";
import { GoogleSignIn } from "./GoogleSignIn";
import { DemoSignIn } from "./DemoSignIn";
import { Guilloche } from "@/components/svg/Guilloche";

// The login lockup, orchestrated: an oxblood bloom breathes behind a faintly
// turning engraved ring; the crest etches itself in; the wordmark rises from
// behind a mask; the subtitle's letters spread open; the card lifts in last.
// Every step collapses to its final state under reduced motion.
export function LoginPanel({ error }: { error: string | null }) {
  const reduce = useReducedMotion();

  return (
    <div className="relative z-10 w-full max-w-sm">
      {/* Ambient oxblood bloom. */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-4 h-[360px] w-[360px] -translate-x-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(123,22,32,0.20), transparent 70%)",
        }}
        initial={{ opacity: 0 }}
        animate={
          reduce
            ? { opacity: 0.5 }
            : { opacity: [0.3, 0.55, 0.3], scale: [1, 1.05, 1] }
        }
        transition={
          reduce
            ? { duration: 0.01 }
            : { duration: 7, repeat: Infinity, ease: "easeInOut" }
        }
      />

      <div className="mb-8 flex flex-col items-center text-center">
        <div className="relative flex items-center justify-center">
          {/* Faint engraved ring behind the crest. */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute text-brass"
            initial={reduce ? false : { opacity: 0, scale: 0.85, rotate: -8 }}
            animate={{ opacity: 0.45, scale: 1, rotate: 0 }}
            transition={{ duration: 1.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <Guilloche size={196} opacity={0.1} rings={5} drift />
          </motion.div>
          <div className="relative">
            <CrestReveal size={54} />
          </div>
        </div>

        {/* Wordmark rises from behind a mask. */}
        <div className="mt-5 overflow-hidden">
          <motion.p
            className="font-serif text-3xl tracking-tight text-text"
            initial={reduce ? false : { y: "115%" }}
            animate={{ y: 0 }}
            transition={{ duration: 0.7, delay: 1.0, ease: [0.22, 1, 0.36, 1] }}
          >
            CXNET
          </motion.p>
        </div>
        <motion.p
          className="mt-2 text-xs uppercase text-text-faint"
          initial={reduce ? false : { opacity: 0, letterSpacing: "0.5em" }}
          animate={{ opacity: 1, letterSpacing: "0.22em" }}
          transition={{ duration: 0.9, delay: 1.2, ease: [0.22, 1, 0.36, 1] }}
        >
          Private wealth
        </motion.p>
      </div>

      <motion.div
        className="rounded-sm border border-border bg-surface-raised/80 p-7 backdrop-blur"
        initial={reduce ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <GoogleSignIn />
        {error ? (
          <p role="alert" className="mt-4 text-center text-sm text-neg">
            {error}
          </p>
        ) : null}
        <DemoSignIn />
      </motion.div>
    </div>
  );
}
