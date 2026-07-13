import { ChevronRight } from "lucide-react";
import type { Project, ProjectStatus } from "../types/project";

export function ProjectForm({
  name,
  description,
  status,
  onNameChange,
  onDescriptionChange,
  onStatusChange,
  onSubmit,
  onCancel,
}: {
  name: string;
  description: string;
  status: ProjectStatus;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onStatusChange: (value: ProjectStatus) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const canCreate = name.trim();

  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder="Project name"
        value={name}
        onChange={(event) => onNameChange(event.target.value)}
        className="w-full px-3.5 py-2.5 bg-muted rounded-lg text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
      />
      <textarea
        placeholder="Short description..."
        value={description}
        onChange={(event) => onDescriptionChange(event.target.value)}
        className="w-full px-3.5 py-2.5 bg-muted rounded-lg text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none h-20 transition-all"
      />
      <div className="relative">
        <select
          value={status}
          onChange={(event) => onStatusChange(event.target.value as ProjectStatus)}
          className="w-full px-3.5 py-2.5 bg-muted rounded-lg text-sm border border-border focus:outline-none appearance-none cursor-pointer"
        >
          <option>Planning</option>
          <option>Progress</option>
          <option>Finished</option>
        </select>
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
      </div>
      <div className="flex gap-2.5 mt-5">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onSubmit}
          disabled={!canCreate}
          className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-[#4A7A6A] transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Create Project
        </button>
      </div>
    </div>
  );
}

export type ProjectFormInput = Omit<Project, "id" | "createdAt" | "reflections" | "latestReflection" | "progress">;
