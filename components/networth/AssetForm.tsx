"use client";

import { useState } from "react";
import type { Asset, AssetType } from "@/types";
import { ASSET_TYPES, ASSET_TYPE_LABELS } from "@/types";
import { CURRENCIES } from "@/lib/finance/currencies";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import type { AssetInput } from "@/app/(app)/net-worth/actions";

function numeric(value: string): number {
  return Number(value.replace(/[\s,]/g, ""));
}

export function AssetForm({
  initial,
  base,
  pending,
  onSubmit,
  onCancel,
}: {
  initial?: Asset;
  base: string;
  pending: boolean;
  onSubmit: (input: AssetInput) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [assetType, setAssetType] = useState<AssetType>(
    initial?.asset_type ?? "property",
  );
  const [value, setValue] = useState(initial ? String(initial.value) : "");
  const [currency, setCurrency] = useState(initial?.currency ?? base);
  const [purchasePrice, setPurchasePrice] = useState(
    initial?.purchase_price != null ? String(initial.purchase_price) : "",
  );
  const [purchaseDate, setPurchaseDate] = useState(initial?.purchase_date ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [touched, setTouched] = useState(false);

  const nameValid = name.trim() !== "";
  const valueValid = value.trim() !== "" && !Number.isNaN(numeric(value));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!nameValid || !valueValid) return;
    onSubmit({
      name,
      asset_type: assetType,
      value,
      currency,
      purchase_price: purchasePrice === "" ? null : purchasePrice,
      purchase_date: purchaseDate === "" ? null : purchaseDate,
      notes,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <Input
          id="asset-name"
          label="Asset"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={touched && !nameValid ? "Name the asset." : undefined}
          autoFocus
        />
        <Select
          id="asset-type"
          label="Type"
          value={assetType}
          onChange={(e) => setAssetType(e.target.value as AssetType)}
        >
          {ASSET_TYPES.map((t) => (
            <option key={t} value={t}>
              {ASSET_TYPE_LABELS[t]}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-3">
        <Input
          id="asset-value"
          label="Current value"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          error={touched && !valueValid ? "Enter a value." : undefined}
        />
        <Select
          id="asset-currency"
          label="Currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          id="asset-purchase"
          label="Purchase price"
          inputMode="decimal"
          placeholder="Optional"
          value={purchasePrice}
          onChange={(e) => setPurchasePrice(e.target.value)}
        />
        <Input
          id="asset-purchase-date"
          label="Purchase date"
          type="date"
          value={purchaseDate}
          onChange={(e) => setPurchaseDate(e.target.value)}
        />
      </div>

      <Textarea
        id="asset-notes"
        label="Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <div className="mt-1 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {initial ? "Save changes" : "Add asset"}
        </Button>
      </div>
    </form>
  );
}
