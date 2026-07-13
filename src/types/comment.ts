import type { Reflection } from "./project";

export type Comment = Reflection;

export type CommentInput = Omit<Reflection, "id" | "date">;
