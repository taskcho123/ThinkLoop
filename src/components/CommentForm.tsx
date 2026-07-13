import type { ChangeEvent } from "react";
import { Lightbulb, Sparkles, Target, TrendingUp, User } from "lucide-react";
import type { CommentInput } from "../types/comment";

const COMMENT_FIELDS = [
  { key: "aiDid" as const, label: "AI가 한 일", icon: Sparkles },
  { key: "iDid" as const, label: "내가 한 일", icon: User },
  { key: "improvement" as const, label: "개선할 점", icon: TrendingUp },
  { key: "reflection" as const, label: "오늘의 회고", icon: Lightbulb },
  { key: "nextGoal" as const, label: "다음 목표", icon: Target },
];

export function CommentForm({
  value,
  onChange,
}: {
  value: CommentInput;
  onChange: (value: CommentInput) => void;
}) {
  const set = (key: keyof CommentInput) => (event: ChangeEvent<HTMLTextAreaElement>) => {
    onChange({ ...value, [key]: event.target.value });
  };

  return (
    <div className="space-y-4">
      {COMMENT_FIELDS.map(({ key, label, icon: Icon }) => (
        <div key={key} className="bg-white rounded-xl border-2 border-border p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Icon className="w-3.5 h-3.5 text-primary" />
            <p className="text-sm font-semibold text-foreground">{label}</p>
          </div>
          <textarea
            value={value[key]}
            onChange={set(key)}
            placeholder="여기에 작성하세요..."
            rows={3}
            className="w-full resize-none bg-transparent text-sm text-foreground placeholder-muted-foreground/40 focus:outline-none leading-relaxed"
          />
        </div>
      ))}
    </div>
  );
}
