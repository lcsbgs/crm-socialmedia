import { extendTailwindMerge } from "tailwind-merge";

// Escala de texto própria (12/13/14/16/20/28) para o merge não confundir
// text-md/text-lg com cores.
const twMerge = extendTailwindMerge({
  extend: { classGroups: { "font-size": [{ text: ["xs", "sm", "base", "md", "lg", "xl"] }] } },
});

// Junta classes e resolve conflitos do Tailwind (a última vence).
export function cn(...classes: Array<string | false | null | undefined>) {
  return twMerge(classes.filter(Boolean).join(" "));
}
