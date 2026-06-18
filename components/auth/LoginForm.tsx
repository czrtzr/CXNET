"use client";

import { useActionState, useState } from "react";
import { signIn, signUp, type AuthState } from "@/app/login/actions";

const INITIAL: AuthState = { error: null };

export function LoginForm() {
  // Two modes share one screen: sign in for returning accounts, register for an
  // allowlisted email setting its password for the first time.
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const action = mode === "signin" ? signIn : signUp;
  const [state, formAction, pending] = useActionState(action, INITIAL);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label
          htmlFor="email"
          className="text-xs uppercase tracking-[0.18em] text-text-muted"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="rounded-sm border border-border bg-surface px-3.5 py-2.5 text-text outline-none transition focus:border-red-bright"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="password"
          className="text-xs uppercase tracking-[0.18em] text-text-muted"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          required
          className="rounded-sm border border-border bg-surface px-3.5 py-2.5 text-text outline-none transition focus:border-red-bright"
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-neg">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-sm bg-red px-4 py-2.5 text-sm font-medium tracking-wide text-text transition hover:bg-red-bright disabled:opacity-60"
      >
        {pending
          ? "One moment"
          : mode === "signin"
            ? "Enter"
            : "Set password and enter"}
      </button>

      <button
        type="button"
        onClick={() => setMode(mode === "signin" ? "register" : "signin")}
        className="text-xs text-text-muted transition hover:text-text"
      >
        {mode === "signin"
          ? "First time here? Set your password"
          : "Already have an account? Sign in"}
      </button>
    </form>
  );
}
