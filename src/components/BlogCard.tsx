import { ExternalLink } from "lucide-react";
import type { Insight } from "../types/blog";

export function BlogCard({
  insight,
  onSelect,
}: {
  insight: Insight;
  onSelect: (insight: Insight) => void;
}) {
  return (
    <div
      onClick={() => onSelect(insight)}
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
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${insight.blogStyle}`}>
          {insight.blog}
        </span>
        <span className="text-[11px] text-muted-foreground">{insight.date}</span>
      </div>
      <p className="text-sm font-semibold text-foreground mb-1">{insight.title}</p>
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{insight.summary}</p>
    </div>
  );
}
