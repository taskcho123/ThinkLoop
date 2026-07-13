import type { AppSnapshot } from "../types/app";
import type { Reflection } from "../types/project";
import { saveProjects } from "./projectApi";

export async function saveProjectComments(
  userId: string,
  projectId: string,
  comments: Reflection[],
  snapshot: AppSnapshot,
) {
  const projects = snapshot.projects.map((project) =>
    project.id === projectId ? { ...project, reflections: comments } : project,
  );
  await saveProjects(userId, projects, snapshot);
}
