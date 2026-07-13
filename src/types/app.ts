import type { CustomBlog, DevRecord, Insight } from "./blog";
import type { Project } from "./project";

export type Page =
  | "home"
  | "projects"
  | "insight"
  | "insight-detail"
  | "dashboard"
  | "project-detail"
  | "write-reflection"
  | "dev-record-detail"
  | "write-dev-record"
  | "settings";

export interface UserProfile {
  name: string;
  avatarId: string;
  role: string;
}

export interface AppSnapshot {
  userProfile: UserProfile | null;
  projects: Project[];
  insights: Insight[];
  customBlogs: CustomBlog[];
  devRecords: DevRecord[];
}
