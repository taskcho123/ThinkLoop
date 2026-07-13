import { useMemo } from "react";
import type { Project } from "../types/project";

export function useComments(projects: Project[]) {
  return useMemo(
    () => projects.flatMap((project) => project.reflections.map((comment) => ({ ...comment, projectId: project.id }))),
    [projects],
  );
}
