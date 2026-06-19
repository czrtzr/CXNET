import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
};

// Notes field. Matches Input's chrome, with a quiet resize handle.
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ label, id, className, ...props }, ref) {
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
        <textarea
          ref={ref}
          id={id}
          className={cn(
            "min-h-20 resize-y rounded-sm border border-border bg-surface px-3.5 py-2.5 text-text outline-none transition",
            "placeholder:text-text-faint focus:border-red-bright",
            className,
          )}
          {...props}
        />
      </div>
    );
  },
);
