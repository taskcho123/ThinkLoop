import React, { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Brain, BookOpen, Folder, BarChart2, Settings, Home,
  Sparkles, Lightbulb, Calendar, Rocket, Plus, ChevronRight,
  ArrowLeft, Flame, FileText, Activity, TrendingUp,
  ExternalLink, User, Target, Clock, Eye, EyeOff, Check,
  Mail, Lock, ArrowRight, Pencil, Trash2,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { hasFirebaseConfig } from "../services/firebase";
import { loadAppState, saveAppState } from "../services/appStateRepository";
import { logOut, signInWithEmail, signInWithGoogle, signUpWithEmail } from "../services/authService";

// ── Types ─────────────────────────────────────────────────────────────────
type Page = "home" | "projects" | "insight" | "insight-detail" | "dashboard" | "project-detail" | "write-reflection" | "settings";
type ProjectStatus = "Planning" | "Progress" | "Finished";

interface Reflection {
  id: string;
  date: string;
  aiDid: string;
  iDid: string;
  improvement: string;
  reflection: string;
  nextGoal: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  progress: number;
  latestReflection: string;
  createdAt: string;
  reflections: Reflection[];
}

interface Insight {
  id: string;
  blog: string;
  blogStyle: string;
  title: string;
  summary: string;
  reflection?: string;
  application: string;
  articleUrl?: string;
  date: string;
}

interface UserProfile {
  name: string;
  avatarId: string;
  role: string;
}

interface AppSnapshot {
  userProfile: UserProfile | null;
  projects: Project[];
  insights: Insight[];
  customBlogs: CustomBlog[];
}

const STORAGE_KEY = "thinkloop.app.v1";
const EMPTY_PROJECTS: Project[] = [];
const EMPTY_INSIGHTS: Insight[] = [];
const EMPTY_BLOGS: CustomBlog[] = [];

function todayLabel() {
  return new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function readSnapshot(): Partial<AppSnapshot> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── Static Data ───────────────────────────────────────────────────────────
const PROJECTS: Project[] = [
  {
    id: "1",
    name: "DevFlow API",
    description: "RESTful API for developer workflow automation with AI-powered suggestions",
    status: "Progress",
    progress: 68,
    latestReflection: "Completed auth middleware. Reviewed JWT logic and added proper error handling.",
    createdAt: "Mar 1, 2024",
    reflections: [
      {
        id: "r1",
        date: "Mar 15, 2024",
        aiDid: "Generated JWT middleware boilerplate and rate limiter configuration with Express",
        iDid: "Reviewed generated code, refactored token validation, added business-specific error handling",
        improvement: "Should define edge cases before prompting — correcting hallucinated API calls took 30 min",
        reflection: "AI excels at structure but is blind to business context. Constraints must come from me.",
        nextGoal: "Design role-based permission system and write integration tests",
      },
      {
        id: "r2",
        date: "Mar 14, 2024",
        aiDid: "Scaffolded Express router structure and generated initial CRUD endpoint handlers",
        iDid: "Designed database schema from scratch, wrote Prisma migrations, configured relations",
        improvement: "Schema design must precede scaffolding — reversed order caused significant rework",
        reflection: "Architecture decisions are mine alone. AI fills in repetitive implementation details.",
        nextGoal: "Complete auth middleware and write integration tests",
      },
    ],
  },
  {
    id: "2",
    name: "LoopBoard",
    description: "Real-time collaborative whiteboard with WebSocket sync and CRDT conflict resolution",
    status: "Planning",
    progress: 15,
    latestReflection: "Researching CRDT algorithms. Decided on Yjs over custom OT implementation.",
    createdAt: "Mar 10, 2024",
    reflections: [
      {
        id: "r3",
        date: "Mar 13, 2024",
        aiDid: "Explained CRDT concepts and provided operational transform examples in JavaScript",
        iDid: "Studied the algorithms independently, drew system diagrams, evaluated Yjs vs Automerge",
        improvement: "Deep understanding before prompting produced much better, more accurate responses",
        reflection: "My comprehension determines AI quality. Slow down. Read first. Then code.",
        nextGoal: "Set up WebSocket server with basic room management using Socket.io",
      },
    ],
  },
  {
    id: "3",
    name: "CodeLens CLI",
    description: "Terminal tool for analyzing code quality metrics, complexity scores, and automated reports",
    status: "Finished",
    progress: 100,
    latestReflection: "Published to npm. 200+ downloads in first week. All documentation complete.",
    createdAt: "Feb 1, 2024",
    reflections: [],
  },
];

const HEATMAP_COLORS = ["#EEF6F3", "#B8D9D2", "#8DBDAF", "#6BA898", "#5B8E7D"];

const STATUS_CONFIG: Record<ProjectStatus, { bg: string; text: string; dot: string; bar: string }> = {
  Planning: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400", bar: "bg-amber-400" },
  Progress: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-400", bar: "bg-emerald-500" },
  Finished: { bg: "bg-gray-100", text: "text-gray-500", dot: "bg-gray-400", bar: "bg-gray-400" },
};

// ── Dashboard Data ────────────────────────────────────────────────────────
function parseAppDate(value: string) {
  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) return direct;

  const korean = value.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
  if (korean) {
    return new Date(Number(korean[1]), Number(korean[2]) - 1, Number(korean[3]));
  }

  const monthDay = value.match(/(\d{1,2})월\s*(\d{1,2})일/);
  if (monthDay) {
    return new Date(new Date().getFullYear(), Number(monthDay[1]) - 1, Number(monthDay[2]));
  }

  return new Date();
}

function dateKey(date: Date) {
  return date.toISOString().split("T")[0];
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date) {
  return date.toLocaleString("en", { month: "short" });
}

function allReflectionDates(projects: Project[]) {
  return projects.flatMap((project) =>
    project.reflections.map((reflection) => ({
      date: parseAppDate(reflection.date),
      project: project.name,
      text: reflection.reflection || reflection.iDid || "회고를 작성했습니다.",
    })),
  );
}

function allInsightDates(insights: Insight[]) {
  return insights.map((insight) => ({
    date: parseAppDate(insight.date),
    blog: insight.blog,
    text: insight.title,
  }));
}

function buildHeatmap(projects: Project[], insights: Insight[]) {
  const counts = new Map<string, number>();
  for (const item of allReflectionDates(projects)) {
    const key = dateKey(item.date);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  for (const item of allInsightDates(insights)) {
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

function buildMonthlyData(projects: Project[], insights: Insight[]) {
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
  return months;
}

function buildDayStreak(projects: Project[], insights: Insight[]) {
  const activeDays = new Set([
    ...allReflectionDates(projects).map((item) => dateKey(item.date)),
    ...allInsightDates(insights).map((item) => dateKey(item.date)),
  ]);

  let streak = 0;
  const cursor = new Date();
  while (activeDays.has(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function buildRecentActivity(projects: Project[], insights: Insight[]) {
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
    ...projects.map((project) => ({
      date: parseAppDate(project.createdAt),
      project: null,
      text: `Created project: ${project.name}`,
      icon: Folder,
      typeLabel: "Project",
    })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 8);
}

// ── Utility Components ────────────────────────────────────────────────────
function StatusBadge({ status }: { status: ProjectStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {status}
    </span>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-7">
      <h2
        className="text-xl font-bold text-foreground mb-0.5"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {title}
      </h2>
      {sub && <p className="text-sm text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ── Abstract Illustration ─────────────────────────────────────────────────
function HeroIllustration() {
  return (
    <svg viewBox="0 0 240 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <circle cx="170" cy="70" r="90" stroke="white" strokeOpacity="0.08" strokeWidth="1" />
      <circle cx="170" cy="70" r="65" stroke="white" strokeOpacity="0.11" strokeWidth="1" />
      <circle cx="170" cy="70" r="40" stroke="white" strokeOpacity="0.15" strokeWidth="1" />
      <circle cx="170" cy="70" r="18" stroke="white" strokeOpacity="0.22" strokeWidth="1.5" />
      <circle cx="170" cy="70" r="6" fill="white" fillOpacity="0.28" />
      {/* Orbiting dots */}
      <circle cx="170" cy="-20" r="3.5" fill="white" fillOpacity="0.18" />
      <circle cx="260" cy="70" r="3" fill="white" fillOpacity="0.18" />
      <circle cx="98" cy="130" r="2.5" fill="white" fillOpacity="0.15" />
      <circle cx="215" cy="148" r="2" fill="white" fillOpacity="0.12" />
      {/* Connector lines */}
      <line x1="60" y1="150" x2="140" y2="80" stroke="white" strokeOpacity="0.07" strokeWidth="0.8" />
      <line x1="35" y1="90" x2="130" y2="70" stroke="white" strokeOpacity="0.07" strokeWidth="0.8" />
      <line x1="170" y1="70" x2="100" y2="170" stroke="white" strokeOpacity="0.07" strokeWidth="0.8" />
      <line x1="170" y1="52" x2="170" y2="-20" stroke="white" strokeOpacity="0.09" strokeWidth="0.8" />
      {/* Dot grid */}
      {[0, 1, 2, 3, 4].map((row) =>
        [0, 1, 2, 3].map((col) => (
          <circle
            key={`${row}-${col}`}
            cx={18 + col * 18}
            cy={115 + row * 18}
            r="1.5"
            fill="white"
            fillOpacity={col % 2 === 0 ? 0.15 : 0.09}
          />
        ))
      )}
    </svg>
  );
}

// ── Activity Heatmap ──────────────────────────────────────────────────────
function ActivityHeatmap({ data }: { data: { date: string; count: number }[] }) {
  const weeks: { date: string; count: number }[][] = [];
  for (let i = 0; i < data.length; i += 7) {
    weeks.push(data.slice(i, i + 7));
  }

  const monthStarts: Record<number, string> = {};
  let lastMonth = "";
  weeks.forEach((week, wi) => {
    for (const day of week) {
      if (day.date) {
        const m = new Date(day.date).toLocaleString("en", { month: "short" });
        if (m !== lastMonth) {
          monthStarts[wi] = m;
          lastMonth = m;
        }
        break;
      }
    }
  });

  return (
    <div className="overflow-x-auto scrollbar-hide">
      <div className="inline-flex gap-[3px]">
        <div className="flex flex-col gap-[3px] mr-1 pt-5">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={i} className="h-[11px] flex items-center">
              <span className="text-[9px] text-muted-foreground w-3 text-center leading-none">
                {i % 2 === 1 ? d : ""}
              </span>
            </div>
          ))}
        </div>
        <div>
          <div className="flex gap-[3px] mb-1 h-4 items-end">
            {weeks.map((_, wi) => (
              <div key={wi} className="w-[11px] flex-shrink-0">
                {monthStarts[wi] && (
                  <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                    {monthStarts[wi]}
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-[3px]">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((day, di) => (
                  <div
                    key={di}
                    className="w-[11px] h-[11px] rounded-[2px] transition-opacity hover:opacity-70 cursor-default"
                    style={{
                      backgroundColor: HEATMAP_COLORS[Math.min(day.count, 4)],
                    }}
                    title={day.date ? `${day.date}: ${day.count} reflections` : ""}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Notebook Textarea ─────────────────────────────────────────────────────
function NotebookArea({
  label,
  placeholder,
  icon: Icon,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  icon: React.ElementType;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-foreground">{label}</span>
        {value.length > 0 && (
          <span className="ml-auto text-[10px] text-muted-foreground font-mono">{value.length} chars</span>
        )}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={5}
        className="w-full resize-none bg-transparent text-sm text-foreground placeholder-muted-foreground/50 focus:outline-none leading-[24px]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(transparent, transparent 23px, #E5E7EB 23px, #E5E7EB 24px)",
          backgroundSize: "100% 24px",
          backgroundPositionY: "1px",
        }}
      />
    </div>
  );
}

// ── Recent insights mock data ─────────────────────────────────────────────
const RECENT_INSIGHTS = [
  {
    id: "i1",
    blog: "Toss Tech",
    blogStyle: "bg-[#0064FF] text-white",
    title: "마이크로프론트엔드 아키텍처 실전 적용기",
    summary: "Module Federation을 활용해 독립 배포 가능한 프론트엔드를 구성한 방법과 트레이드오프를 정리했다.",
    application: "프로젝트별 독립 배포 단위를 작게 유지하고 공통 UI는 버전 경계를 명확히 둔다.",
    date: "오늘 오전 11:32",
  },
  {
    id: "i2",
    blog: "Kakao Tech",
    blogStyle: "bg-[#FEE500] text-gray-900",
    title: "타입 안전한 API 설계 with TypeScript",
    summary: "Zod와 tRPC를 조합해 런타임 검증과 타입 추론을 동시에 확보하는 패턴을 소개한다.",
    application: "폼 입력과 서버 응답에 공통 스키마를 적용해 런타임 오류를 줄인다.",
    date: "어제 오후 3:14",
  },
] satisfies Insight[];

function withoutSeedData(state: Partial<AppSnapshot> | null) {
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
  };
}

// ── HOME ──────────────────────────────────────────────────────────────────
function HomePage({
  profile,
  projects,
  insights,
  onGoToProject,
  onGoToInsight,
  onSelectInsight,
}: {
  profile: UserProfile;
  projects: Project[];
  insights: Insight[];
  onGoToProject: (p: Project) => void;
  onGoToInsight: () => void;
  onSelectInsight: (insight: Insight) => void;
}) {
  const today = new Date("2024-03-17").toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  const inProgressProjects = projects.filter((p) => p.status === "Progress");
  const reflectionCount = projects.reduce((total, project) => total + project.reflections.length, 0);
  const dayStreak = buildDayStreak(projects, insights);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="p-8 max-w-6xl"
    >
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-5 items-start">
        <div className="min-w-0">
          {/* Hero greeting */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#4A7A6A] via-[#5B8E7D] to-[#6BA898] p-8 mb-6 shadow-md shadow-[#5B8E7D]/20">
            <div className="absolute inset-0 right-0 pointer-events-none select-none opacity-80">
              <HeroIllustration />
            </div>
            <div className="relative z-10 max-w-xs">
              <p
                className="text-[10px] font-medium text-white/40 mb-4 tracking-widest uppercase"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {today}
              </p>
              <h1
                className="text-[2.25rem] font-bold leading-tight mb-2 text-white"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {profile.name}님,
                <br />
                좋은 하루입니다.
              </h1>
              <p className="text-white/70 text-sm leading-relaxed mb-6">
                AI는 코드를 작성하지만,
                <br />
                서비스를 만드는 사람은 당신입니다.
              </p>
              <div className="flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-white/30" />
                <p className="text-[11px] text-white/35 italic tracking-wide">
                  Code with AI. Think like a Developer.
                </p>
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { icon: Flame, value: String(dayStreak), label: "연속 기록", color: "text-orange-500", bg: "bg-orange-50" },
              { icon: Folder, value: String(inProgressProjects.length), label: "진행 중인 프로젝트", color: "text-primary", bg: "bg-accent" },
              { icon: FileText, value: String(reflectionCount), label: "작성한 회고", color: "text-emerald-600", bg: "bg-emerald-50" },
            ].map(({ icon: Icon, value, label, color, bg }) => (
              <div key={label} className="bg-white rounded-xl p-4 border border-border shadow-sm text-center">
                <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mx-auto mb-2`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <p className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                  {value}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Reflection prompt */}
          <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-6 h-6 rounded-md bg-amber-50 flex items-center justify-center">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <span className="text-sm font-semibold text-foreground">오늘의 회고</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              AI가 코딩을 도울 수 있지만, 좋은 소프트웨어의 완성은 개발자의 깊은 고민에 있습니다.
              <br />
              오늘 진행한 프로젝트의 회고를 기록하며 한 단계 더 성장해 보세요.
            </p>
            {inProgressProjects.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border px-4 py-3 text-xs text-muted-foreground">
                진행 중인 프로젝트가 없습니다.
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
                {inProgressProjects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => onGoToProject(project)}
                    className="min-w-[190px] text-left rounded-xl border border-border bg-white p-3 shadow-sm hover:border-[#B8D9D2] hover:shadow-md transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-foreground line-clamp-1">{project.name}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {project.description}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="min-w-0 xl:sticky xl:top-8">
          {/* In-progress projects */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Rocket className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">진행 중인 프로젝트</span>
              </div>
              <button
                onClick={() => inProgressProjects[0] ? onGoToProject(inProgressProjects[0]) : onGoToInsight()}
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                전체 보기
              </button>
            </div>
            <div className="space-y-2.5">
              {inProgressProjects.length === 0 ? (
                <div className="bg-white rounded-xl border border-border p-4 shadow-sm text-sm text-muted-foreground">
                  진행 중인 프로젝트가 없습니다. Projects에서 새 프로젝트를 만들어보세요.
                </div>
              ) : inProgressProjects.map((project) => {
                const cfg = STATUS_CONFIG[project.status];
                return (
                  <button
                    key={project.id}
                    onClick={() => onGoToProject(project)}
                    className="w-full text-left bg-white rounded-xl border border-border p-4 shadow-sm hover:border-[#B8D9D2] hover:shadow-md transition-all duration-200 group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        {project.name}
                      </span>
                      <StatusBadge status={project.status} />
                    </div>
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-1 leading-relaxed">
                      {project.description}
                    </p>
                    <div className="flex items-center gap-3">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                        {STATUS_STEPS.find(s => s.value === project.status)?.label}
                      </span>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        회고 {project.reflections.length}개
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recent insights */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">최근 인사이트</span>
              </div>
              <button
                onClick={onGoToInsight}
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                인사이트 작성하기
              </button>
            </div>
            <div className="bg-white rounded-xl border border-border shadow-sm divide-y divide-border">
              {insights.slice(0, 3).map((insight) => (
                <div
                  key={insight.id}
                  onClick={() => onSelectInsight(insight)}
                  className="relative p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  {insight.articleUrl && (
                    <a
                      href={insight.articleUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(event) => event.stopPropagation()}
                      className="absolute right-3 top-3 w-7 h-7 rounded-full bg-white border border-border text-muted-foreground shadow-sm flex items-center justify-center hover:text-primary hover:border-[#B8D9D2] transition-colors"
                      title="게시글 열기"
                      aria-label={`${insight.title} 게시글 열기`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <div className="flex items-center gap-2 mb-1.5 pr-8">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${insight.blogStyle}`}>
                      {insight.blog}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{insight.date}</span>
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1 leading-snug">{insight.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{insight.summary}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </motion.div>
  );
}

// ── INSIGHT CONSTANTS ─────────────────────────────────────────────────────
const DEFAULT_BLOGS = [
  { id: "toss",  label: "Toss Tech",  url: "https://toss.tech/",       bg: "#0064FF", text: "#FFFFFF" },
  { id: "kakao", label: "Kakao Tech", url: "https://tech.kakao.com/",  bg: "#FEE500", text: "#111111" },
  { id: "naver", label: "Naver D2",   url: "https://d2.naver.com/home", bg: "#03C75A", text: "#FFFFFF" },
];

const BLOG_PALETTE = [
  { id: "indigo",  hex: "#6366F1", label: "Indigo"  },
  { id: "blue",    hex: "#3B82F6", label: "Blue"    },
  { id: "cyan",    hex: "#06B6D4", label: "Cyan"    },
  { id: "emerald", hex: "#10B981", label: "Emerald" },
  { id: "amber",   hex: "#F59E0B", label: "Amber"   },
  { id: "rose",    hex: "#F43F5E", label: "Rose"    },
  { id: "purple",  hex: "#A855F7", label: "Purple"  },
  { id: "slate",   hex: "#475569", label: "Slate"   },
];

const DEFAULT_BLOG_STYLES: Record<string, string> = {
  "Toss Tech": "bg-[#0064FF] text-white",
  "Kakao Tech": "bg-[#FEE500] text-gray-900",
  "Naver D2": "bg-[#03C75A] text-white",
};

interface CustomBlog {
  id: string;
  label: string;
  url: string;
  bg: string;
  text: string;
}

function isLight(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}

// ── INSIGHT ───────────────────────────────────────────────────────────────
function InsightPage({
  insights,
  customBlogs,
  onAddBlog,
  onSaveInsight,
  onSelectInsight,
}: {
  insights: Insight[];
  customBlogs: CustomBlog[];
  onAddBlog: (blog: CustomBlog) => void;
  onSaveInsight: (insight: Omit<Insight, "id" | "date" | "blogStyle">) => void;
  onSelectInsight: (insight: Insight) => void;
}) {
  const [activeBlog, setActiveBlog] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newColor, setNewColor] = useState(BLOG_PALETTE[0].hex);
  const [note, setNote] = useState({ title: "", articleUrl: "", summary: "", reflection: "", application: "" });

  const allBlogs = [
    ...DEFAULT_BLOGS,
    ...customBlogs,
  ];

  const activeBlogData = allBlogs.find((b) => b.id === activeBlog);

  const handleAdd = () => {
    if (!newLabel.trim() || !newUrl.trim()) return;
    const raw = newUrl.trim().startsWith("http") ? newUrl.trim() : `https://${newUrl.trim()}`;
    onAddBlog({
      id: makeId("blog"),
      label: newLabel.trim(),
      url: raw,
      bg: newColor,
      text: isLight(newColor) ? "#111111" : "#FFFFFF",
    });
    setNewLabel("");
    setNewUrl("");
    setNewColor(BLOG_PALETTE[0].hex);
    setShowAdd(false);
  };

  const activeStyle = "bg-[#5B8E7D] text-white";
  const canSaveInsight = note.title.trim() && note.summary.trim();
  const handleSaveInsight = () => {
    if (!canSaveInsight) return;
    const blog = activeBlogData ?? allBlogs[0];
    const articleUrl = note.articleUrl.trim();
    onSaveInsight({
      blog: blog.label,
      title: note.title.trim(),
      summary: note.summary.trim(),
      reflection: note.reflection.trim(),
      application: note.application.trim(),
      ...(articleUrl ? { articleUrl: articleUrl.startsWith("http") ? articleUrl : `https://${articleUrl}` } : {}),
    });
    setNote({ title: "", articleUrl: "", summary: "", reflection: "", application: "" });
    setActiveBlog(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="p-8 max-w-6xl"
    >
      <SectionHeader title="오늘의 인사이트" sub="아티클을 읽고 배운 것을 정리해보세요." />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-5 items-start">
        <div className="min-w-0">
          {/* Blog selector card */}
          <div className="bg-white rounded-lg border border-border p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Select a Tech Blog</span>
              </div>
              <span className="text-[11px] text-muted-foreground">{allBlogs.length}개 블로그</span>
            </div>

            {/* Scrollable horizontal list */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-0.5">
              {/* + button on the LEFT */}
              <button
                onClick={() => setShowAdd(true)}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-dashed border-border text-xs text-muted-foreground hover:border-primary hover:text-primary transition-all duration-150"
                title="블로그 추가"
              >
                <Plus className="w-3.5 h-3.5" />
                추가
              </button>

              {/* Separator */}
              <div className="h-5 w-px bg-border flex-shrink-0" />

              {/* Blog buttons */}
              {allBlogs.map((blog) => {
                const active = activeBlog === blog.id;
                return (
                  <button
                    key={blog.id}
                    onClick={() => setActiveBlog(active ? null : blog.id)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                      active ? "ring-2 ring-offset-1 ring-primary/30 scale-[1.03]" : "hover:opacity-90"
                    }`}
                    style={{ backgroundColor: blog.bg, color: blog.text }}
                  >
                    <ExternalLink className="w-3 h-3 opacity-60" />
                    {blog.label}
                  </button>
                );
              })}
            </div>

            {activeBlogData && (
              <div className="mt-3.5 flex items-center justify-between">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  <span className="font-medium text-foreground">{activeBlogData.label}</span>
                  을 읽고 있습니다 — 다 읽은 후 아래에 정리해보세요.
                </p>
                <a
                  href={activeBlogData.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-primary hover:underline flex items-center gap-0.5"
                >
                  열기 <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            )}
          </div>

          {/* Notebook areas */}
          <div className="space-y-3">
            <NotebookArea
              label="아티클 제목"
              placeholder="읽은 아티클 제목을 입력하세요..."
              icon={BookOpen}
              value={note.title}
              onChange={(value) => setNote((prev) => ({ ...prev, title: value }))}
            />
            <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <ExternalLink className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">게시글 링크</span>
                <span className="text-[10px] text-muted-foreground">선택</span>
              </div>
              <input
                type="url"
                value={note.articleUrl}
                onChange={(event) => setNote((prev) => ({ ...prev, articleUrl: event.target.value }))}
                placeholder="https://example.com/article"
                className="w-full px-3 py-2 bg-muted rounded-lg text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            <NotebookArea
              label="아티클 요약"
              placeholder="핵심 내용을 나만의 언어로 정리해보세요..."
              icon={FileText}
              value={note.summary}
              onChange={(value) => setNote((prev) => ({ ...prev, summary: value }))}
            />
            <NotebookArea
              label="느낀 점 & 회고"
              placeholder="놀랐던 점, 기존 생각과 달랐던 부분은?"
              icon={Lightbulb}
              value={note.reflection}
              onChange={(value) => setNote((prev) => ({ ...prev, reflection: value }))}
            />
            <NotebookArea
              label="내 프로젝트에 적용하기"
              placeholder="어떤 기술, 패턴, 아이디어를 실제로 써볼 수 있을까요?"
              icon={Rocket}
              value={note.application}
              onChange={(value) => setNote((prev) => ({ ...prev, application: value }))}
            />
          </div>

          <div className="mt-5 flex justify-end">
            <button
              onClick={handleSaveInsight}
              disabled={!canSaveInsight}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-[#4A7A6A] transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4" />
              인사이트 저장
            </button>
          </div>
        </div>

        <aside className="min-w-0 xl:sticky xl:top-8">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">인사이트 리스트</span>
            </div>
            <span className="text-[11px] text-muted-foreground">{insights.length}개</span>
          </div>
          <div className="bg-white rounded-xl border border-border shadow-sm divide-y divide-border max-h-none xl:max-h-[calc(100vh-10rem)] xl:overflow-y-auto scrollbar-hide">
            {insights.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">저장된 인사이트가 없습니다.</p>
            ) : (
              insights.map((insight) => (
                <div
                  key={insight.id}
                  onClick={() => onSelectInsight(insight)}
                  className="relative p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                >
                  {insight.articleUrl && (
                    <a
                      href={insight.articleUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(event) => event.stopPropagation()}
                      className="absolute right-3 top-3 w-7 h-7 rounded-full bg-white border border-border text-muted-foreground shadow-sm flex items-center justify-center hover:text-primary hover:border-[#B8D9D2] transition-colors"
                      title="게시글 열기"
                      aria-label={`${insight.title} 게시글 열기`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <div className="flex items-center gap-2 mb-1.5 pr-8">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${insight.blogStyle || activeStyle}`}>
                      {insight.blog}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{insight.date}</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground mb-1">{insight.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{insight.summary}</p>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>

      {/* Add blog modal */}
      {showAdd && (
        <div
          className="fixed inset-0 bg-black/10 backdrop-blur-[2px] flex items-center justify-center z-50"
          onClick={() => setShowAdd(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white rounded-xl border border-border shadow-xl p-6 w-full max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-foreground mb-0.5" style={{ fontFamily: "var(--font-display)" }}>
              블로그 추가
            </h3>
            <p className="text-xs text-muted-foreground mb-5">자주 읽는 기술 블로그를 등록하세요.</p>

            <div className="space-y-3 mb-5">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">블로그 이름</label>
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="예: Line Engineering"
                  className="w-full px-3 py-2 bg-muted rounded-lg text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">URL</label>
                <div className="relative">
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="url"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="https://engineering.linecorp.com"
                    className="w-full pl-9 pr-3 py-2 bg-muted rounded-lg text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-2 block">버튼 색상</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {BLOG_PALETTE.map((c) => (
                    <button
                      key={c.id}
                      title={c.label}
                      onClick={() => setNewColor(c.hex)}
                      className={`w-6 h-6 rounded-md transition-all duration-150 ${
                        newColor === c.hex ? "ring-2 ring-offset-1 ring-foreground/40 scale-110" : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
                  {/* Custom color input */}
                  <div className="relative">
                    <input
                      type="color"
                      value={newColor}
                      onChange={(e) => setNewColor(e.target.value)}
                      className="w-6 h-6 rounded-md cursor-pointer border border-border opacity-0 absolute inset-0"
                    />
                    <div
                      className="w-6 h-6 rounded-md border border-dashed border-border flex items-center justify-center pointer-events-none"
                      style={{ backgroundColor: !BLOG_PALETTE.find(p => p.hex === newColor) ? newColor : "transparent" }}
                    >
                      {BLOG_PALETTE.find(p => p.hex === newColor) && (
                        <Pencil className="w-3 h-3 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </div>
                {/* Preview */}
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">미리보기:</span>
                  <span
                    className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium"
                    style={{ backgroundColor: newColor, color: isLight(newColor) ? "#111111" : "#FFFFFF" }}
                  >
                    <ExternalLink className="w-3 h-3 opacity-60" />
                    {newLabel || "블로그 이름"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleAdd}
                disabled={!newLabel.trim() || !newUrl.trim()}
                className="flex-1 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-[#4A7A6A] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                추가하기
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

// ── INSIGHT DETAIL ────────────────────────────────────────────────────────
function InsightDetailPage({
  insight,
  onBack,
  onDelete,
}: {
  insight: Insight;
  onBack: () => void;
  onDelete: (insightId: string) => void;
}) {
  const [showDelete, setShowDelete] = useState(false);
  const sections = [
    { label: "아티클 요약", value: insight.summary, icon: FileText, tone: "bg-accent text-primary border-[#C5E0D9]" },
    { label: "느낀 점 & 회고", value: insight.reflection, icon: Lightbulb, tone: "bg-amber-50 text-amber-600 border-amber-100" },
    { label: "내 프로젝트에 적용하기", value: insight.application, icon: Rocket, tone: "bg-emerald-50 text-emerald-600 border-emerald-100" },
  ].filter((section) => section.value && section.value.trim());

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="p-8 max-w-2xl"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-150" />
            Insight
          </button>
          <button
            onClick={() => setShowDelete(true)}
            className="w-8 h-8 rounded-full bg-white border border-rose-100 text-rose-300 shadow-sm flex items-center justify-center hover:text-rose-400 hover:border-rose-200 hover:bg-rose-50 active:scale-95 transition-all"
            title="인사이트 삭제"
            aria-label={`${insight.title} 삭제`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        {insight.articleUrl && (
          <a
            href={insight.articleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-9 h-9 rounded-full bg-white border border-border text-muted-foreground shadow-sm flex items-center justify-center hover:text-primary hover:border-[#B8D9D2] transition-colors"
            title="게시글 열기"
            aria-label={`${insight.title} 게시글 열기`}
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>

      <div className="bg-white rounded-xl border border-border p-6 shadow-sm mb-5">
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${insight.blogStyle}`}>
            {insight.blog}
          </span>
          <span className="text-[11px] text-muted-foreground">{insight.date}</span>
        </div>
        <h2 className="text-xl font-bold text-foreground leading-snug" style={{ fontFamily: "var(--font-display)" }}>
          {insight.title}
        </h2>
      </div>

      <div className="space-y-3">
        {sections.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className={`bg-white rounded-xl border p-5 shadow-sm ${tone.split(" ")[2]}`}>
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold mb-3 ${tone.split(" ").slice(0, 2).join(" ")}`}>
              <Icon className="w-3.5 h-3.5" />
              {label}
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{value}</p>
          </div>
        ))}
      </div>

      {showDelete && (
        <div
          className="fixed inset-0 bg-black/15 backdrop-blur-[2px] flex items-center justify-center z-50"
          onClick={() => setShowDelete(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 border border-border"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="w-11 h-11 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mb-4">
              <Trash2 className="w-5 h-5 text-rose-300" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1" style={{ fontFamily: "var(--font-display)" }}>
              인사이트를 삭제할까요?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-5">
              <span className="font-medium text-foreground">{insight.title}</span> 기록이 삭제됩니다.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setShowDelete(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => onDelete(insight.id)}
                className="flex-1 py-2.5 bg-rose-500 text-white rounded-xl text-sm font-medium hover:bg-rose-600 transition-colors shadow-sm"
              >
                삭제하기
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

// ── PROJECTS ──────────────────────────────────────────────────────────────
function ProjectsPage({
  projects,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
}: {
  projects: Project[];
  onSelectProject: (p: Project) => void;
  onCreateProject: (project: Omit<Project, "id" | "createdAt" | "reflections" | "latestReflection" | "progress">) => void;
  onDeleteProject: (projectId: string) => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newStatus, setNewStatus] = useState<ProjectStatus>("Planning");
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  const handleCreate = () => {
    if (!newName.trim()) return;
    onCreateProject({
      name: newName.trim(),
      description: newDesc.trim() || "아직 설명이 없습니다.",
      status: newStatus,
    });
    setNewName("");
    setNewDesc("");
    setNewStatus("Planning");
    setShowAdd(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="p-8 max-w-4xl relative"
    >
      <div className="flex items-end justify-between mb-7">
        <div>
          <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
            Projects
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">{projects.length} workspaces</p>
        </div>
        <div className="flex items-center gap-1.5">
          {(["Planning", "Progress", "Finished"] as ProjectStatus[]).map((s) => (
            <span
              key={s}
              className={`text-[11px] px-2 py-0.5 rounded-full ${STATUS_CONFIG[s].bg} ${STATUS_CONFIG[s].text}`}
            >
              {s}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projects.map((project, i) => {
          return (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, duration: 0.22 }}
              className="text-left bg-white rounded-xl border border-border p-5 shadow-sm hover:shadow-md hover:border-[#B8D9D2] transition-all duration-200 group"
            >
              <button
                onClick={() => onSelectProject(project)}
                className="w-full text-left"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center">
                    <Folder className="w-4 h-4 text-primary" />
                  </div>
                  <StatusBadge status={project.status} />
                </div>
                <h3
                  className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors duration-150"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {project.name}
                </h3>
                <p className="text-xs text-muted-foreground mb-4 leading-relaxed line-clamp-2">
                  {project.description}
                </p>

                <p className="text-[11px] text-muted-foreground line-clamp-1 mb-3 italic leading-relaxed">
                  "{project.latestReflection}"
                </p>
              </button>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {project.createdAt}
                </div>
                <button
                  onClick={() => setProjectToDelete(project)}
                  className="w-8 h-8 rounded-full bg-white border border-rose-100 text-rose-300 shadow-sm flex items-center justify-center hover:text-rose-400 hover:border-rose-200 hover:bg-rose-50 active:scale-95 transition-all"
                  title="프로젝트 삭제"
                  aria-label={`${project.name} 삭제`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-8 right-8 w-12 h-12 bg-primary text-white rounded-full shadow-lg shadow-[#5B8E7D]/25 flex items-center justify-center hover:bg-[#4A7A6A] hover:scale-105 hover:shadow-[#5B8E7D]/40 active:scale-95 transition-all duration-200"
        title="New project"
      >
        <Plus className="w-5 h-5" />
      </button>

      {/* Add modal */}
      {showAdd && (
        <div
          className="fixed inset-0 bg-black/15 backdrop-blur-[2px] flex items-center justify-center z-50"
          onClick={() => setShowAdd(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4 border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              className="text-lg font-bold text-foreground mb-0.5"
              style={{ fontFamily: "var(--font-display)" }}
            >
              New Project
            </h3>
            <p className="text-sm text-muted-foreground mb-5">Start a new reflection workspace.</p>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Project name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-muted rounded-lg text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
              <textarea
                placeholder="Short description..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-muted rounded-lg text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none h-20 transition-all"
              />
              <div className="relative">
                <select
                  value={newStatus}
                  onChange={(event) => setNewStatus(event.target.value as ProjectStatus)}
                  className="w-full px-3.5 py-2.5 bg-muted rounded-lg text-sm border border-border focus:outline-none appearance-none cursor-pointer"
                >
                  <option>Planning</option>
                  <option>Progress</option>
                  <option>Finished</option>
                </select>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
              </div>
            </div>
            <div className="flex gap-2.5 mt-5">
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-[#4A7A6A] transition-colors shadow-sm"
              >
                Create Project
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {projectToDelete && (
        <div
          className="fixed inset-0 bg-black/15 backdrop-blur-[2px] flex items-center justify-center z-50"
          onClick={() => setProjectToDelete(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-11 h-11 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mb-4">
              <Trash2 className="w-5 h-5 text-rose-300" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1" style={{ fontFamily: "var(--font-display)" }}>
              프로젝트를 삭제할까요?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-5">
              <span className="font-medium text-foreground">{projectToDelete.name}</span> 프로젝트와 작성된 회고가 함께 삭제됩니다.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setProjectToDelete(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => {
                  onDeleteProject(projectToDelete.id);
                  setProjectToDelete(null);
                }}
                className="flex-1 py-2.5 bg-rose-500 text-white rounded-xl text-sm font-medium hover:bg-rose-600 transition-colors shadow-sm"
              >
                삭제하기
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

// ── STATUS SWITCHER ───────────────────────────────────────────────────────
const STATUS_STEPS: { value: ProjectStatus; label: string; icon: React.ElementType }[] = [
  { value: "Planning", label: "기획중", icon: Lightbulb },
  { value: "Progress", label: "진행중", icon: Rocket },
  { value: "Finished", label: "완료", icon: Target },
];

function StatusSwitcher({
  status,
  onChange,
}: {
  status: ProjectStatus;
  onChange: (s: ProjectStatus) => void;
}) {
  return (
    <div className="flex gap-1 p-1 bg-muted rounded-xl">
      {STATUS_STEPS.map(({ value, label, icon: Icon }) => {
        const active = status === value;
        const cfg = STATUS_CONFIG[value];
        return (
          <button
            key={value}
            onClick={() => onChange(value)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
              active
                ? `bg-white shadow-sm ${cfg.text} border border-border`
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className={`w-3 h-3 ${active ? cfg.text : ""}`} />
            {label}
            {active && <span className={`w-1.5 h-1.5 rounded-full ml-0.5 ${cfg.dot}`} />}
          </button>
        );
      })}
    </div>
  );
}

// ── PROJECT DETAIL ────────────────────────────────────────────────────────
function ProjectDetailPage({
  project,
  onBack,
  onStatusChange,
  onWriteReflection,
  onDeleteReflection,
}: {
  project: Project;
  onBack: () => void;
  onStatusChange: (id: string, status: ProjectStatus) => void;
  onWriteReflection: (project: Project) => void;
  onDeleteReflection: (projectId: string, reflectionId: string) => void;
}) {
  const [reflectionToDelete, setReflectionToDelete] = useState<Reflection | null>(null);
  const reflectionFields = [
    { key: "aiDid", label: "AI가 한 일", icon: Sparkles, color: "bg-[#EEF6F3] border-[#C5E0D9] text-[#5B8E7D]" },
    { key: "iDid", label: "내가 한 일", icon: User, color: "bg-emerald-50 border-emerald-100 text-emerald-600" },
    { key: "improvement", label: "개선할 점", icon: TrendingUp, color: "bg-amber-50 border-amber-100 text-amber-600" },
    { key: "reflection", label: "오늘의 회고", icon: Lightbulb, color: "bg-purple-50 border-purple-100 text-purple-600" },
    { key: "nextGoal", label: "다음 목표", icon: Target, color: "bg-gray-50 border-gray-200 text-gray-500" },
  ] as const;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="p-8 max-w-2xl"
    >
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-150" />
        Projects
      </button>

      {/* Project header card */}
      <div className="bg-white rounded-xl border border-border p-6 shadow-sm mb-6">
        <div className="mb-4">
          <h2
            className="text-xl font-bold text-foreground mb-1 leading-snug"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {project.name}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{project.description}</p>
        </div>

        {/* Status switcher */}
        <div className="mb-4">
          <p className="text-[11px] text-muted-foreground mb-2 font-medium">단계 변경</p>
          <StatusSwitcher
            status={project.status}
            onChange={(s) => onStatusChange(project.id, s)}
          />
        </div>

        <div className="flex items-center gap-6 pt-4 border-t border-border">
          <div>
            <p className="text-[11px] text-muted-foreground mb-0.5">작성한 회고</p>
            <p className="text-sm font-bold text-foreground">{project.reflections.length}개</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground mb-0.5">시작일</p>
            <p className="text-sm font-bold text-foreground">{project.createdAt}</p>
          </div>
        </div>
      </div>

      {/* Write button */}
      <button
        onClick={() => onWriteReflection(project)}
        className="w-full mb-6 flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-xl text-sm font-medium hover:bg-[#4A7A6A] active:bg-[#3D6459] transition-colors shadow-sm shadow-[#5B8E7D]/20"
      >
        <Plus className="w-4 h-4" />
        오늘의 회고 작성하기
      </button>

      {/* Timeline */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">회고 기록</h3>
        <span className="text-[11px] text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>
          {project.reflections.length}개
        </span>
      </div>

      {project.reflections.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="w-8 h-8 mx-auto mb-3 opacity-20" />
          <p className="text-sm">아직 작성된 회고가 없습니다.</p>
          <p className="text-xs mt-1 opacity-60">위 버튼을 눌러 오늘의 첫 회고를 작성해보세요.</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-[15px] top-0 bottom-0 w-px bg-border" />
          <div className="space-y-4">
            {project.reflections.map((ref, i) => (
              <motion.div
                key={ref.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08, duration: 0.22 }}
                className="relative pl-10"
              >
                <div className="absolute left-[9px] top-[18px] w-[13px] h-[13px] rounded-full bg-white border-2 border-primary shadow-sm" />
                <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                        {ref.date}
                      </span>
                    </div>
                    <button
                      onClick={() => setReflectionToDelete(ref)}
                      className="w-8 h-8 rounded-full bg-white border border-rose-100 text-rose-300 shadow-sm flex items-center justify-center hover:text-rose-400 hover:border-rose-200 hover:bg-rose-50 active:scale-95 transition-all"
                      title="회고 삭제"
                      aria-label={`${ref.date} 회고 삭제`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-2.5">
                    {reflectionFields.map(({ key, label, icon: Icon, color }) => {
                      const [bg, border, textColor] = color.split(" ");
                      return (
                        <div key={key} className={`rounded-lg border p-3 ${bg} ${border}`}>
                          <div className={`flex items-center gap-1.5 mb-1 ${textColor}`}>
                            <Icon className="w-3 h-3" />
                            <span className="text-[11px] font-semibold">{label}</span>
                          </div>
                          <p className="text-xs text-foreground/75 leading-relaxed">{ref[key]}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {reflectionToDelete && (
        <div
          className="fixed inset-0 bg-black/15 backdrop-blur-[2px] flex items-center justify-center z-50"
          onClick={() => setReflectionToDelete(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 border border-border"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="w-11 h-11 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mb-4">
              <Trash2 className="w-5 h-5 text-rose-300" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1" style={{ fontFamily: "var(--font-display)" }}>
              회고를 삭제할까요?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-5">
              <span className="font-medium text-foreground">{reflectionToDelete.date}</span>에 작성한 회고가 삭제됩니다.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setReflectionToDelete(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => {
                  onDeleteReflection(project.id, reflectionToDelete.id);
                  setReflectionToDelete(null);
                }}
                className="flex-1 py-2.5 bg-rose-500 text-white rounded-xl text-sm font-medium hover:bg-rose-600 transition-colors shadow-sm"
              >
                삭제하기
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

// ── WRITE REFLECTION ──────────────────────────────────────────────────────
function WriteReflectionPage({
  project,
  onBack,
  onSave,
}: {
  project: Project;
  onBack: () => void;
  onSave: (reflection: Omit<Reflection, "id" | "date">) => void;
}) {
  const today = new Date("2024-03-17").toLocaleDateString("ko-KR", {
    year: "numeric", month: "long", day: "numeric", weekday: "long",
  });

  const [fields, setFields] = useState({
    aiDid: "", iDid: "", improvement: "", reflection: "", nextGoal: "",
  });

  const set = (key: keyof typeof fields) => (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    setFields((f) => ({ ...f, [key]: e.target.value }));

  const isEmpty = Object.values(fields).every((v) => v.trim() === "");

  const sections = [
    { key: "aiDid" as const, label: "AI가 한 일", sub: "오늘 AI에게 맡긴 작업을 구체적으로 적어보세요.", icon: Sparkles, accent: "border-[#C5E0D9] focus-within:border-[#5B8E7D]", tag: "bg-[#EEF6F3] text-[#5B8E7D]" },
    { key: "iDid" as const, label: "내가 한 일", sub: "AI의 도움 없이 직접 결정하고 실행한 것들.", icon: User, accent: "border-emerald-200 focus-within:border-emerald-400", tag: "bg-emerald-50 text-emerald-600" },
    { key: "improvement" as const, label: "개선할 점", sub: "더 잘할 수 있었던 것, 다음엔 다르게 할 것.", icon: TrendingUp, accent: "border-amber-200 focus-within:border-amber-400", tag: "bg-amber-50 text-amber-600" },
    { key: "reflection" as const, label: "오늘의 회고", sub: "AI와 함께 일하면서 느낀 점, 깨달은 것.", icon: Lightbulb, accent: "border-purple-200 focus-within:border-purple-400", tag: "bg-purple-50 text-purple-600" },
    { key: "nextGoal" as const, label: "다음 목표", sub: "내일 또는 다음에 집중할 구체적인 목표.", icon: Target, accent: "border-gray-200 focus-within:border-gray-400", tag: "bg-gray-100 text-gray-600" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="p-8 max-w-2xl"
    >
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-150" />
        {project.name}
      </button>

      {/* Header */}
      <div className="mb-7">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_CONFIG[project.status].bg} ${STATUS_CONFIG[project.status].text}`}>
            {STATUS_STEPS.find(s => s.value === project.status)?.label}
          </span>
          <span className="text-[11px] text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>{today}</span>
        </div>
        <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
          오늘의 회고
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          AI에게 다시 묻기 전에, 오늘 하루를 10분만 정리해보세요.
        </p>
      </div>

      {/* Fields */}
      <div className="space-y-4">
        {sections.map(({ key, label, sub, icon: Icon, accent, tag }) => (
          <div
            key={key}
            className={`bg-white rounded-xl border-2 ${accent} p-5 shadow-sm transition-colors duration-200`}
          >
            <div className="flex items-start gap-3 mb-3">
              <div className={`w-7 h-7 rounded-lg ${tag} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground leading-none mb-0.5">{label}</p>
                <p className="text-[11px] text-muted-foreground">{sub}</p>
              </div>
              {fields[key].length > 0 && (
                <span className="ml-auto text-[10px] text-muted-foreground font-mono flex-shrink-0">
                  {fields[key].length}자
                </span>
              )}
            </div>
            <textarea
              value={fields[key]}
              onChange={set(key)}
              placeholder="여기에 작성하세요..."
              rows={3}
              className="w-full resize-none bg-transparent text-sm text-foreground placeholder-muted-foreground/40 focus:outline-none leading-relaxed"
            />
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 mt-6">
        <button
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
        >
          취소
        </button>
        <button
          onClick={() => { onSave(fields); onBack(); }}
          disabled={isEmpty}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-[#4A7A6A] transition-colors shadow-sm shadow-[#5B8E7D]/20 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Sparkles className="w-4 h-4" />
          회고 저장하기
        </button>
      </div>
    </motion.div>
  );
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────
function DashboardPage({ projects, insights }: { projects: Project[]; insights: Insight[] }) {
  const reflectionCount = projects.reduce((total, project) => total + project.reflections.length, 0);
  const heatmapData = buildHeatmap(projects, insights);
  const monthlyData = buildMonthlyData(projects, insights);
  const dayStreak = buildDayStreak(projects, insights);
  const recentActivity = buildRecentActivity(projects, insights);
  const stats = [
    { label: "Day Streak", value: String(dayStreak), icon: Flame, color: "text-orange-500", bg: "bg-orange-50" },
    { label: "Projects", value: String(projects.length), icon: Folder, color: "text-primary", bg: "bg-accent" },
    { label: "Insights", value: String(insights.length), icon: BookOpen, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Reflections", value: String(reflectionCount), icon: FileText, color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="p-8 max-w-4xl"
    >
      <SectionHeader title="Dashboard" sub="Your reflection journey at a glance." />

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-5">
        {stats.map(({ label, value, icon: Icon, color, bg }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.2 }}
            className="bg-white rounded-xl p-4 border border-border shadow-sm"
          >
            <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-3`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p
              className="text-2xl font-bold text-foreground"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {value}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
          </motion.div>
        ))}
      </div>

      {/* Heatmap */}
      <div className="bg-white rounded-xl border border-border p-5 shadow-sm mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Activity</span>
            <span className="text-xs text-muted-foreground">— last 12 months</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground">Less</span>
            {HEATMAP_COLORS.map((c) => (
              <div key={c} className="w-2.5 h-2.5 rounded-[2px]" style={{ backgroundColor: c }} />
            ))}
            <span className="text-[10px] text-muted-foreground">More</span>
          </div>
        </div>
        <ActivityHeatmap data={heatmapData} />
      </div>

      {/* Monthly chart + Recent activity */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-4">
        {/* Chart */}
        <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Monthly Activity</span>
          </div>
          <div className="flex items-center gap-4 mb-4">
            {[
              { label: "Reflections", color: "#5B8E7D" },
              { label: "Insights", color: "#8DBDAF" },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[11px] text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={monthlyData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <defs>
                <linearGradient id="tl-refGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5B8E7D" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#5B8E7D" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="tl-insGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8DBDAF" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#8DBDAF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fill: "#6B7280", fontFamily: "var(--font-mono)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#6B7280", fontFamily: "var(--font-mono)" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "white",
                  border: "1px solid #E5E7EB",
                  borderRadius: 8,
                  fontSize: 11,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
                cursor={{ stroke: "#E5E7EB", strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey="reflections"
                stroke="#5B8E7D"
                strokeWidth={1.5}
                fill="url(#tl-refGrad)"
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="insights"
                stroke="#8DBDAF"
                strokeWidth={1.5}
                fill="url(#tl-insGrad)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Recent</span>
          </div>
          <div className="space-y-0">
            {recentActivity.length === 0 ? (
              <div className="py-10 text-center">
                <Clock className="w-7 h-7 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">아직 활동 기록이 없습니다.</p>
              </div>
            ) : recentActivity.map((item, i) => {
              const ItemIcon = item.icon;
              return (
                <div key={i} className="flex items-start gap-2.5 py-2.5 border-b border-border last:border-0">
                  <div className="w-6 h-6 rounded-md bg-accent flex items-center justify-center flex-shrink-0 mt-0.5">
                    <ItemIcon className="w-3 h-3 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {item.project && (
                      <span className="text-[10px] font-semibold text-primary block mb-0.5">
                        {item.project}
                      </span>
                    )}
                    <span className="text-[11px] text-foreground leading-relaxed block">
                      {item.text}
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-0.5 block">
                      {item.typeLabel} · {item.date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── SETTINGS ──────────────────────────────────────────────────────────────
function SettingsPage({
  profile,
  avatar,
  onUpdateProfile,
  onLogout,
}: {
  profile: UserProfile;
  avatar: typeof AVATAR_OPTIONS[number];
  onUpdateProfile: (profile: UserProfile) => void;
  onLogout: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(profile);

  useEffect(() => setDraft(profile), [profile]);

  const save = () => {
    if (!draft.name.trim() || !draft.role.trim()) return;
    onUpdateProfile({ ...draft, name: draft.name.trim() });
    setEditing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="p-8 max-w-xl"
    >
      <SectionHeader title="Settings" sub="계정과 환경설정을 관리합니다." />

      {/* Profile card */}
      <div className="bg-white rounded-xl border border-border p-5 shadow-sm mb-4">
        <div className="flex items-center gap-4 mb-5">
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${avatar.gradient} flex items-center justify-center text-2xl shadow-sm flex-shrink-0`}>
            {avatar.emoji}
          </div>
          <div>
            <p className="font-semibold text-foreground text-base" style={{ fontFamily: "var(--font-display)" }}>
              {profile.name}
            </p>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-accent text-primary">
              {profile.role}
            </span>
          </div>
          <button
            onClick={() => setEditing((value) => !value)}
            className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded-lg px-3 py-1.5"
          >
            <Pencil className="w-3 h-3" />
            {editing ? "닫기" : "편집"}
          </button>
        </div>
        {editing ? (
          <div className="space-y-3">
            <input
              value={draft.name}
              onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
              className="w-full px-3 py-2 bg-muted rounded-lg text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="이름"
            />
            <select
              value={draft.role}
              onChange={(event) => setDraft((prev) => ({ ...prev, role: event.target.value }))}
              className="w-full px-3 py-2 bg-muted rounded-lg text-sm border border-border focus:outline-none"
            >
              {ROLE_OPTIONS.map((role) => <option key={role}>{role}</option>)}
            </select>
            <div className="grid grid-cols-9 gap-1.5">
              {AVATAR_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setDraft((prev) => ({ ...prev, avatarId: option.id }))}
                  className={`w-8 h-8 rounded-lg bg-gradient-to-br ${option.gradient} flex items-center justify-center text-sm transition-all ${
                    draft.avatarId === option.id ? "ring-2 ring-primary ring-offset-1" : "opacity-70 hover:opacity-100"
                  }`}
                >
                  {option.emoji}
                </button>
              ))}
            </div>
            <button
              onClick={save}
              className="w-full py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-[#4A7A6A] transition-colors"
            >
              저장
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {[
              { label: "이름", value: profile.name },
              { label: "역할", value: profile.role },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-2 border-t border-border first:border-0">
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className="text-xs font-medium text-foreground">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Account actions */}
      <div className="bg-white rounded-xl border border-border p-4 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">계정</p>
          <p className="text-sm font-medium text-foreground">현재 계정에서 로그아웃합니다.</p>
        </div>
        <button
          onClick={onLogout}
          className="px-3.5 py-2 rounded-lg text-xs font-medium text-rose-500 bg-white border border-rose-100 hover:bg-rose-50 hover:border-rose-200 transition-colors"
        >
          로그아웃
        </button>
      </div>
    </motion.div>
  );
}

// ── SIDEBAR ───────────────────────────────────────────────────────────────
function Sidebar({
  activePage,
  onNavigate,
  profile,
}: {
  activePage: Page;
  onNavigate: (p: Page) => void;
  profile: UserProfile;
}) {
  const topItems = [
    { id: "home" as Page, label: "Home", icon: Home },
    { id: "projects" as Page, label: "Projects", icon: Folder },
    { id: "insight" as Page, label: "Insight", icon: BookOpen },
    { id: "dashboard" as Page, label: "Dashboard", icon: BarChart2 },
  ];

  const isActive = (id: Page) =>
    activePage === id ||
    (activePage === "project-detail" && id === "projects") ||
    (activePage === "insight-detail" && id === "insight");

  return (
    <aside className="w-52 h-screen flex flex-col bg-white border-r border-border flex-shrink-0">
      {/* Logo */}
      <div className="px-4 py-5 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-sm shadow-[#5B8E7D]/30">
          <Brain className="w-4 h-4 text-white" />
        </div>
        <span
          className="font-bold text-foreground text-sm tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          ThinkLoop
        </span>
      </div>

      {/* Nav label */}
      <div className="px-4 mb-1">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
          Workspace
        </p>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2.5 space-y-0.5">
        {topItems.map(({ id, label, icon: Icon }) => {
          const active = isActive(id);
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all duration-150 ${
                active
                  ? "bg-accent text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{label}</span>
              {active && <span className="ml-auto w-1 h-1 rounded-full bg-primary/60" />}
            </button>
          );
        })}

        {/* Divider */}
        <div className="pt-3 pb-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-2.5">
            Account
          </p>
        </div>

        <button
          onClick={() => onNavigate("settings")}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all duration-150 ${
            activePage === "settings"
              ? "bg-accent text-primary font-medium"
              : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
          }`}
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          Settings
          {activePage === "settings" && <span className="ml-auto w-1 h-1 rounded-full bg-primary/60" />}
        </button>
      </nav>

      {/* Profile */}
      <div className="p-2.5 border-t border-border">
        <button
          onClick={() => onNavigate("settings")}
          className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-muted transition-colors"
        >
          {(() => {
            const av = AVATAR_OPTIONS.find(a => a.id === profile.avatarId) ?? AVATAR_OPTIONS[0];
            return (
              <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${av.gradient} flex items-center justify-center flex-shrink-0 text-sm`}>
                {av.emoji}
              </div>
            );
          })()}
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs font-semibold text-foreground truncate">{profile.name}</p>
            <p className="text-[10px] text-muted-foreground truncate">{profile.role}</p>
          </div>
        </button>
      </div>
    </aside>
  );
}

// ── AUTH CONSTANTS ────────────────────────────────────────────────────────
const AVATAR_OPTIONS = [
  { id: "1", gradient: "from-[#6BA898] to-[#4A7A6A]", emoji: "💻" },
  { id: "2", gradient: "from-emerald-400 to-emerald-600", emoji: "🚀" },
  { id: "3", gradient: "from-amber-400 to-amber-600", emoji: "⚡" },
  { id: "4", gradient: "from-rose-400 to-rose-600", emoji: "🔥" },
  { id: "5", gradient: "from-purple-400 to-purple-600", emoji: "🎯" },
  { id: "6", gradient: "from-cyan-400 to-cyan-600", emoji: "🌊" },
  { id: "7", gradient: "from-pink-400 to-pink-600", emoji: "💡" },
  { id: "8", gradient: "from-orange-400 to-orange-600", emoji: "🛠️" },
  { id: "9", gradient: "from-teal-400 to-teal-600", emoji: "🧠" },
];

const ROLE_OPTIONS = [
  "프론트엔드 개발자",
  "백엔드 개발자",
  "풀스택 개발자",
  "모바일 개발자",
  "DevOps / SRE",
  "데이터 엔지니어",
  "AI / ML 엔지니어",
  "프로덕트 매니저",
  "기타",
];

// ── AUTH LEFT PANEL ───────────────────────────────────────────────────────
function AuthLeftPanel() {
  return (
    <div className="hidden lg:flex flex-col w-[440px] flex-shrink-0 bg-gradient-to-br from-[#4A7A6A] via-[#5B8E7D] to-[#6BA898] p-10 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <svg viewBox="0 0 440 800" fill="none" className="w-full h-full opacity-20">
          <circle cx="350" cy="120" r="200" stroke="white" strokeWidth="1" />
          <circle cx="350" cy="120" r="140" stroke="white" strokeWidth="1" />
          <circle cx="350" cy="120" r="80" stroke="white" strokeWidth="1.5" />
          <circle cx="350" cy="120" r="30" fill="white" fillOpacity="0.15" />
          <circle cx="80" cy="600" r="160" stroke="white" strokeWidth="0.8" />
          <circle cx="80" cy="600" r="90" stroke="white" strokeWidth="0.8" />
          {[0,1,2,3,4].map(r => [0,1,2,3,4,5].map(c => (
            <circle key={`${r}-${c}`} cx={30 + c * 60} cy={280 + r * 60}
              r="2" fill="white" fillOpacity={0.12} />
          )))}
        </svg>
      </div>

      {/* Logo */}
      <div className="relative flex items-center gap-2.5 mb-auto">
        <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-white text-base" style={{ fontFamily: "var(--font-display)" }}>
          ThinkLoop
        </span>
      </div>

      {/* Center copy */}
      <div className="relative my-auto">
        <p className="text-white/50 text-xs font-medium tracking-widest uppercase mb-4"
          style={{ fontFamily: "var(--font-mono)" }}>
          Developer Reflection Workspace
        </p>
        <h2 className="text-3xl font-bold text-white leading-tight mb-5"
          style={{ fontFamily: "var(--font-display)" }}>
          AI를 사용하되,<br />생각하는 힘을<br />잃지 마세요.
        </h2>
        <p className="text-white/65 text-sm leading-relaxed mb-8">
          하루 10분, 코드를 짜기 전에 회고합니다.<br />
          AI에게 맡기기 전에 스스로 생각합니다.
        </p>

        {/* Feature list */}
        <div className="space-y-3">
          {[
            "매일 회고로 AI 의존도 줄이기",
            "테크 블로그 인사이트 정리",
            "프로젝트별 성장 타임라인",
          ].map((item) => (
            <div key={item} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 text-white" />
              </div>
              <span className="text-white/75 text-sm">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom quote */}
      <div className="relative mt-auto pt-6 border-t border-white/15">
        <p className="text-white/40 text-[11px] italic leading-relaxed">
          "Code with AI. Think like a Developer."
        </p>
      </div>
    </div>
  );
}

// ── PASSWORD INPUT ────────────────────────────────────────────────────────
function PasswordInput({
  value, onChange, placeholder,
}: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Lock className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "비밀번호"}
        className="w-full pl-10 pr-10 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

// ── GOOGLE BUTTON ─────────────────────────────────────────────────────────
function GoogleButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-center gap-3 py-2.5 bg-white border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted/50 transition-colors shadow-sm"
    >
      <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
      {label}
    </button>
  );
}

// ── LOGIN FORM ────────────────────────────────────────────────────────────
function LoginForm({
  onLogin,
  onGoogle,
  onGoSignup,
}: {
  onLogin: (email: string, password: string) => Promise<void>;
  onGoogle: () => Promise<void>;
  onGoSignup: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setError("");
    setSubmitting(true);
    try {
      await onLogin(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-sm"
    >
      {/* Mobile logo */}
      <div className="flex items-center gap-2 mb-8 lg:hidden">
        <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
          <Brain className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-foreground text-sm" style={{ fontFamily: "var(--font-display)" }}>
          ThinkLoop
        </span>
      </div>

      <h1 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: "var(--font-display)" }}>
        다시 돌아오셨군요 👋
      </h1>
      <p className="text-sm text-muted-foreground mb-7">오늘도 회고로 하루를 시작해보세요.</p>

      <GoogleButton label="Google로 계속하기" onClick={onGoogle} />

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">또는 이메일로</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Mail className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일"
            className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
        <PasswordInput value={password} onChange={setPassword} />
      </div>

      <button className="text-xs text-primary hover:underline mt-2 block ml-auto">
        비밀번호를 잊으셨나요?
      </button>

      <button
        onClick={submit}
        disabled={submitting || !email.trim() || !password}
        className="w-full mt-5 py-2.5 bg-primary hover:bg-[#4A7A6A] text-white rounded-xl text-sm font-medium transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {submitting ? "로그인 중..." : "로그인"}
        <ArrowRight className="w-4 h-4" />
      </button>
      {error && <p className="text-xs text-rose-500 mt-3 text-center">{error}</p>}

      <p className="text-center text-sm text-muted-foreground mt-6">
        계정이 없으신가요?{" "}
        <button onClick={onGoSignup} className="text-primary font-medium hover:underline">
          회원가입
        </button>
      </p>
    </motion.div>
  );
}

// ── SIGNUP FORM ───────────────────────────────────────────────────────────
function SignupForm({
  onLogin,
  onGoogle,
  onGoLogin,
}: {
  onLogin: (email: string, password: string, name: string, avatar: string, role: string) => Promise<void>;
  onGoogle: () => Promise<void>;
  onGoLogin: () => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [name, setName] = useState("");
  const [avatarId, setAvatarId] = useState("1");
  const [role, setRole] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const step1Valid = email.trim() && password.length >= 6 && password === confirm;
  const step2Valid = name.trim() && role;

  const selectedAvatar = AVATAR_OPTIONS.find((a) => a.id === avatarId)!;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-sm"
    >
      {/* Mobile logo */}
      <div className="flex items-center gap-2 mb-8 lg:hidden">
        <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
          <Brain className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-foreground text-sm" style={{ fontFamily: "var(--font-display)" }}>ThinkLoop</span>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-7">
        {[1, 2].map((s) => (
          <React.Fragment key={s}>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
              step === s ? "bg-primary text-white" : step > s ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
            }`}>
              {step > s ? <Check className="w-3 h-3" /> : <span>{s}</span>}
              {s === 1 ? "계정 만들기" : "프로필 설정"}
            </div>
            {s < 2 && <div className="flex-1 h-px bg-border" />}
          </React.Fragment>
        ))}
      </div>

      {step === 1 && (
        <motion.div
          key="step1"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
        >
          <h1 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: "var(--font-display)" }}>
            시작해볼까요?
          </h1>
          <p className="text-sm text-muted-foreground mb-6">무료로 회원가입하고 첫 회고를 작성해보세요.</p>

          <GoogleButton label="Google로 가입하기" onClick={onGoogle} />

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">또는 이메일로</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="space-y-3">
            <div className="relative">
              <Mail className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일"
                className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            <PasswordInput value={password} onChange={setPassword} placeholder="비밀번호 (6자 이상)" />
            <PasswordInput value={confirm} onChange={setConfirm} placeholder="비밀번호 확인" />
            {confirm && password !== confirm && (
              <p className="text-xs text-rose-500">비밀번호가 일치하지 않습니다.</p>
            )}
          </div>

          <button
            onClick={() => step1Valid && setStep(2)}
            disabled={!step1Valid}
            className="w-full mt-5 py-2.5 bg-primary hover:bg-[#4A7A6A] text-white rounded-xl text-sm font-medium transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            다음 단계
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-center text-sm text-muted-foreground mt-6">
            이미 계정이 있으신가요?{" "}
            <button onClick={onGoLogin} className="text-primary font-medium hover:underline">로그인</button>
          </p>
        </motion.div>
      )}

      {step === 2 && (
        <motion.div
          key="step2"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
        >
          <h1 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: "var(--font-display)" }}>
            프로필을 설정해요
          </h1>
          <p className="text-sm text-muted-foreground mb-6">나를 표현하는 아바타와 이름을 골라주세요.</p>

          {/* Avatar preview + selector */}
          <div className="flex flex-col items-center mb-6">
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${selectedAvatar.gradient} flex items-center justify-center text-2xl mb-3 shadow-md`}>
              {selectedAvatar.emoji}
            </div>
            <div className="grid grid-cols-9 gap-1.5">
              {AVATAR_OPTIONS.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setAvatarId(a.id)}
                  className={`w-8 h-8 rounded-lg bg-gradient-to-br ${a.gradient} flex items-center justify-center text-sm transition-all duration-150 ${
                    avatarId === a.id ? "ring-2 ring-primary ring-offset-1 scale-110" : "hover:scale-105 opacity-70 hover:opacity-100"
                  }`}
                >
                  {a.emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div className="mb-4">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">이름</label>
            <div className="relative">
              <User className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름을 입력하세요"
                className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
          </div>

          {/* Role */}
          <div className="mb-6">
            <label className="text-xs font-medium text-muted-foreground mb-2 block">역할</label>
            <div className="flex flex-wrap gap-2">
              {ROLE_OPTIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 ${
                    role === r
                      ? "bg-primary text-white border-primary shadow-sm"
                      : "bg-white text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2.5">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              이전
            </button>
            <button
              onClick={async () => {
                if (!step2Valid) return;
                setError("");
                setSubmitting(true);
                try {
                  await onLogin(email, password, name, avatarId, role);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "회원가입에 실패했습니다.");
                } finally {
                  setSubmitting(false);
                }
              }}
              disabled={!step2Valid || submitting}
              className="flex-1 py-2.5 bg-primary hover:bg-[#4A7A6A] text-white rounded-xl text-sm font-medium transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4" />
              {submitting ? "생성 중..." : "ThinkLoop 시작하기"}
            </button>
          </div>
          {error && <p className="text-xs text-rose-500 mt-3 text-center">{error}</p>}
        </motion.div>
      )}
    </motion.div>
  );
}

// ── AUTH SCREEN ───────────────────────────────────────────────────────────
function AuthScreen({
  onLogin,
  onSignup,
  onGoogle,
}: {
  onLogin: (email: string, password: string) => Promise<void>;
  onSignup: (email: string, password: string, profile: UserProfile) => Promise<void>;
  onGoogle: () => Promise<void>;
}) {
  const [view, setView] = useState<"login" | "signup">("login");

  return (
    <div className="flex h-screen bg-background" style={{ fontFamily: "var(--font-body)" }}>
      <AuthLeftPanel />
      <div className="flex-1 flex items-center justify-center px-8 py-12 overflow-y-auto scrollbar-hide">
        {view === "login" ? (
          <LoginForm
            onLogin={onLogin}
            onGoogle={onGoogle}
            onGoSignup={() => setView("signup")}
          />
        ) : (
          <SignupForm
            onLogin={(email, password, name, avatarId, role) => onSignup(email, password, { name, avatarId, role })}
            onGoogle={onGoogle}
            onGoLogin={() => setView("login")}
          />
        )}
      </div>
    </div>
  );
}

// ── APP ───────────────────────────────────────────────────────────────────
export default function App() {
  const initialSnapshot = useMemo<Partial<AppSnapshot>>(() => (hasFirebaseConfig ? {} : withoutSeedData(readSnapshot()) ?? {}), []);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(initialSnapshot.userProfile ?? null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [page, setPage] = useState<Page>("home");
  const [projects, setProjects] = useState<Project[]>(initialSnapshot.projects ?? EMPTY_PROJECTS);
  const [insights, setInsights] = useState<Insight[]>(initialSnapshot.insights ?? EMPTY_INSIGHTS);
  const [customBlogs, setCustomBlogs] = useState<CustomBlog[]>(initialSnapshot.customBlogs ?? EMPTY_BLOGS);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [writingProject, setWritingProject] = useState<Project | null>(null);
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null);

  useEffect(() => {
    if (!userProfile) return;
    const snapshot = {
      userProfile,
      projects,
      insights,
      customBlogs,
    } satisfies AppSnapshot;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    if (hasFirebaseConfig && authUserId) {
      void saveAppState(authUserId, snapshot);
    }
  }, [authUserId, userProfile, projects, insights, customBlogs]);

  useEffect(() => {
    if (selectedProject) {
      setSelectedProject(projects.find((project) => project.id === selectedProject.id) ?? null);
    }
    if (writingProject) {
      setWritingProject(projects.find((project) => project.id === writingProject.id) ?? null);
    }
  }, [projects, selectedProject?.id, writingProject?.id]);

  useEffect(() => {
    if (selectedInsight) {
      setSelectedInsight(insights.find((insight) => insight.id === selectedInsight.id) ?? null);
    }
  }, [insights, selectedInsight?.id]);

  if (!userProfile) {
    return (
      <AuthScreen
        onLogin={async (email, password) => {
          if (!hasFirebaseConfig) {
            setUserProfile({ name: "Jisoo Kim", avatarId: "1", role: "프론트엔드 개발자" });
            return;
          }
          const user = await signInWithEmail(email, password);
          const remoteState = withoutSeedData(await loadAppState(user.uid) as Partial<AppSnapshot> | null);
          setAuthUserId(user.uid);
          setUserProfile(remoteState?.userProfile ?? {
            name: user.displayName || email.split("@")[0],
            avatarId: "1",
            role: "프론트엔드 개발자",
          });
          setProjects((remoteState?.projects as Project[] | undefined) ?? EMPTY_PROJECTS);
          setInsights((remoteState?.insights as Insight[] | undefined) ?? EMPTY_INSIGHTS);
          setCustomBlogs((remoteState?.customBlogs as CustomBlog[] | undefined) ?? EMPTY_BLOGS);
        }}
        onSignup={async (email, password, profile) => {
          if (!hasFirebaseConfig) {
            setUserProfile(profile);
            setProjects(EMPTY_PROJECTS);
            setInsights(EMPTY_INSIGHTS);
            setCustomBlogs(EMPTY_BLOGS);
            return;
          }
          const user = await signUpWithEmail(email, password, profile.name);
          setAuthUserId(user.uid);
          setUserProfile(profile);
          setProjects(EMPTY_PROJECTS);
          setInsights(EMPTY_INSIGHTS);
          setCustomBlogs(EMPTY_BLOGS);
          await saveAppState(user.uid, {
            userProfile: profile,
            projects: EMPTY_PROJECTS,
            insights: EMPTY_INSIGHTS,
            customBlogs: EMPTY_BLOGS,
          });
        }}
        onGoogle={async () => {
          if (!hasFirebaseConfig) {
            setUserProfile({ name: "Jisoo Kim", avatarId: "1", role: "프론트엔드 개발자" });
            return;
          }
          const user = await signInWithGoogle();
          const remoteState = withoutSeedData(await loadAppState(user.uid) as Partial<AppSnapshot> | null);
          const profile = remoteState?.userProfile ?? {
            name: user.displayName || "ThinkLoop User",
            avatarId: "1",
            role: "프론트엔드 개발자",
          };
          setAuthUserId(user.uid);
          setUserProfile(profile);
          setProjects((remoteState?.projects as Project[] | undefined) ?? EMPTY_PROJECTS);
          setInsights((remoteState?.insights as Insight[] | undefined) ?? EMPTY_INSIGHTS);
          setCustomBlogs((remoteState?.customBlogs as CustomBlog[] | undefined) ?? EMPTY_BLOGS);
        }}
      />
    );
  }

  const selectedAvatar = AVATAR_OPTIONS.find((a) => a.id === userProfile.avatarId) ?? AVATAR_OPTIONS[0];

  const navigate = (p: Page) => {
    setPage(p);
    if (p !== "project-detail" && p !== "write-reflection") {
      setSelectedProject(null);
      setWritingProject(null);
    }
    if (p !== "insight-detail") {
      setSelectedInsight(null);
    }
  };

  const goToProject = (project: Project) => {
    // always use latest version from state
    const latest = projects.find((p) => p.id === project.id) ?? project;
    setSelectedProject(latest);
    setPage("project-detail");
  };

  const handleStatusChange = (projectId: string, status: ProjectStatus) => {
    const progressByStatus: Record<ProjectStatus, number> = {
      Planning: 15,
      Progress: 65,
      Finished: 100,
    };
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, status, progress: progressByStatus[status] } : p))
    );
    setSelectedProject((prev) => (prev?.id === projectId ? { ...prev, status } : prev));
  };

  const handleCreateProject = (project: Omit<Project, "id" | "createdAt" | "reflections" | "latestReflection" | "progress">) => {
    const progressByStatus: Record<ProjectStatus, number> = {
      Planning: 0,
      Progress: 35,
      Finished: 100,
    };
    setProjects((prev) => [
      {
        ...project,
        id: makeId("project"),
        progress: progressByStatus[project.status],
        latestReflection: "아직 회고가 없습니다.",
        createdAt: todayLabel(),
        reflections: [],
      },
      ...prev,
    ]);
  };

  const handleDeleteProject = (projectId: string) => {
    setProjects((prev) => prev.filter((project) => project.id !== projectId));
    if (selectedProject?.id === projectId) {
      setSelectedProject(null);
      setPage("projects");
    }
  };

  const handleWriteReflection = (project: Project) => {
    setWritingProject(project);
    setPage("write-reflection");
  };

  const handleSaveReflection = (projectId: string, fields: Omit<Reflection, "id" | "date">) => {
    const newRef: Reflection = {
      id: `r${Date.now()}`,
      date: todayLabel(),
      ...fields,
    };
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? { ...p, reflections: [newRef, ...p.reflections], latestReflection: fields.reflection || fields.iDid }
          : p
      )
    );
    setSelectedProject((prev) =>
      prev?.id === projectId
        ? { ...prev, reflections: [newRef, ...prev.reflections] }
        : prev
    );
  };

  const handleDeleteReflection = (projectId: string, reflectionId: string) => {
    const updateProject = (project: Project) => {
      const nextReflections = project.reflections.filter((reflection) => reflection.id !== reflectionId);
      const latestReflection = nextReflections[0]
        ? nextReflections[0].reflection || nextReflections[0].iDid
        : "아직 회고가 없습니다.";
      return { ...project, reflections: nextReflections, latestReflection };
    };

    setProjects((prev) =>
      prev.map((project) => (project.id === projectId ? updateProject(project) : project)),
    );
    setSelectedProject((prev) =>
      prev?.id === projectId ? updateProject(prev) : prev,
    );
  };

  const handleAddBlog = (blog: CustomBlog) => setCustomBlogs((prev) => [...prev, blog]);

  const handleSaveInsight = (insight: Omit<Insight, "id" | "date" | "blogStyle">) => {
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
  };

  const goToInsightDetail = (insight: Insight) => {
    setSelectedInsight(insights.find((item) => item.id === insight.id) ?? insight);
    setPage("insight-detail");
  };

  const handleDeleteInsight = (insightId: string) => {
    setInsights((prev) => prev.filter((insight) => insight.id !== insightId));
    setSelectedInsight(null);
    setPage("insight");
  };

  const handleLogout = async () => {
    if (hasFirebaseConfig) {
      await logOut();
    }
    localStorage.removeItem(STORAGE_KEY);
    setAuthUserId(null);
    setUserProfile(null);
    setProjects(EMPTY_PROJECTS);
    setInsights(EMPTY_INSIGHTS);
    setCustomBlogs(EMPTY_BLOGS);
    setSelectedProject(null);
    setWritingProject(null);
    setSelectedInsight(null);
    setPage("home");
  };

  return (
    <div
      className="flex h-screen bg-background overflow-hidden"
      style={{ fontFamily: "var(--font-body)" }}
    >
      <Sidebar activePage={page} onNavigate={navigate} profile={userProfile} />
      <main className="flex-1 overflow-y-auto scrollbar-hide">
        {page === "home" && (
          <HomePage
            profile={userProfile}
            projects={projects}
            insights={insights}
            onGoToProject={goToProject}
            onGoToInsight={() => navigate("insight")}
            onSelectInsight={goToInsightDetail}
          />
        )}
        {page === "projects" && (
          <ProjectsPage
            projects={projects}
            onSelectProject={goToProject}
            onCreateProject={handleCreateProject}
            onDeleteProject={handleDeleteProject}
          />
        )}
        {page === "insight" && (
          <InsightPage
            insights={insights}
            customBlogs={customBlogs}
            onAddBlog={handleAddBlog}
            onSaveInsight={handleSaveInsight}
            onSelectInsight={goToInsightDetail}
          />
        )}
        {page === "insight-detail" && selectedInsight && (
          <InsightDetailPage
            insight={selectedInsight}
            onBack={() => navigate("insight")}
            onDelete={handleDeleteInsight}
          />
        )}
        {page === "dashboard" && <DashboardPage projects={projects} insights={insights} />}
        {page === "project-detail" && selectedProject && (
          <ProjectDetailPage
            project={selectedProject}
            onBack={() => navigate("projects")}
            onStatusChange={handleStatusChange}
            onWriteReflection={handleWriteReflection}
            onDeleteReflection={handleDeleteReflection}
          />
        )}
        {page === "write-reflection" && writingProject && (
          <WriteReflectionPage
            project={writingProject}
            onBack={() => {
              setPage("project-detail");
              setWritingProject(null);
            }}
            onSave={(fields) => handleSaveReflection(writingProject.id, fields)}
          />
        )}
        {page === "settings" && (
          <SettingsPage
            profile={userProfile}
            avatar={selectedAvatar}
            onUpdateProfile={setUserProfile}
            onLogout={handleLogout}
          />
        )}
      </main>
    </div>
  );
}
