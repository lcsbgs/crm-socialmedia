"use client";

import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { DatePicker, DateTimePicker, MonthPicker } from "./date-picker";
import { FieldMessage, Input, Label } from "./input";
import { Select, type SelectOption } from "./select";

type FieldProps = {
  label: string;
  name: string;
  errors?: string[];
  hint?: string;
  className?: string;
};

// Campo com label e mensagem. type="date" | "datetime-local" | "month" usam
// os seletores próprios (nunca o input nativo).
export function Field({
  label,
  name,
  errors,
  hint,
  className,
  type,
  defaultValue,
  ...props
}: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = props.id ?? name;
  const invalid = errors?.length ? true : undefined;
  const describedBy = errors?.length ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const value = defaultValue === undefined || defaultValue === null ? "" : String(defaultValue);

  let control;
  if (type === "date") {
    control = <DatePicker id={id} name={name} defaultValue={value || null} aria-invalid={invalid} />;
  } else if (type === "datetime-local") {
    control = <DateTimePicker id={id} name={name} defaultValue={value} />;
  } else if (type === "month") {
    control = <MonthPicker name={name} defaultValue={value} aria-label={label} />;
  } else {
    control = (
      <Input
        id={id}
        name={name}
        type={type}
        defaultValue={defaultValue}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        {...props}
      />
    );
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {control}
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
  options,
  defaultValue,
  value,
  onValueChange,
  placeholder,
  id,
}: FieldProps & {
  options: SelectOption[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (v: string) => void;
  placeholder?: string;
  id?: string;
}) {
  const fieldId = id ?? name;
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={fieldId}>{label}</Label>
      <Select
        id={fieldId}
        name={name}
        options={options}
        defaultValue={defaultValue}
        value={value}
        onValueChange={onValueChange}
        placeholder={placeholder}
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={errors?.length ? `${fieldId}-error` : undefined}
      />
      <FieldMessage id={fieldId} errors={errors} hint={hint} />
    </div>
  );
}
