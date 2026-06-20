"use client";

import { useState, useTransition } from "react";
import { CURRENCIES, CURRENCY_OPTIONS } from "@/lib/finance/currencies";
import { updateBaseCurrency } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { useToast } from "@/components/ui/Toast";
import { PageTransition } from "@/components/layout/PageTransition";

type Props = {
  base: string;
  displayName: string;
  canWrite: boolean;
};

function currencyName(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.name ?? code;
}

export function SettingsView({ base, displayName, canWrite }: Props) {
  const [choice, setChoice] = useState(base);
  const [saved, setSaved] = useState(base);
  const [pending, start] = useTransition();
  const { toast } = useToast();

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

  return (
    <PageTransition>
      <p className="text-xs uppercase tracking-[0.22em] text-text-faint">Settings</p>
      <p className="mt-3 font-serif text-4xl tracking-tight text-text">Preferences</p>
      <p className="mt-1 text-xs text-text-muted">Signed in as {displayName}</p>

      <Card className="mt-8 max-w-xl px-5 py-5">
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

          {canWrite ? (
            <Button onClick={save} disabled={!dirty || pending}>
              {pending ? "Saving" : "Save"}
            </Button>
          ) : (
            <p className="text-xs text-text-faint">The demo account is read only.</p>
          )}
        </div>
      </Card>
    </PageTransition>
  );
}
