export function todayLabel() {
  return new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function todayFullLabel() {
  return new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}

export function parseAppDate(value: string) {
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

export function dateKey(date: Date) {
  return date.toISOString().split("T")[0];
}

export function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(date: Date) {
  return date.toLocaleString("en", { month: "short" });
}
