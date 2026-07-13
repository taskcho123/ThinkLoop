import type { AppSnapshot } from "../types/app";
import type { CustomBlog, DevRecord, Insight } from "../types/blog";
import { loadAppState, saveAppState } from "../services/appStateRepository";
import { EMPTY_BLOGS, EMPTY_DEV_RECORDS, EMPTY_INSIGHTS, EMPTY_PROJECTS } from "../utils/storage";

async function loadSnapshot(userId: string) {
  return loadAppState(userId) as Promise<Partial<AppSnapshot> | null>;
}

export async function listBlogLogs(userId: string) {
  const snapshot = await loadSnapshot(userId);
  return {
    insights: (snapshot?.insights as Insight[] | undefined) ?? EMPTY_INSIGHTS,
    customBlogs: (snapshot?.customBlogs as CustomBlog[] | undefined) ?? EMPTY_BLOGS,
    devRecords: (snapshot?.devRecords as DevRecord[] | undefined) ?? EMPTY_DEV_RECORDS,
  };
}

export async function saveBlogLogs(
  userId: string,
  logs: Pick<AppSnapshot, "insights" | "customBlogs" | "devRecords">,
  snapshot: Partial<AppSnapshot>,
) {
  await saveAppState(userId, {
    userProfile: snapshot.userProfile!,
    projects: snapshot.projects ?? EMPTY_PROJECTS,
    insights: logs.insights,
    customBlogs: logs.customBlogs,
    devRecords: logs.devRecords,
  });
}
