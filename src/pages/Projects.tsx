import type { Project } from "../types/project";

export interface ProjectsPageProps {
  projects: Project[];
  onSelectProject: (project: Project) => void;
  onCreateProject: (
    project: Omit<Project, "id" | "createdAt" | "reflections" | "latestReflection" | "progress">,
  ) => void;
  onDeleteProject: (projectId: string) => void;
}

export type ProjectsPageComponent = (props: ProjectsPageProps) => JSX.Element;
