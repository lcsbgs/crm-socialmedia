import { startProviderLogin } from "../actions";
import type { LoginProvider } from "../providers/types";

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-[22px]" aria-hidden>
      <path fill="#4285F4" d="M22.6 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h5.9c-.3 1.4-1 2.5-2.2 3.3v2.8h3.6c2.1-1.9 3.3-4.8 3.3-8.1z" />
      <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.9C3.9 20.6 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.8 14.1c-.2-.7-.4-1.4-.4-2.1s.1-1.4.4-2.1V7H2.1C1.4 8.5 1 10.2 1 12s.4 3.5 1.1 5l3.7-2.9z" />
      <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2C17.5 2.1 15 1 12 1 7.7 1 3.9 3.4 2.1 7l3.7 2.9c.9-2.6 3.3-4.5 6.2-4.5z" />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-[22px]" aria-hidden fill="currentColor">
      <path d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2.1-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8s2 .8 3.4.8c1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9-.1 0-2.7-1-2.7-4.1zM13.9 5c.7-.9 1.2-2 1-3.2-1 0-2.3.7-3 1.6-.7.8-1.2 2-1.1 3.1 1.2.1 2.3-.6 3.1-1.5z" />
    </svg>
  );
}

function ChatGPTMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-[22px]" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M9.2 4.4a4 4 0 0 1 6.9 2.1 4 4 0 0 1 2.9 6.7 4 4 0 0 1-4.6 5.4 4 4 0 0 1-6.9-2.1 4 4 0 0 1-2.9-6.7 4 4 0 0 1 4.6-5.4z" />
      <path d="M9 8.5v6l5 3M15 15.5v-6l-5-3M7.5 12.3l5.2-3 5 2.9" />
    </svg>
  );
}

const config: Record<LoginProvider, { label: string; mark: React.ReactNode; dark?: boolean }> = {
  chatgpt: { label: "Continuar com ChatGPT", mark: <ChatGPTMark />, dark: true },
  google: { label: "Continuar com Google", mark: <GoogleMark /> },
  apple: { label: "Continuar com Apple", mark: <AppleMark /> },
};

// Botões de login social. Cada um é um form próprio (funciona sem JavaScript).
export function ProviderButton({
  provider,
  next,
  note,
}: {
  provider: LoginProvider;
  next: string;
  note?: string;
}) {
  const c = config[provider];
  return (
    <form action={startProviderLogin}>
      <input type="hidden" name="provider" value={provider} />
      <input type="hidden" name="next" value={next} />
      <button
        type="submit"
        className={
          c.dark
            ? "flex h-13 w-full items-center gap-3 rounded-full bg-chatgpt px-[18px] text-md font-bold text-white hover:bg-[#262626]"
            : "flex h-13 w-full items-center gap-3 rounded-full border-[1.5px] border-border-input bg-surface px-[18px] text-md font-bold text-ink hover:bg-hover"
        }
      >
        {c.mark}
        <span className="flex-1 text-left">{c.label}</span>
        {note ? (
          <span
            className={
              c.dark
                ? "rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-chatgpt"
                : "text-xs font-semibold text-muted"
            }
          >
            {note}
          </span>
        ) : null}
      </button>
    </form>
  );
}
