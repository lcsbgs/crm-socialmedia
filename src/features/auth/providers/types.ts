export type LoginProvider = "google" | "apple" | "chatgpt";

export const providerLabels: Record<LoginProvider, string> = {
  google: "Google",
  apple: "Apple",
  chatgpt: "ChatGPT",
};

export function isLoginProvider(v: string): v is LoginProvider {
  return v === "google" || v === "apple" || v === "chatgpt";
}

// Adapter de login social: devolve a URL para onde o navegador vai.
export interface LoginProviderAdapter {
  start(provider: LoginProvider, next: string): Promise<{ url: string } | { error: string }>;
}
