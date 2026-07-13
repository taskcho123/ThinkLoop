import type { CustomBlog, DevRecord, Insight } from "../types/blog";

export interface BlogPageProps {
  insights: Insight[];
  customBlogs: CustomBlog[];
  onAddBlog: (blog: CustomBlog) => void;
  onSaveInsight: (insight: Omit<Insight, "id" | "date" | "blogStyle">) => void;
  onSelectInsight: (insight: Insight) => void;
}

export interface BlogDetailPageProps {
  insight: Insight;
  onBack: () => void;
  onDelete: (insightId: string) => void;
}

export interface DevRecordPageProps {
  record: DevRecord;
  onBack: () => void;
  onDelete: (recordId: string) => void;
}
