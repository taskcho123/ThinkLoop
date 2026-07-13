import { useCallback, type Dispatch, type SetStateAction } from "react";
import type { CustomBlog, DevRecord, Insight } from "../types/blog";
import { DEFAULT_BLOG_STYLES } from "../utils/blog";
import { todayLabel } from "../utils/date";
import { makeId } from "../utils/id";

export function useBlogLogs(
  setInsights: Dispatch<SetStateAction<Insight[]>>,
  setCustomBlogs: Dispatch<SetStateAction<CustomBlog[]>>,
  setDevRecords: Dispatch<SetStateAction<DevRecord[]>>,
) {
  const addBlog = useCallback((blog: CustomBlog) => {
    setCustomBlogs((prev) => [...prev, blog]);
  }, [setCustomBlogs]);

  const saveInsight = useCallback((insight: Omit<Insight, "id" | "date" | "blogStyle">) => {
    const blogStyle = DEFAULT_BLOG_STYLES[insight.blog] ?? "bg-primary text-white";
    setInsights((prev) => [
      {
        ...insight,
        id: makeId("insight"),
        blogStyle,
        date: new Date().toLocaleString("ko-KR", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
      ...prev,
    ]);
  }, [setInsights]);

  const deleteInsight = useCallback((insightId: string) => {
    setInsights((prev) => prev.filter((insight) => insight.id !== insightId));
  }, [setInsights]);

  const saveDevRecord = useCallback((record: Pick<DevRecord, "title" | "content">) => {
    setDevRecords((prev) => [
      {
        ...record,
        id: makeId("dev-record"),
        date: todayLabel(),
      },
      ...prev,
    ]);
  }, [setDevRecords]);

  const deleteDevRecord = useCallback((recordId: string) => {
    setDevRecords((prev) => prev.filter((record) => record.id !== recordId));
  }, [setDevRecords]);

  return {
    addBlog,
    saveInsight,
    deleteInsight,
    saveDevRecord,
    deleteDevRecord,
  };
}
