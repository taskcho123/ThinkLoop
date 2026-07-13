import type { Project, ProjectStatus, Reflection } from "../types/project";

export interface ProjectDetailPageProps {
  project: Project;
  onBack: () => void;
  onStatusChange: (id: string, status: ProjectStatus) => void;
  onWriteReflection: (project: Project) => void;
  onDeleteReflection: (projectId: string, reflectionId: string) => void;
}

export interface WriteReflectionPageProps {
  project: Project;
  onBack: () => void;
  onSave: (reflection: Omit<Reflection, "id" | "date">) => void;
}
