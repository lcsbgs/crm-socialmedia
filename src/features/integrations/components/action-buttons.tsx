"use client";

import { useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import { Button, type ButtonVariant } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { createClientDriveFolder, createGoogleMeet, importGranolaNotes, syncGoogleMeetings } from "../workspace-actions";

type Kind = "sync-google" | "meet" | "granola" | "drive-folder";

export function IntegrationButton({
  kind,
  workspaceId,
  meetingId,
  clientId,
  children,
  variant = "outline",
}: {
  kind: Kind;
  workspaceId: string;
  meetingId?: string;
  clientId?: string;
  children: ReactNode;
  variant?: ButtonVariant;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant={variant}
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r =
            kind === "sync-google"
              ? await syncGoogleMeetings({ workspaceId })
              : kind === "meet"
                ? await createGoogleMeet({ workspaceId, meetingId: meetingId! })
                : kind === "granola"
                  ? await importGranolaNotes({ workspaceId, meetingId: meetingId! })
                  : await createClientDriveFolder({ workspaceId, clientId: clientId! });
          if ("error" in r) toast.error(r.error);
          else toast.success(r.message ?? "Pronto.");
          router.refresh();
        })
      }
    >
      {pending ? "Aguarde..." : children}
    </Button>
  );
}
