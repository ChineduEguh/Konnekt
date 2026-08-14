export type ScanExportRow = { day: string; scans: number };

export function escapeCsv(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export function scansToCsv(rows: ScanExportRow[]) {
  return [
    "date,qr_scans",
    ...rows.map(row => `${escapeCsv(row.day)},${escapeCsv(row.scans)}`),
  ].join("\n");
}

export function scansToTsv(rows: ScanExportRow[]) {
  return [
    "date\tqr_scans",
    ...rows.map(row => `${row.day}\t${row.scans}`),
  ].join("\n");
}
