import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { FieldMessage, Label, Textarea } from "./input";

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
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        name={name}
        rows={4}
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={errors?.length ? `${id}-error` : undefined}
        {...props}
      />
      <FieldMessage id={id} errors={errors} />
    </div>
  );
}
