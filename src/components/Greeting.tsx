import { Sparkles } from "lucide-react";
import type { UserProfile } from "../types/app";
import { todayFullLabel } from "../utils/date";

export function Greeting({ profile }: { profile: UserProfile }) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#4A7A6A] via-[#5B8E7D] to-[#6BA898] p-5 sm:p-8 shadow-md shadow-[#5B8E7D]/20">
      <div className="relative z-10 max-w-xs">
        <p
          className="text-[10px] font-medium text-white/40 mb-4 tracking-widest uppercase"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {todayFullLabel()}
        </p>
        <h1
          className="text-3xl sm:text-[2.25rem] font-bold leading-tight mb-2 text-white"
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
  );
}
