export type ActivityTrendRow = {
  day: string;
  eventType: string;
  count: number;
};

export type ActivityTrendPoint = {
  day: string;
  clicks: number;
  scans: number;
};

export function mergeActivityTrend(rows: ActivityTrendRow[]) {
  const grouped = new Map<string, ActivityTrendPoint>();
  for (const row of rows) {
    const existing = grouped.get(row.day) ?? {
      day: row.day,
      clicks: 0,
      scans: 0,
    };
    if (row.eventType === "click") existing.clicks = Number(row.count);
    if (row.eventType === "scan") existing.scans = Number(row.count);
    grouped.set(row.day, existing);
  }
  return Array.from(grouped.values());
}

export function calculateTrendPercent(current: number, previous: number) {
  if (previous > 0) return ((current - previous) / previous) * 100;
  return current > 0 ? 100 : 0;
}
