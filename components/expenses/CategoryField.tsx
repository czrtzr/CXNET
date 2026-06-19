"use client";

import { useState, useTransition } from "react";
import type { Category } from "@/types";
import { createCategory } from "@/app/(app)/expenses/actions";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

// Muted swatches that sit on near-black, in the spirit of the preset palette.
const SWATCHES = [
  "#7a5234",
  "#5f8b6a",
  "#9b5b3a",
  "#5e7a8b",
  "#7a6f8b",
  "#a07b4f",
  "#8b5f6a",
  "#6b6258",
];

// Category picker for expenses. Lists presets and the user's own, with an inline
// "New" affordance that creates a custom category and selects it without leaving
// the form. Newly created rows are held locally until the page revalidates.
export function CategoryField({
  value,
  categories,
  onChange,
  onError,
}: {
  value: string | null;
  categories: Category[];
  onChange: (id: string | null) => void;
  onError: (message: string) => void;
}) {
  const [extra, setExtra] = useState<Category[]>([]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(SWATCHES[0]);
  const [pending, start] = useTransition();

  // Once a freshly created category arrives in the refreshed props, drop our
  // local copy so it does not appear twice.
  const all = [
    ...categories,
    ...extra.filter((e) => !categories.some((c) => c.id === e.id)),
  ];

  function add() {
    if (name.trim() === "") return;
    start(async () => {
      const res = await createCategory(name, color);
      if (!res.ok) {
        onError(res.error);
        return;
      }
      setExtra((list) => [...list, res.category]);
      onChange(res.category.id);
      setName("");
      setAdding(false);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end justify-between">
        <label
          htmlFor="category"
          className="text-xs uppercase tracking-[0.18em] text-text-muted"
        >
          Category
        </label>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="text-xs text-text-muted transition hover:text-text"
        >
          {adding ? "Close" : "New"}
        </button>
      </div>

      <Select
        id="category"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">Uncategorized</option>
        {all.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>

      {adding ? (
        <div className="mt-1 flex flex-col gap-3 rounded-sm border border-border bg-surface p-3">
          <Input
            id="new-category"
            placeholder="Category name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="flex items-center gap-2">
            {SWATCHES.map((s) => (
              <button
                key={s}
                type="button"
                aria-label={`Use ${s}`}
                onClick={() => setColor(s)}
                className={cn(
                  "h-6 w-6 rounded-full border transition",
                  color === s
                    ? "border-text"
                    : "border-transparent hover:border-border-strong",
                )}
                style={{ backgroundColor: s }}
              />
            ))}
            <Button
              type="button"
              size="sm"
              onClick={add}
              disabled={pending || name.trim() === ""}
              className="ml-auto"
            >
              Add
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
