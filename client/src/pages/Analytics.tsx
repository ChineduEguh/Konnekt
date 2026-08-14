import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  CalendarRange,
  Globe2,
  Smartphone,
  Languages,
  Clipboard,
  Download,
  ExternalLink,
  FileSpreadsheet,
  QrCode,
  ScanLine,
  Eye,
  X,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { scansToCsv, scansToTsv } from "@shared/export";
import { calculateTrendPercent, mergeActivityTrend } from "@shared/analytics";
import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function Analytics() {
  const { isAuthenticated, loading } = useAuth();
  const [range, setRange] = useState(30);
  const [compareEnabled, setCompareEnabled] = useState(true);
  const from = useMemo(() => new Date(Date.now() - range * 86400000), [range]);
  const to = useMemo(() => new Date(), []);
  const previousFrom = useMemo(
    () => new Date(from.getTime() - range * 86400000),
    [from, range]
  );
  const query = trpc.analytics.qrScans.useQuery(
    { from, to },
    { enabled: isAuthenticated }
  );
  const overview = trpc.analytics.overview.useQuery(
    { from, to },
    { enabled: isAuthenticated }
  );
  const workspaceSummary = trpc.workspace.summary.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const trends = trpc.analytics.trends.useQuery(
    { from, to, previousFrom, previousTo: from },
    { enabled: isAuthenticated }
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  const rows = (query.data || []).map(row => ({
    day: String(row.day),
    scans: Number(row.scans),
  }));
  const total = rows.reduce((sum, row) => sum + row.scans, 0);
  const trendRows = useMemo(
    () =>
      mergeActivityTrend(
        (trends.data?.current ?? []).map(row => ({
          ...row,
          day: String(row.day),
          count: Number(row.count),
        }))
      ),
    [trends.data?.current]
  );
  const currentTrendTotal = Number(trends.data?.totals.current ?? 0);
  const previousTrendTotal = Number(trends.data?.totals.previous ?? 0);
  const trendPercent = calculateTrendPercent(
    currentTrendTotal,
    previousTrendTotal
  );
  function downloadCsv() {
    const blob = new Blob([scansToCsv(rows)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `konnekt-qr-scans-${range}d.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  async function exportToGoogleSheets() {
    const tsv = scansToTsv(rows);
    setPreviewOpen(true);
    try {
      await navigator.clipboard.writeText(tsv);
      toast.success(
        "Analytics copied to your clipboard. Preview it before pasting."
      );
    } catch {
      toast.error(
        "Clipboard access was unavailable. Use the preview to copy the data manually."
      );
    }
    window.open(
      "https://docs.google.com/spreadsheets/create",
      "_blank",
      "noopener,noreferrer"
    );
  }
  if (loading)
    return (
      <div className="min-h-screen grid place-items-center bg-[#f5f7f9]">
        Loading analytics...
      </div>
    );
  if (!isAuthenticated)
    return (
      <div className="min-h-screen grid place-items-center bg-[#f5f7f9] p-6">
        <Card>
          <CardContent className="p-8 text-center">
            Sign in to view analytics.
          </CardContent>
        </Card>
      </div>
    );
  return (
    <div className="min-h-screen bg-[#f5f7f9] p-5 text-slate-900 md:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link href="/">
              <Button
                variant="ghost"
                className="mb-3 -ml-3 rounded-full text-slate-500"
              >
                <ArrowLeft size={15} /> Back to workspace
              </Button>
            </Link>
            <p className="eyebrow">KONNEKT ANALYTICS</p>
            <h1 className="mt-2 font-[Space_Grotesk] text-4xl font-semibold tracking-tight text-[#003d32]">
              Every scan tells you where attention moved.
            </h1>
            <p className="mt-2 text-slate-500">
              Track QR scans over time and move the dataset into CSV or Google
              Sheets in one click.
            </p>
          </div>
          <div className="analytics-actions flex flex-wrap items-center gap-2">
            <ThemeToggle />
            <select
              className="h-10 rounded-full border border-slate-200 bg-white px-4 text-sm"
              value={range}
              onChange={e => setRange(Number(e.target.value))}
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={downloadCsv}
            >
              <Download size={15} /> CSV
            </Button>
            <Button
              variant={compareEnabled ? "default" : "outline"}
              className={
                compareEnabled
                  ? "rounded-full bg-[#6b52bd] text-white hover:bg-[#58439f]"
                  : "rounded-full"
              }
              onClick={() => setCompareEnabled(value => !value)}
            >
              Compare {range}d
            </Button>
            <Button
              className="rounded-full bg-[#003d32] text-white hover:bg-[#0b6b4f]"
              onClick={exportToGoogleSheets}
            >
              <FileSpreadsheet size={15} /> Google Sheets
            </Button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-2xl border-[#dfe9e4] shadow-sm">
            <CardContent className="p-5">
              <div className="mb-6 flex items-center justify-between">
                <span className="eyebrow">TOTAL SCANS</span>
                <ScanLine className="text-[#e46f2e]" size={19} />
              </div>
              <strong className="font-[Space_Grotesk] text-4xl text-[#003d32]">
                {total.toLocaleString()}
              </strong>
              <p className="mt-2 text-xs text-slate-500">
                QR-origin events in selected range
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-[#dfe9e4] shadow-sm">
            <CardContent className="p-5">
              <div className="mb-6 flex items-center justify-between">
                <span className="eyebrow">ACTIVE WINDOW</span>
                <CalendarRange className="text-[#0b6b4f]" size={19} />
              </div>
              <strong className="font-[Space_Grotesk] text-4xl text-[#003d32]">
                {range}d
              </strong>
              <p className="mt-2 text-xs text-slate-500">
                {from.toLocaleDateString()} to {to.toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-[#dfe9e4] shadow-sm">
            <CardContent className="p-5">
              <div className="mb-6 flex items-center justify-between">
                <span className="eyebrow">EXPORT READY</span>
                <Clipboard className="text-[#6b52bd]" size={19} />
              </div>
              <strong className="font-[Space_Grotesk] text-4xl text-[#003d32]">
                2
              </strong>
              <p className="mt-2 text-xs text-slate-500">
                CSV and Sheets-compatible paths
              </p>
            </CardContent>
          </Card>
        </div>
        <Card className="mt-5 rounded-2xl border-[#dfe9e4] shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#003d32]">
              <BarChart3 size={18} /> Smart-link and QR activity{" "}
              <Badge variant="outline" className="rounded-full">
                {trendRows.length} active days
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[360px] w-full">
              {trendRows.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendRows}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5ece8" />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      cursor={{ stroke: "#9dccba", strokeDasharray: "4 4" }}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #b7dfcf",
                        background: "#ffffff",
                        color: "#10221d",
                      }}
                      labelStyle={{ color: "#52635f", fontWeight: 600 }}
                      formatter={(value: number | string, name: string) => [
                        `${Number(value).toLocaleString()} events`,
                        name === "clicks" ? "Smart-link clicks" : "QR scans",
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="clicks"
                      name="clicks"
                      stroke="#6b52bd"
                      strokeWidth={3}
                      dot={{ r: 3, fill: "#6b52bd", strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: "#6b52bd" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="scans"
                      name="scans"
                      stroke="#0b6b4f"
                      strokeWidth={3}
                      dot={{ r: 3, fill: "#e46f2e", strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: "#e46f2e" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="analytics-empty grid h-full place-items-center rounded-2xl bg-[#f4faf7] px-5 py-8 text-center text-slate-500">
                  <div className="max-w-md">
                    <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-white text-[#0b6b4f] shadow-sm">
                      <QrCode size={25} />
                    </span>
                    <p className="text-base font-semibold text-[#003d32]">
                      Your first signal starts with one smart link.
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Create a link for your next campaign or publish an event.
                      Once people scan your QR code, the trend will build here
                      automatically.
                    </p>
                    <div className="mt-5 flex flex-wrap justify-center gap-2">
                      <Link href="/">
                        <Button className="rounded-full bg-[#0b6b4f] text-white hover:bg-[#095a43]">
                          <ExternalLink size={15} /> Create a smart link
                        </Button>
                      </Link>
                      <Link href="/events">
                        <Button
                          variant="outline"
                          className="rounded-full border-[#b7dfcf] bg-white text-[#245247]"
                        >
                          <CalendarRange size={15} /> Create an event
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        {compareEnabled && (
          <section className="mt-5 grid gap-4 sm:grid-cols-3">
            <Card className="rounded-2xl border-[#dfe9e4] shadow-sm">
              <CardContent className="p-5">
                <p className="eyebrow">ACTIVITY TREND</p>
                <strong
                  className={`mt-3 block font-[Space_Grotesk] text-3xl ${trendPercent >= 0 ? "text-[#0b6b4f]" : "text-[#b45309]"}`}
                >
                  {trendPercent >= 0 ? "+" : ""}
                  {trendPercent.toFixed(1)}%
                </strong>
                <p className="mt-2 text-xs text-slate-500">
                  Total activity versus the previous {range}-day period
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-[#dfe9e4] shadow-sm">
              <CardContent className="p-5">
                <p className="eyebrow">CURRENT PERIOD</p>
                <strong className="mt-3 block font-[Space_Grotesk] text-3xl text-[#003d32]">
                  {currentTrendTotal.toLocaleString()}
                </strong>
                <p className="mt-2 text-xs text-slate-500">
                  Smart-link clicks and QR scans
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-[#dfe9e4] shadow-sm">
              <CardContent className="p-5">
                <p className="eyebrow">PREVIOUS PERIOD</p>
                <strong className="mt-3 block font-[Space_Grotesk] text-3xl text-[#003d32]">
                  {previousTrendTotal.toLocaleString()}
                </strong>
                <p className="mt-2 text-xs text-slate-500">
                  Equivalent preceding date range
                </p>
              </CardContent>
            </Card>
          </section>
        )}
        <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="rounded-2xl border-[#dfe9e4] shadow-sm">
            <CardContent className="p-5">
              <p className="eyebrow">SMART LINKS</p>
              <strong className="mt-3 block font-[Space_Grotesk] text-3xl text-[#003d32]">
                {Number(workspaceSummary.data?.links ?? 0).toLocaleString()}
              </strong>
              <p className="mt-2 text-xs text-slate-500">
                Active destinations in this workspace
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-[#dfe9e4] shadow-sm">
            <CardContent className="p-5">
              <p className="eyebrow">QR SCANS</p>
              <strong className="mt-3 block font-[Space_Grotesk] text-3xl text-[#003d32]">
                {Number(workspaceSummary.data?.scans ?? 0).toLocaleString()}
              </strong>
              <p className="mt-2 text-xs text-slate-500">
                All-time QR-origin activity
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-[#dfe9e4] shadow-sm">
            <CardContent className="p-5">
              <p className="eyebrow">LINK CLICKS</p>
              <strong className="mt-3 block font-[Space_Grotesk] text-3xl text-[#003d32]">
                {Number(workspaceSummary.data?.clicks ?? 0).toLocaleString()}
              </strong>
              <p className="mt-2 text-xs text-slate-500">
                All-time smart-link activity
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-[#dfe9e4] shadow-sm">
            <CardContent className="p-5">
              <p className="eyebrow">EXPORT PREVIEW</p>
              <Button
                variant="outline"
                className="mt-3 rounded-full"
                onClick={() => setPreviewOpen(true)}
              >
                <Eye size={15} /> Review copied data
              </Button>
              <p className="mt-2 text-xs text-slate-500">
                Inspect TSV rows before pasting
              </p>
            </CardContent>
          </Card>
        </section>
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <Card className="rounded-2xl border-[#dfe9e4] shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#003d32]">
                <Globe2 size={18} /> Scan geography
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(overview.data?.geography ?? []).length ? (
                overview.data?.geography.map(item => (
                  <div
                    key={item.country || "unknown"}
                    className="flex items-center justify-between rounded-lg bg-[#f4faf7] px-3 py-2 text-sm"
                  >
                    <span>{item.country || "Unknown"}</span>
                    <strong>{Number(item.count).toLocaleString()}</strong>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  Country data will appear after scans include a country signal.
                </p>
              )}
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-[#dfe9e4] shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#003d32]">
                <Smartphone size={18} /> Devices and browsers
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="eyebrow mb-2">DEVICES</p>
                {(overview.data?.devices ?? []).map(item => (
                  <div
                    key={item.device || "unknown"}
                    className="flex justify-between py-1 text-sm"
                  >
                    <span>{item.device || "Unknown"}</span>
                    <strong>{Number(item.count).toLocaleString()}</strong>
                  </div>
                ))}
              </div>
              <div>
                <p className="eyebrow mb-2">
                  <Languages size={13} className="inline mr-1" />
                  BROWSERS
                </p>
                {(overview.data?.browsers ?? []).map(item => (
                  <div
                    key={item.browser || "unknown"}
                    className="flex justify-between py-1 text-sm"
                  >
                    <span>{item.browser || "Unknown"}</span>
                    <strong>{Number(item.count).toLocaleString()}</strong>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-[#dfe9e4] shadow-sm">
            <CardHeader>
              <CardTitle className="text-[#003d32]">
                Conversion funnel
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Object.entries(
                overview.data?.funnel ?? {
                  clicks: 0,
                  scans: 0,
                  registrations: 0,
                  checkins: 0,
                }
              ).map(([label, value]) => (
                <div key={label} className="rounded-xl bg-[#f4faf7] p-3">
                  <p className="eyebrow">{label}</p>
                  <strong className="mt-2 block text-2xl text-[#003d32]">
                    {Number(value).toLocaleString()}
                  </strong>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-[#dfe9e4] shadow-sm">
            <CardHeader>
              <CardTitle className="text-[#003d32]">Top active links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(overview.data?.topLinks ?? []).length ? (
                overview.data?.topLinks.map(item => (
                  <div
                    key={item.linkId || "unknown"}
                    className="flex justify-between rounded-lg border border-[#dfe9e4] px-3 py-2 text-sm"
                  >
                    <span>
                      {item.slug || `Link ${item.linkId || "unknown"}`}
                    </span>
                    <strong>
                      {Number(item.count).toLocaleString()} signals
                    </strong>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  Top links will appear after connection activity is recorded.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
        <Card className="mt-5 rounded-2xl border-[#dfe9e4] shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#003d32]">
              <ExternalLink size={18} /> Export workflow
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <button
              onClick={downloadCsv}
              className="rounded-xl border border-slate-200 bg-white p-5 text-left transition hover:border-[#9dccba]"
            >
              <Download className="mb-3 text-[#e46f2e]" size={20} />
              <strong className="block text-sm">Download CSV</strong>
              <span className="mt-1 block text-xs text-slate-500">
                Portable file for reporting, BI tools, or archiving.
              </span>
            </button>
            <button
              onClick={exportToGoogleSheets}
              className="rounded-xl border border-slate-200 bg-white p-5 text-left transition hover:border-[#9dccba]"
            >
              <FileSpreadsheet className="mb-3 text-[#0b6b4f]" size={20} />
              <strong className="block text-sm">Open in Google Sheets</strong>
              <span className="mt-1 block text-xs text-slate-500">
                Copies tab-separated data and opens a fresh Sheet for pasting.
              </span>
            </button>
          </CardContent>
        </Card>
        {previewOpen && (
          <div
            className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="export-preview-title"
          >
            <div className="w-full max-w-2xl rounded-2xl border border-[#dfe9e4] bg-white p-5 text-slate-900 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="eyebrow">CLIPBOARD EXPORT</p>
                  <h2
                    id="export-preview-title"
                    className="mt-1 text-xl font-semibold text-[#003d32]"
                  >
                    Copied scan data preview
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    This preview mirrors the TSV content copied for Google
                    Sheets.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Close export preview"
                  onClick={() => setPreviewOpen(false)}
                >
                  <X size={17} />
                </Button>
              </div>
              <pre className="mt-5 max-h-80 overflow-auto rounded-xl bg-[#f4faf7] p-4 text-xs leading-6 text-[#245247]">
                {scansToTsv(rows) ||
                  "day\tscans\nNo scan activity in this range"}
              </pre>
              <div className="mt-4 flex justify-end">
                <Button
                  className="rounded-full bg-[#003d32] text-white hover:bg-[#0b6b4f]"
                  onClick={() => setPreviewOpen(false)}
                >
                  Done
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
