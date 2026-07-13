import { Activity } from "lucide-react";
import { HEATMAP_COLORS } from "../utils/dashboard";

export function ActivityHeatmap({ data }: { data: { date: string; count: number }[] }) {
  const weeks: { date: string; count: number }[][] = [];
  for (let i = 0; i < data.length; i += 7) {
    weeks.push(data.slice(i, i + 7));
  }

  return (
    <div className="bg-white rounded-xl border border-border p-4 sm:p-5 shadow-sm mb-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Activity</span>
          <span className="text-xs text-muted-foreground">last 12 months</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">Less</span>
          {HEATMAP_COLORS.map((color) => (
            <div key={color} className="w-2.5 h-2.5 rounded-[2px]" style={{ backgroundColor: color }} />
          ))}
          <span className="text-[10px] text-muted-foreground">More</span>
        </div>
      </div>
      <div className="overflow-x-auto scrollbar-hide">
        <div className="inline-flex gap-[3px]">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-[3px]">
              {week.map((day, dayIndex) => (
                <div
                  key={`${day.date}-${dayIndex}`}
                  className="w-[11px] h-[11px] rounded-[2px]"
                  style={{ backgroundColor: HEATMAP_COLORS[Math.min(day.count, 4)] }}
                  title={`${day.date}: ${day.count}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
