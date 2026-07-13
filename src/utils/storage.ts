import type { AppSnapshot } from "../types/app";
import type { CustomBlog, DevRecord, Insight } from "../types/blog";
import type { Project } from "../types/project";

export const STORAGE_KEY = "thinkloop.app.v1";

export const EMPTY_PROJECTS: Project[] = [];
export const EMPTY_INSIGHTS: Insight[] = [];
export const EMPTY_BLOGS: CustomBlog[] = [];
export const EMPTY_DEV_RECORDS: DevRecord[] = [];

export function readSnapshot(): Partial<AppSnapshot> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function withoutSeedData(state: Partial<AppSnapshot> | null) {
  if (!state) return null;
  const projectIds = (state.projects ?? []).map((project) => project.id).sort().join(",");
  const insightIds = (state.insights ?? []).map((insight) => insight.id).sort().join(",");
  const hasOnlySeedProjects = projectIds === "1,2,3";
  const hasOnlySeedInsights = insightIds === "i1,i2,i3";

  return {
    ...state,
    projects: hasOnlySeedProjects ? EMPTY_PROJECTS : state.projects ?? EMPTY_PROJECTS,
    insights: hasOnlySeedInsights ? EMPTY_INSIGHTS : state.insights ?? EMPTY_INSIGHTS,
    customBlogs: state.customBlogs ?? EMPTY_BLOGS,
    devRecords: state.devRecords ?? EMPTY_DEV_RECORDS,
  };
}
