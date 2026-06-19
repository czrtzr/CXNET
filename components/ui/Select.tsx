import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
};

// Styled to sit beside Input: same border, focus glow, and label treatment. The
// native control is kept (it is the right mobile affordance); only the chrome is
// restyled. A leather chevron is drawn with a background image so the menu still
// opens natively.
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, id, className, children, ...props },
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
      <select
        ref={ref}
        id={id}
        className={cn(
          "appearance-none rounded-sm border border-border bg-surface px-3.5 py-2.5 text-text outline-none transition",
          "focus:border-red-bright",
          "bg-[length:10px] bg-[right_0.9rem_center] bg-no-repeat pr-9",
          className,
        )}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='7' viewBox='0 0 10 7' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%237a5234' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
        }}
        {...props}
      >
        {children}
      </select>
    </div>
  );
});
