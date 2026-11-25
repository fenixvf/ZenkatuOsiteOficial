import type { ConviteCast, Obra } from "@workspace/api-client-react";

export type ProfileProject = {
  id: number;
  titulo: string;
  slug: string;
  capaUrl: string | null;
  isOwner: boolean;
  participations: ConviteCast[];
};

export function groupProfileProjects(
  uid: string,
  obras: Obra[],
  participations: ConviteCast[],
): ProfileProject[] {
  const projects = new Map<number, ProfileProject>();

  obras.forEach((obra) => {
    if (obra.ownerId !== uid) return;
    projects.set(obra.id, {
      id: obra.id,
      titulo: obra.titulo,
      slug: obra.slug,
      capaUrl: obra.capaUrl || null,
      isOwner: true,
      participations: [],
    });
  });

  participations.forEach((entry) => {
    if (entry.status !== "accepted") return;
    const project = projects.get(entry.obraId) ?? {
      id: entry.obraId,
      titulo: entry.obraTitulo,
      slug: entry.obraSlug,
      capaUrl: entry.obraCapa ?? null,
      isOwner: false,
      participations: [],
    };
    project.participations.push(entry);
    projects.set(entry.obraId, project);
  });

  return Array.from(projects.values()).sort((a, b) =>
    a.titulo.localeCompare(b.titulo, "pt-BR"),
  );
}
