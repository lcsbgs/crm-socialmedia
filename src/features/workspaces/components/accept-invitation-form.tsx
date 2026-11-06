"use client";

import { useActionState } from "react";
import { FormAlert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { acceptInvitation } from "../actions";

export function AcceptInvitationForm({ token }: { token: string }) {
  const [state, action] = useActionState(acceptInvitation, null);
  return (
    <form action={action} className="space-y-4">
      <FormAlert state={state} />
      <input type="hidden" name="token" value={token} />
      <SubmitButton size="lg" className="w-full" pendingText="Entrando...">
        Aceitar convite
      </SubmitButton>
    </form>
  );
}
