"use client";

import { useFormStatus } from "react-dom";
import { motion, useReducedMotion } from "motion/react";
import { signInWithGoogle } from "@/app/login/actions";

// The four color Google G, on a small white chip so it reads correctly on the
// oxblood face, ringed in brass to match the button edge.
function GoogleGlyph() {
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-sm bg-white ring-1 ring-brass/50">
      <svg width="14" height="14" viewBox="0 0 48 48" aria-hidden>
        <path
          fill="#EA4335"
          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
        />
        <path
          fill="#4285F4"
          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
        />
        <path
          fill="#FBBC05"
          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
        />
        <path
          fill="#34A853"
          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
        />
      </svg>
    </span>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  const reduce = useReducedMotion();

  return (
    <motion.button
      type="submit"
      disabled={pending}
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: reduce ? 0 : 1.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={reduce ? undefined : { y: -1.5 }}
      whileTap={{ scale: 0.99 }}
      className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-sm border border-brass/40 bg-gradient-to-b from-red-bright/95 via-red to-red-deep px-4 py-3.5 text-sm font-medium tracking-wide text-text shadow-[inset_0_1px_0_rgba(176,141,87,0.3),0_10px_30px_-14px_rgba(123,22,32,0.9)] transition-[border-color,box-shadow] hover:border-brass/70 hover:shadow-[inset_0_1px_0_rgba(176,141,87,0.45),0_14px_40px_-12px_rgba(155,34,48,0.95)] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {/* Ambient brass gleam that drifts across, and again, brighter, on hover. */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-brass/25 to-transparent group-hover:via-brass/40"
        initial={{ x: "-160%" }}
        animate={reduce ? { x: "-160%" } : { x: ["-160%", "320%"] }}
        transition={
          reduce
            ? undefined
            : { duration: 4.5, repeat: Infinity, repeatDelay: 2.4, ease: "easeInOut" }
        }
      />
      <GoogleGlyph />
      <span className="relative">
        {pending ? "Connecting" : "Continue with Google"}
      </span>
    </motion.button>
  );
}

// Google is the only way in. The form posts to a server action that hands off to
// Google; the allowlist still gates who can finish in the database.
export function GoogleSignIn() {
  return (
    <form action={signInWithGoogle}>
      <SubmitButton />
    </form>
  );
}
