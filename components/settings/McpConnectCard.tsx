"use client";

import { useState, useTransition } from "react";
import { createMcpToken, revokeMcpToken } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useToast, useDemoGuard } from "@/components/ui/Toast";
import { Reveal } from "@/components/motion/Reveal";

export type McpTokenRow = {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
};

const dateFmt = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "short",
  day: "numeric",
});
const fmt = (iso: string) => dateFmt.format(new Date(iso));

export function McpConnectCard({
  tokens,
  connectorUrl,
  canWrite,
}: {
  tokens: McpTokenRow[];
  connectorUrl: string;
  canWrite: boolean;
}) {
  const [list, setList] = useState(tokens);
  const [name, setName] = useState("");
  // The plaintext of a token shown exactly once, right after it is minted.
  const [fresh, setFresh] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const { toast } = useToast();
  const guard = useDemoGuard(canWrite);

  function copy(text: string, label: string) {
    navigator.clipboard?.writeText(text).then(
      () => toast(`${label} copied.`, "success"),
      () => toast("Could not copy.", "error"),
    );
  }

  function create() {
    const value = name.trim();
    if (!value) return;
    start(async () => {
      const res = await createMcpToken(value);
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      setFresh(res.token);
      setName("");
      // The list row carries no plaintext; show it with a placeholder timestamp.
      setList((cur) => [
        {
          id: `temp-${Date.now()}`,
          name: value,
          createdAt: new Date().toISOString(),
          lastUsedAt: null,
        },
        ...cur,
      ]);
      toast("Token created.", "success");
    });
  }

  function revoke(id: string) {
    start(async () => {
      setList((cur) => cur.filter((t) => t.id !== id));
      const res = await revokeMcpToken(id);
      if (!res.ok) toast(res.error, "error");
    });
  }

  return (
    <Reveal delay={0.28} className="mt-4 max-w-xl">
      <Card className="px-5 py-5">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-text">Connect to Claude</p>
          <p className="text-xs text-text-muted">
            Add CXNET as a custom connector in your own Claude (Claude Desktop or
            Claude Code) to ask about your finances and record entries by chat.
            Your data stays yours; a token only works for your account.
          </p>
        </div>

        <div className="mt-5 flex flex-col gap-1">
          <p className="text-xs uppercase tracking-[0.18em] text-text-muted">
            Connector URL
          </p>
          <button
            type="button"
            onClick={() => copy(connectorUrl, "URL")}
            className="truncate rounded-sm border border-border bg-surface px-3 py-2 text-left text-xs text-text transition hover:border-border-strong"
            title="Click to copy"
          >
            {connectorUrl}
          </button>
        </div>

        {fresh ? (
          <div className="mt-4 flex flex-col gap-2 rounded-sm border border-brass/40 bg-brass/5 px-3 py-3">
            <p className="text-xs text-brass">
              Copy this token now. It is shown once and cannot be retrieved later.
            </p>
            <button
              type="button"
              onClick={() => copy(fresh, "Token")}
              className="break-all rounded-sm border border-border bg-surface px-3 py-2 text-left font-mono text-xs text-text transition hover:border-border-strong"
              title="Click to copy"
            >
              {fresh}
            </button>
            <div className="flex justify-end">
              <Button size="sm" variant="ghost" onClick={() => setFresh(null)}>
                Done
              </Button>
            </div>
          </div>
        ) : null}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            create();
          }}
          className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <Input
            id="token-name"
            label="New token name"
            placeholder="e.g. My laptop"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full"
          />
          <Button
            type="submit"
            onClick={canWrite ? undefined : guard()}
            disabled={pending || name.trim() === ""}
          >
            {pending ? "Working" : "Generate"}
          </Button>
        </form>

        {list.length > 0 ? (
          <ul className="mt-5 divide-y divide-border overflow-hidden rounded-sm border border-border">
            {list.map((t) => (
              <li
                key={t.id}
                className="group flex items-center justify-between gap-4 bg-surface px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-text">{t.name}</p>
                  <p className="truncate text-xs text-text-faint">
                    {t.lastUsedAt
                      ? `last used ${fmt(t.lastUsedAt)}`
                      : `created ${fmt(t.createdAt)}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => revoke(t.id)}
                  className="rounded-sm px-2 py-1 text-xs text-text-muted opacity-0 transition hover:bg-surface-hover hover:text-neg group-hover:opacity-100"
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <details className="mt-5">
          <summary className="cursor-pointer text-xs uppercase tracking-[0.16em] text-text-muted transition hover:text-text">
            Setup steps
          </summary>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs text-text-muted">
            <li>Generate a token above and copy it.</li>
            <li>
              In Claude (Desktop or Code), add a custom connector using the
              connector URL above.
            </li>
            <li>
              Authenticate with the header{" "}
              <span className="font-mono text-text">Authorization: Bearer &lt;token&gt;</span>.
            </li>
            <li>Ask Claude about your net worth, spending, or to log an expense.</li>
          </ol>
        </details>
      </Card>
    </Reveal>
  );
}
