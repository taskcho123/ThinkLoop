import { BookOpen, FileText, Folder, Lightbulb } from "lucide-react";
import type { DevRecord, Insight } from "../types/blog";
import type { Project } from "../types/project";
import { dateKey, monthKey, monthLabel, parseAppDate } from "./date";

export const HEATMAP_COLORS = ["#EEF6F3", "#B8D9D2", "#8DBDAF", "#6BA898", "#5B8E7D"];

export function allReflectionDates(projects: Project[]) {
  return projects.flatMap((project) =>
    project.reflections.map((reflection) => ({
      date: parseAppDate(reflection.date),
      project: project.name,
      text: reflection.reflection || reflection.iDid || "회고를 작성했습니다.",
    })),
  );
}

export function allInsightDates(insights: Insight[]) {
  return insights.map((insight) => ({
    date: parseAppDate(insight.date),
    blog: insight.blog,
    text: insight.title,
  }));
}

export function allDevRecordDates(devRecords: DevRecord[]) {
  return devRecords.map((record) => ({
    date: parseAppDate(record.date),
    title: record.title,
    text: record.content,
  }));
}

export function buildHeatmap(projects: Project[], insights: Insight[], devRecords: DevRecord[]) {
  const counts = new Map<string, number>();
  for (const item of allReflectionDates(projects)) {
    const key = dateKey(item.date);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  for (const item of allInsightDates(insights)) {
    const key = dateKey(item.date);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  for (const item of allDevRecordDates(devRecords)) {
    const key = dateKey(item.date);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const data: { date: string; count: number }[] = [];
  const today = new Date();
  for (let i = 364; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const key = dateKey(date);
    data.push({ date: key, count: counts.get(key) ?? 0 });
  }
  return data;
}

export function buildMonthlyData(projects: Project[], insights: Insight[], devRecords: DevRecord[]) {
  const months = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (6 - index));
    return {
      key: monthKey(date),
      month: monthLabel(date),
      reflections: 0,
      insights: 0,
    };
  });

  const byMonth = new Map(months.map((item) => [item.key, item]));
  for (const item of allReflectionDates(projects)) {
    const target = byMonth.get(monthKey(item.date));
    if (target) target.reflections += 1;
  }
  for (const item of allInsightDates(insights)) {
    const target = byMonth.get(monthKey(item.date));
    if (target) target.insights += 1;
  }
  for (const item of allDevRecordDates(devRecords)) {
    const target = byMonth.get(monthKey(item.date));
    if (target) target.reflections += 1;
  }
  return months;
}

export function buildDayStreak(projects: Project[], insights: Insight[], devRecords: DevRecord[]) {
  const activeDays = new Set([
    ...allReflectionDates(projects).map((item) => dateKey(item.date)),
    ...allInsightDates(insights).map((item) => dateKey(item.date)),
    ...allDevRecordDates(devRecords).map((item) => dateKey(item.date)),
  ]);

  let streak = 0;
  const cursor = new Date();
  while (activeDays.has(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function buildRecentActivity(projects: Project[], insights: Insight[], devRecords: DevRecord[]) {
  return [
    ...allReflectionDates(projects).map((item) => ({
      date: item.date,
      project: item.project,
      text: item.text,
      icon: FileText,
      typeLabel: "Reflection",
    })),
    ...allInsightDates(insights).map((item) => ({
      date: item.date,
      project: item.blog,
      text: item.text,
      icon: BookOpen,
      typeLabel: "Insight",
    })),
    ...allDevRecordDates(devRecords).map((item) => ({
      date: item.date,
      project: "자유 개발 기록",
      text: item.title || item.text,
      icon: Lightbulb,
      typeLabel: "Dev Record",
    })),
    ...projects.map((project) => ({
      date: parseAppDate(project.createdAt),
      project: null,
      text: `Created project: ${project.name}`,
      icon: Folder,
      typeLabel: "Project",
    })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 3);
}
