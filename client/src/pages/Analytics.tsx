import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  CalendarRange,
  Clipboard,
  Download,
  ExternalLink,
  FileSpreadsheet,
  QrCode,
  ScanLine,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { scansToCsv, scansToTsv } from "@shared/export";
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
  const from = useMemo(() => new Date(Date.now() - range * 86400000), [range]);
  const to = useMemo(() => new Date(), []);
  const query = trpc.analytics.qrScans.useQuery(
    { from, to },
    { enabled: isAuthenticated }
  );
  const rows = (query.data || []).map(row => ({
    day: String(row.day),
    scans: Number(row.scans),
  }));
  const total = rows.reduce((sum, row) => sum + row.scans, 0);
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
    await navigator.clipboard.writeText(scansToTsv(rows));
    window.open(
      "https://docs.google.com/spreadsheets/create",
      "_blank",
      "noopener,noreferrer"
    );
    toast.success("Analytics copied. Paste into the new Google Sheet.");
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
          <div className="analytics-actions flex flex-wrap gap-2">
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
              <BarChart3 size={18} /> QR scans over time{" "}
              <Badge variant="outline" className="rounded-full">
                {rows.length} active days
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[360px] w-full">
              {rows.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={rows}>
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
                      formatter={(value: number | string) => [
                        `${Number(value).toLocaleString()} scans`,
                        "QR scans",
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="scans"
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
      </div>
    </div>
  );
}
