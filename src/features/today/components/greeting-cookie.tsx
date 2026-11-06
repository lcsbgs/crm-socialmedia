"use client";

import { useEffect } from "react";

// Guarda a última saudação para a próxima visita não repetir.
export function GreetingCookie({ value }: { value: string }) {
  useEffect(() => {
    document.cookie = `pauta_saudacao=${encodeURIComponent(value)}; path=/; max-age=2592000; samesite=lax`;
  }, [value]);
  return null;
}
