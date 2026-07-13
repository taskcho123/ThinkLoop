import type { AppSnapshot } from "../types/app";
import type { Project } from "../types/project";
import { loadAppState, saveAppState } from "../services/appStateRepository";
import { EMPTY_BLOGS, EMPTY_DEV_RECORDS, EMPTY_INSIGHTS, EMPTY_PROJECTS } from "../utils/storage";

async function loadSnapshot(userId: string) {
  return loadAppState(userId) as Promise<Partial<AppSnapshot> | null>;
}

export async function listProjects(userId: string) {
  const snapshot = await loadSnapshot(userId);
  return (snapshot?.projects as Project[] | undefined) ?? EMPTY_PROJECTS;
}

export async function saveProjects(userId: string, projects: Project[], snapshot: Partial<AppSnapshot>) {
  await saveAppState(userId, {
    userProfile: snapshot.userProfile!,
    projects,
    insights: snapshot.insights ?? EMPTY_INSIGHTS,
    customBlogs: snapshot.customBlogs ?? EMPTY_BLOGS,
    devRecords: snapshot.devRecords ?? EMPTY_DEV_RECORDS,
  });
}
