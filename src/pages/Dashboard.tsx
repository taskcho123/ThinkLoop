import type { DevRecord, Insight } from "../types/blog";
import type { Project } from "../types/project";

export interface DashboardPageProps {
  projects: Project[];
  insights: Insight[];
  devRecords: DevRecord[];
}
