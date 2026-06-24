"use client";

import { useFormStatus } from "react-dom";
import { motion, useReducedMotion } from "motion/react";
import { signInAsGuest } from "@/app/login/actions";

// A quiet way in for the curious: a text link, not a button, so it never
// competes with the real sign-in. It opens the shared read-only demo account.
function DemoLink() {
  const { pending } = useFormStatus();
  const reduce = useReducedMotion();

  return (
    <motion.button
      type="submit"
      disabled={pending}
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, delay: reduce ? 0 : 1.7 }}
      className="mx-auto block text-xs uppercase tracking-[0.18em] text-text-faint underline decoration-border-strong underline-offset-4 transition hover:text-text-muted hover:decoration-brass disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Opening demo" : "Explore the demo"}
    </motion.button>
  );
}

export function DemoSignIn() {
  return (
    <form action={signInAsGuest} className="mt-5">
      <DemoLink />
    </form>
  );
}
