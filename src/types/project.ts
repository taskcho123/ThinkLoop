export type ProjectStatus = "Planning" | "Progress" | "Finished";

export interface Reflection {
  id: string;
  date: string;
  aiDid: string;
  iDid: string;
  improvement: string;
  reflection: string;
  nextGoal: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  progress: number;
  latestReflection: string;
  createdAt: string;
  reflections: Reflection[];
}
