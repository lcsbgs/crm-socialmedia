import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function TextareaField({
  label,
  name,
  errors,
  className,
  ...props
}: { label: string; name: string; errors?: string[] } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = props.id ?? name;
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <textarea
        id={id}
        name={name}
        rows={4}
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={errors?.length ? `${id}-error` : undefined}
        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted"
        {...props}
      />
      {errors?.length ? (
        <p id={`${id}-error`} className="text-sm text-danger">
          {errors[0]}
        </p>
      ) : null}
    </div>
  );
}
