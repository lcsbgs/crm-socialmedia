import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// Botões em pílula. Primária violeta para a ação principal, borda para secundárias,
// escura para ações fortes secundárias, tonal para ações de apoio.
export type ButtonVariant =
  | "primary"
  | "outline"
  | "secondary"
  | "dark"
  | "tonal"
  | "ghost"
  | "danger"
  | "chatgpt";
export type ButtonSize = "xs" | "sm" | "md" | "lg" | "icon" | "icon-sm" | "icon-lg";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-ink hover:bg-accent-hover",
  outline: "border border-border bg-surface text-ink hover:border-border-input hover:bg-hover",
  secondary: "border border-border bg-surface text-ink hover:border-border-input hover:bg-hover",
  dark: "bg-dark text-white hover:bg-dark-hover",
  tonal: "bg-accent-tonal text-accent-tonal-ink hover:bg-[#E2DCFF]",
  ghost: "text-ink hover:bg-hover",
  danger: "border border-border bg-surface text-late hover:bg-late-tonal-2",
  chatgpt: "bg-chatgpt text-white hover:bg-[#262626]",
};

const sizes: Record<ButtonSize, string> = {
  xs: "h-8 gap-1.5 px-3 text-sm",
  sm: "h-9 gap-1.5 px-3.5 text-base",
  md: "h-11 gap-2 px-[18px] text-base",
  lg: "h-13 gap-2 px-6 text-md",
  icon: "size-9 justify-center",
  "icon-sm": "size-8 justify-center",
  "icon-lg": "size-11 justify-center",
};

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md") {
  return cn(
    "inline-flex shrink-0 items-center justify-center rounded-full font-bold whitespace-nowrap transition-colors select-none",
    "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    "[&_svg]:size-[18px] [&_svg]:shrink-0",
    variant === "outline" || variant === "secondary" || variant === "ghost" ? "font-semibold" : "",
    variants[variant],
    sizes[size],
  );
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, className, type = "button", ...props },
  ref,
) {
  return <button ref={ref} type={type} className={cn(buttonClasses(variant, size), className)} {...props} />;
});

// Botão só com ícone: exige rótulo acessível.
export const IconButton = forwardRef<
  HTMLButtonElement,
  Omit<ButtonProps, "size" | "aria-label"> & { label: string; size?: "sm" | "md" | "lg" }
>(function IconButton({ label, size = "md", variant = "outline", className, type = "button", ...props }, ref) {
  const s = size === "sm" ? "icon-sm" : size === "lg" ? "icon-lg" : "icon";
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(buttonClasses(variant, s), "px-0", className)}
      {...props}
    />
  );
});
