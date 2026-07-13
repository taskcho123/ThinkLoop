import type { CustomBlog } from "../types/blog";

export const DEFAULT_BLOGS: CustomBlog[] = [
  { id: "toss", label: "Toss Tech", url: "https://toss.tech/", bg: "#0064FF", text: "#FFFFFF" },
  { id: "kakao", label: "Kakao Tech", url: "https://tech.kakao.com/", bg: "#FEE500", text: "#111111" },
  { id: "naver", label: "Naver D2", url: "https://d2.naver.com/home", bg: "#03C75A", text: "#FFFFFF" },
];

export const BLOG_PALETTE = [
  { id: "indigo", hex: "#6366F1", label: "Indigo" },
  { id: "blue", hex: "#3B82F6", label: "Blue" },
  { id: "cyan", hex: "#06B6D4", label: "Cyan" },
  { id: "emerald", hex: "#10B981", label: "Emerald" },
  { id: "amber", hex: "#F59E0B", label: "Amber" },
  { id: "rose", hex: "#F43F5E", label: "Rose" },
  { id: "purple", hex: "#A855F7", label: "Purple" },
  { id: "slate", hex: "#475569", label: "Slate" },
];

export const DEFAULT_BLOG_STYLES: Record<string, string> = {
  "Toss Tech": "bg-[#0064FF] text-white",
  "Kakao Tech": "bg-[#FEE500] text-gray-900",
  "Naver D2": "bg-[#03C75A] text-white",
};

export function isLight(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}
