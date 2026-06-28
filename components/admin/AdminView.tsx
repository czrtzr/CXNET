"use client";

import { useOptimistic, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { UserRole } from "@/types";
import {
  inviteEmail,
  revokeInvite,
  setMemberActive,
} from "@/app/(app)/admin/actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { PageTransition } from "@/components/layout/PageTransition";
import { Reveal } from "@/components/motion/Reveal";
import { PulseLine } from "@/components/svg/PulseLine";
import { DrawUnderline } from "@/components/svg/DrawUnderline";

// One person on the access list: an invited email, annotated with the joined
// account's status when one exists. No financial data is ever carried here.
export type InviteRow = {
  id: string;
  email: string;
  invitedAt: string;
  userId: string | null;
  role: UserRole | null;
  isActive: boolean | null;
  displayName: string | null;
  lastActiveAt: string | null;
};

type Optimistic =
  | { type: "add"; row: InviteRow }
  | { type: "remove"; id: string }
  | { type: "active"; userId: string; active: boolean };

function reduce(state: InviteRow[], action: Optimistic): InviteRow[] {
  if (action.type === "add") return [action.row, ...state];
  if (action.type === "remove") return state.filter((r) => r.id !== action.id);
  return state.map((r) =>
    r.userId === action.userId ? { ...r, isActive: action.active } : r,
  );
}

const dateFmt = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

function formatDate(iso: string): string {
  return dateFmt.format(new Date(iso));
}

function statusOf(row: InviteRow): {
  label: string;
  tone: "neutral" | "pos" | "neg" | "manual";
} {
  if (row.role === "super_admin") return { label: "Owner", tone: "manual" };
  if (row.userId == null) return { label: "Invited", tone: "neutral" };
  if (row.isActive === false) return { label: "Suspended", tone: "neg" };
  return { label: "Member", tone: "pos" };
}

export function AdminView({ invites }: { invites: InviteRow[] }) {
  const [optimistic, apply] = useOptimistic(invites, reduce);
  const [pending, start] = useTransition();
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const memberCount = optimistic.filter((r) => r.userId != null).length;
  const pendingCount = optimistic.length - memberCount;

  function invite() {
    const value = email.trim();
    if (!value) return;
    start(async () => {
      apply({
        type: "add",
        row: {
          id: `temp-${Date.now()}`,
          email: value.toLowerCase(),
          invitedAt: new Date().toISOString(),
          userId: null,
          role: null,
          isActive: null,
          displayName: null,
          lastActiveAt: null,
        },
      });
      const res = await inviteEmail(value);
      if (res.ok) {
        setEmail("");
        toast("Invitation added.", "success");
      } else {
        toast(res.error, "error");
      }
    });
  }

  function revoke(row: InviteRow) {
    start(async () => {
      apply({ type: "remove", id: row.id });
      const res = await revokeInvite(row.id);
      if (!res.ok) toast(res.error, "error");
    });
  }

  function toggleActive(row: InviteRow) {
    if (!row.userId) return;
    const next = !row.isActive;
    start(async () => {
      apply({ type: "active", userId: row.userId!, active: next });
      const res = await setMemberActive(row.userId!, next);
      if (res.ok) {
        toast(next ? "Access restored." : "Access suspended.", "success");
      } else {
        toast(res.error, "error");
      }
    });
  }

  return (
    <PageTransition>
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-text-faint">
            Admin
          </p>
          <p className="mt-3 font-serif text-4xl tracking-tight text-text">
            Access control
          </p>
          <DrawUnderline width={190} className="mt-1 text-brass" />
          <p className="mt-2 text-xs text-text-muted">
            {memberCount} {memberCount === 1 ? "member" : "members"}
            {pendingCount > 0 ? ` · ${pendingCount} invited` : ""}
          </p>
        </div>
        <PulseLine
          width={150}
          height={34}
          className="mt-2 hidden text-leather-light/70 sm:block"
        />
      </div>

      <Reveal delay={0.08} className="mt-8 max-w-xl">
        <Card className="px-5 py-5">
          <div className="flex flex-col gap-1">
            <p className="text-sm text-text">Invite a person</p>
            <p className="text-xs text-text-muted">
              Add an email to the allowlist. Only allowlisted emails can create an
              account, and each email may hold exactly one. Everyone else is turned
              away at sign-in.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              invite();
            }}
            className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <Input
              id="invite-email"
              label="Email address"
              type="email"
              autoComplete="off"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full"
            />
            <Button type="submit" disabled={pending || email.trim() === ""}>
              {pending ? "Working" : "Invite"}
            </Button>
          </form>
        </Card>
      </Reveal>

      <Reveal delay={0.16} className="mt-4 max-w-xl">
        <Card className="px-5 py-5">
          <div className="flex flex-col gap-1">
            <p className="text-sm text-text">People</p>
            <p className="text-xs text-text-muted">
              Everyone with access or a standing invitation. Suspend a member to
              cut off their sign-in without deleting anything.
            </p>
          </div>

          {optimistic.length === 0 ? (
            <p className="mt-5 text-xs text-text-faint">No one invited yet.</p>
          ) : (
            <ul className="mt-5 divide-y divide-border overflow-hidden rounded-sm border border-border">
              <AnimatePresence initial={false}>
                {optimistic.map((row) => {
                  const status = statusOf(row);
                  const isTemp = row.id.startsWith("temp-");
                  const isOwner = row.role === "super_admin";
                  const joined = row.userId != null;
                  return (
                    <motion.li
                      key={row.id}
                      layout
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      className="group flex items-center justify-between gap-4 bg-surface px-4 py-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm text-text">
                            {row.displayName || row.email}
                          </p>
                          <Badge tone={status.tone}>{status.label}</Badge>
                        </div>
                        <p className="truncate text-xs text-text-faint">
                          {row.displayName ? `${row.email} · ` : ""}
                          {joined && row.lastActiveAt
                            ? `last active ${formatDate(row.lastActiveAt)}`
                            : `invited ${formatDate(row.invitedAt)}`}
                        </p>
                      </div>

                      {!isTemp && !isOwner ? (
                        <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                          {joined ? (
                            <button
                              type="button"
                              onClick={() => toggleActive(row)}
                              className="rounded-sm px-2 py-1 text-xs text-text-muted transition hover:bg-surface-hover hover:text-text"
                            >
                              {row.isActive === false ? "Restore" : "Suspend"}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => revoke(row)}
                            className="rounded-sm px-2 py-1 text-xs text-text-muted transition hover:bg-surface-hover hover:text-neg"
                          >
                            Remove
                          </button>
                        </div>
                      ) : null}
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          )}
        </Card>
      </Reveal>
    </PageTransition>
  );
}
