import { Calendar, Folder, Trash2 } from "lucide-react";
import type { Project } from "../types/project";
import { StatusBadge } from "./StatusBadge";

export function ProjectCard({
  project,
  onSelect,
  onDelete,
}: {
  project: Project;
  onSelect: (project: Project) => void;
  onDelete: (project: Project) => void;
}) {
  return (
    <div className="text-left bg-white rounded-xl border border-border p-5 shadow-sm hover:shadow-md hover:border-[#B8D9D2] transition-all duration-200 group">
      <button onClick={() => onSelect(project)} className="w-full text-left">
        <div className="flex items-start justify-between mb-3">
          <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center">
            <Folder className="w-4 h-4 text-primary" />
          </div>
          <StatusBadge status={project.status} />
        </div>
        <h3
          className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors duration-150"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {project.name}
        </h3>
        <p className="text-xs text-muted-foreground mb-4 leading-relaxed line-clamp-2">
          {project.description}
        </p>
      </button>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {project.createdAt}
        </div>
        <button
          onClick={() => onDelete(project)}
          className="w-8 h-8 rounded-full bg-white border border-rose-100 text-rose-300 shadow-sm flex items-center justify-center hover:text-rose-400 hover:border-rose-200 hover:bg-rose-50 active:scale-95 transition-all"
          title="프로젝트 삭제"
          aria-label={`${project.name} 삭제`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
