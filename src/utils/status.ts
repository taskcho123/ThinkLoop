import type { ElementType } from "react";
import { Lightbulb, Rocket, Target } from "lucide-react";
import type { ProjectStatus } from "../types/project";

export const STATUS_CONFIG: Record<ProjectStatus, { bg: string; text: string; dot: string; bar: string }> = {
  Planning: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400", bar: "bg-amber-400" },
  Progress: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-400", bar: "bg-emerald-500" },
  Finished: { bg: "bg-gray-100", text: "text-gray-500", dot: "bg-gray-400", bar: "bg-gray-400" },
};

export const STATUS_STEPS: { value: ProjectStatus; label: string; icon: ElementType }[] = [
  { value: "Planning", label: "기획중", icon: Lightbulb },
  { value: "Progress", label: "진행중", icon: Rocket },
  { value: "Finished", label: "완료", icon: Target },
];

export const PROGRESS_BY_STATUS: Record<ProjectStatus, number> = {
  Planning: 15,
  Progress: 65,
  Finished: 100,
};
