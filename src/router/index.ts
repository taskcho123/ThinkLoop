import type { Page } from "../types/app";

export function resolvePrimaryPage(page: Page): Page {
  if (page === "dev-record-detail" || page === "write-dev-record") return "home";
  if (page === "project-detail" || page === "write-reflection") return "projects";
  if (page === "insight-detail") return "insight";
  return page;
}
