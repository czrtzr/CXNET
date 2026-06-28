"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { AccountRef } from "@/types";
import { CURRENCIES, CURRENCY_OPTIONS } from "@/lib/finance/currencies";
import {
  updateBaseCurrency,
  updateDefaultAccounts,
  exportData,
} from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { useToast, useDemoGuard } from "@/components/ui/Toast";
import { PageTransition } from "@/components/layout/PageTransition";
import { Reveal } from "@/components/motion/Reveal";
import { PulseLine } from "@/components/svg/PulseLine";
import { DrawUnderline } from "@/components/svg/DrawUnderline";
import { McpConnectCard, type McpTokenRow } from "./McpConnectCard";

type Props = {
  base: string;
  displayName: string;
  accounts: AccountRef[];
  defaultIncomeAccountId: string | null;
  defaultExpenseAccountId: string | null;
  canWrite: boolean;
  mcpTokens: McpTokenRow[];
  connectorUrl: string;
};

function currencyName(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.name ?? code;
}

export function SettingsView({
  base,
  displayName,
  accounts,
  defaultIncomeAccountId,
  defaultExpenseAccountId,
  canWrite,
  mcpTokens,
  connectorUrl,
}: Props) {
  const [choice, setChoice] = useState(base);
  const [saved, setSaved] = useState(base);
  const [pending, start] = useTransition();
  const { toast } = useToast();
  const guard = useDemoGuard(canWrite);

  const dirty = choice !== saved;

  function save() {
    const next = choice;
    start(async () => {
      const res = await updateBaseCurrency(next);
      if (res.ok) {
        setSaved(next);
        toast("Base currency updated.", "success");
      } else {
        toast(res.error, "error");
      }
    });
  }

  // Per-kind default accounts. Each new income and expense pre-fills these.
  const [incomeAccount, setIncomeAccount] = useState(defaultIncomeAccountId ?? "");
  const [expenseAccount, setExpenseAccount] = useState(
    defaultExpenseAccountId ?? "",
  );
  const [savedAccounts, setSavedAccounts] = useState({
    income: defaultIncomeAccountId ?? "",
    expense: defaultExpenseAccountId ?? "",
  });
  const [accountsPending, startAccounts] = useTransition();

  const accountsDirty =
    incomeAccount !== savedAccounts.income ||
    expenseAccount !== savedAccounts.expense;

  const accountOptions = [
    { value: "", label: "No default" },
    ...accounts.map((a) => ({
      value: a.id,
      label: a.account_name,
      hint: a.currency,
    })),
  ];

  function saveAccounts() {
    const income = incomeAccount;
    const expense = expenseAccount;
    startAccounts(async () => {
      const res = await updateDefaultAccounts(income || null, expense || null);
      if (res.ok) {
        setSavedAccounts({ income, expense });
        toast("Default accounts updated.", "success");
      } else {
        toast(res.error, "error");
      }
    });
  }

  // Pull every owned row and hand the user a JSON file. The browser never holds
  // the data until they ask; the action gathers it fresh on each download.
  const [exporting, startExport] = useTransition();

  function download() {
    startExport(async () => {
      const res = await exportData();
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      const blob = new Blob([JSON.stringify(res.data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const stamp = new Date().toISOString().slice(0, 10);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cxnet-export-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast("Your data is downloading.", "success");
    });
  }

  return (
    <PageTransition>
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-text-faint">
            Settings
          </p>
          <p className="mt-3 font-serif text-4xl tracking-tight text-text">
            Preferences
          </p>
          <DrawUnderline width={160} className="mt-1 text-brass" />
          <p className="mt-2 text-xs text-text-muted">Signed in as {displayName}</p>
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
          <p className="text-sm text-text">Base currency</p>
          <p className="text-xs text-text-muted">
            The native currency every balance converts to. Entries kept in other
            currencies stay as they are and are converted at today&rsquo;s rate.
          </p>
        </div>

        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full sm:max-w-xs">
            <SelectMenu
              id="base-currency"
              label="Currency"
              value={choice}
              options={CURRENCY_OPTIONS}
              onChange={setChoice}
            />
            <p className="mt-2 text-xs text-text-faint">{currencyName(choice)}</p>
          </div>

          <Button onClick={guard(save)} disabled={pending || (canWrite && !dirty)}>
            {pending ? "Saving" : "Save"}
          </Button>
        </div>
        </Card>
      </Reveal>

      <Reveal delay={0.16} className="mt-4 max-w-xl">
        <Card className="px-5 py-5">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-text">Default accounts</p>
          <p className="text-xs text-text-muted">
            Where new entries land by default. Income deposits to one account and
            expenses draw from another, each pre-filled on the form and still
            changeable per entry.
          </p>
        </div>

        {accounts.length === 0 ? (
          <p className="mt-5 text-xs text-text-faint">
            Add a savings account first to choose defaults.
          </p>
        ) : (
          <>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <SelectMenu
                id="default-income-account"
                label="Income deposits to"
                value={incomeAccount}
                options={accountOptions}
                onChange={setIncomeAccount}
              />
              <SelectMenu
                id="default-expense-account"
                label="Expenses draw from"
                value={expenseAccount}
                options={accountOptions}
                onChange={setExpenseAccount}
              />
            </div>

            <div className="mt-5 flex justify-end">
              <Button
                onClick={guard(saveAccounts)}
                disabled={accountsPending || (canWrite && !accountsDirty)}
              >
                {accountsPending ? "Saving" : "Save"}
              </Button>
            </div>
          </>
        )}
        </Card>
      </Reveal>

      <Reveal delay={0.24} className="mt-4 max-w-xl">
        <Card className="px-5 py-5">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-text">Your data</p>
          <p className="text-xs text-text-muted">
            Download everything you have entered as a single JSON file: accounts,
            income and expenses, investments, assets, liabilities, transfers,
            recurring rules, and reconciliation history.
          </p>
        </div>

        <div className="mt-5 flex justify-end">
          <Button
            onClick={download}
            disabled={exporting}
            variant="outline"
          >
            {exporting ? "Preparing" : "Download my data"}
          </Button>
        </div>
        </Card>
      </Reveal>

      <McpConnectCard
        tokens={mcpTokens}
        connectorUrl={connectorUrl}
        canWrite={canWrite}
      />

      <Reveal delay={0.32} className="mt-4 max-w-xl">
        <Card className="px-5 py-5">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-text">Legal</p>
          <p className="text-xs text-text-muted">
            The terms you agreed to and how your information is handled.
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
          {[
            { href: "/legal/terms", label: "Terms of Service" },
            { href: "/legal/privacy", label: "Privacy Policy" },
            { href: "/legal/data", label: "Data & Security" },
          ].map((doc) => (
            <Link
              key={doc.href}
              href={doc.href}
              className="text-xs uppercase tracking-[0.16em] text-text-muted transition hover:text-text"
            >
              {doc.label}
            </Link>
          ))}
        </div>
        </Card>
      </Reveal>
    </PageTransition>
  );
}
