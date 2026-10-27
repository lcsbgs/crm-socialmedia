import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { deleteMeeting } from "@/features/meetings/actions";
import { MinutesReview } from "@/features/meetings/components/minutes-review";
import { NotesForm } from "@/features/meetings/components/notes-form";
import { getMeeting } from "@/features/meetings/queries";
import { minutesSchema, toLocalInput } from "@/features/meetings/schemas";
import { TaskList } from "@/features/tasks/components/task-list";
import { getWorkspaceBySlug } from "@/features/workspaces/queries";

export const metadata: Metadata = { title: "Reunião" };

export default async function MeetingPage({
  params,
}: PageProps<"/w/[slug]/clientes/[id]/reunioes/[meetingId]">) {
  const { slug, id, meetingId } = await params;
  if (!z.uuid().safeParse(meetingId).success) notFound();
  const workspace = await getWorkspaceBySlug(slug);
  const meeting = await getMeeting(workspace.id, meetingId);
  if (!meeting || meeting.client_id !== id) notFound();

  const back = `/w/${slug}/clientes/${id}?aba=reunioes`;
  const ata = minutesSchema.safeParse(meeting.ata_ia);
  const confirmed = !!meeting.ata_confirmada_em;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-1">
        <Link href={back} className="text-sm text-muted hover:text-foreground">
          {meeting.client.nome} · Reuniões
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{meeting.titulo}</h1>
      </div>

      <Card>
        <NotesForm
          workspaceId={workspace.id}
          meeting={{ ...meeting, data: toLocalInput(meeting.data) }}
          locked={confirmed}
        />
      </Card>

      {confirmed && ata.success ? (
        <Card>
          <CardHeader title="Ata" description="Confirmada." />
          <div className="space-y-4 text-sm">
            {ata.data.resumo ? <p className="whitespace-pre-line">{ata.data.resumo}</p> : null}
            {ata.data.decisoes.length ? (
              <div>
                <p className="mb-1 font-medium">Decisões</p>
                <ul className="list-disc space-y-1 pl-5">
                  {ata.data.decisoes.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div>
              <p className="mb-1 font-medium">Tarefas criadas</p>
              <TaskList
                workspaceId={workspace.id}
                tasks={meeting.tasks}
                empty="Nenhuma tarefa criada a partir desta ata."
              />
            </div>
          </div>
        </Card>
      ) : ata.success ? (
        <Card>
          <CardHeader
            title="Revisar ata"
            description="Ajuste o que precisar. Os próximos passos marcados viram tarefas do cliente."
          />
          <MinutesReview
            key={meeting.updated_at}
            workspaceId={workspace.id}
            meetingId={meeting.id}
            draft={ata.data}
          />
        </Card>
      ) : null}

      <form action={deleteMeeting} className="text-right">
        <input type="hidden" name="workspaceId" value={workspace.id} />
        <input type="hidden" name="id" value={meeting.id} />
        <input type="hidden" name="back" value={back} />
        <Button type="submit" variant="ghost" size="sm" className="text-danger">
          Excluir reunião
        </Button>
      </form>
    </div>
  );
}
