import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const controlClasses =
  "h-10 w-full rounded-md border border-border bg-surface px-3 text-sm placeholder:text-muted aria-[invalid=true]:border-danger";

type FieldProps = {
  label: string;
  name: string;
  errors?: string[];
  hint?: string;
};

export function Field({
  label,
  name,
  errors,
  hint,
  className,
  ...props
}: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = props.id ?? name;
  const describedBy = errors?.length ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={name}
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={describedBy}
        className={controlClasses}
        {...props}
      />
      <FieldMessage id={id} errors={errors} hint={hint} />
    </div>
  );
}

export function SelectField({
  label,
  name,
  errors,
  hint,
  className,
  children,
  ...props
}: FieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = props.id ?? name;
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <select
        id={id}
        name={name}
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={errors?.length ? `${id}-error` : undefined}
        className={controlClasses}
        {...props}
      >
        {children}
      </select>
      <FieldMessage id={id} errors={errors} hint={hint} />
    </div>
  );
}

function FieldMessage({ id, errors, hint }: { id: string; errors?: string[]; hint?: string }) {
  if (errors?.length) {
    return (
      <p id={`${id}-error`} className="text-sm text-danger">
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
