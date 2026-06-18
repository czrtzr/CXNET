import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  // Inline validation message, shown in oxblood below the field.
  error?: string;
};

// Inputs lift on focus with an oxblood border. forwardRef so forms and field
// libraries can attach a ref.
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, id, className, ...props },
  ref,
) {
  return (
    <div className="flex flex-col gap-2">
      {label ? (
        <label
          htmlFor={id}
          className="text-xs uppercase tracking-[0.18em] text-text-muted"
        >
          {label}
        </label>
      ) : null}
      <input
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        className={cn(
          "rounded-sm border border-border bg-surface px-3.5 py-2.5 text-text outline-none transition",
          "placeholder:text-text-faint focus:border-red-bright",
          error && "border-neg",
          className,
        )}
        {...props}
      />
      {error ? (
        <p role="alert" className="text-xs text-neg">
          {error}
        </p>
      ) : null}
    </div>
  );
});
