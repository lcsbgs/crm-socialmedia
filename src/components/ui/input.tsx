import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const controlClasses =
  "w-full rounded-md border border-border bg-surface px-2.5 text-base text-ink placeholder:text-muted transition-colors hover:border-[color-mix(in_srgb,var(--muted)_40%,var(--border))] focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent)_22%,transparent)] disabled:opacity-60 aria-[invalid=true]:border-late";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(controlClasses, "h-8", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea ref={ref} className={cn(controlClasses, "min-h-20 py-2 leading-5", className)} {...props} />
    );
  },
);

export function Label({
  htmlFor,
  children,
  className,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label htmlFor={htmlFor} className={cn("block text-sm font-medium text-ink", className)}>
      {children}
    </label>
  );
}

export function FieldMessage({ id, errors, hint }: { id: string; errors?: string[]; hint?: string }) {
  if (errors?.length) {
    return (
      <p id={`${id}-error`} className="text-sm text-late">
        {errors[0]}
      </p>
    );
  }
  if (hint) {
    return (
      <p id={`${id}-hint`} className="text-sm text-muted">
        {hint}
      </p>
    );
  }
  return null;
}
