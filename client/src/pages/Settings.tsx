import { ArrowLeft, FileSpreadsheet, LockKeyhole } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SHEETS_PREP_KEY = "konnekt-google-sheets-preparation";

export default function Settings() {
  const [prepared, setPrepared] = useState(
    () => localStorage.getItem(SHEETS_PREP_KEY) === "true"
  );

  function togglePreparation() {
    const next = !prepared;
    setPrepared(next);
    localStorage.setItem(SHEETS_PREP_KEY, String(next));
  }

  return (
    <div className="min-h-screen bg-[#f5f7f9] p-5 text-slate-900 md:p-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/">
              <Button
                variant="ghost"
                className="mb-3 -ml-3 rounded-full text-slate-500"
              >
                <ArrowLeft size={15} /> Back to workspace
              </Button>
            </Link>
            <p className="eyebrow">WORKSPACE SETTINGS</p>
            <h1 className="mt-2 font-[Space_Grotesk] text-4xl font-semibold tracking-tight text-[#003d32]">
              Prepare your next integrations.
            </h1>
            <p className="mt-2 max-w-2xl text-slate-500">
              Configure future connection paths without changing the current
              export behavior.
            </p>
          </div>
          <ThemeToggle />
        </div>
        <Card className="rounded-2xl border-[#dfe9e4] shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#003d32]">
              <FileSpreadsheet size={19} /> Google Sheets export preparation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-5 rounded-2xl bg-[#f4faf7] p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-xl">
                <p className="font-semibold text-[#003d32]">
                  Prepare authenticated export
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  This toggle records workspace intent for a future
                  authenticated Google Sheets API connection. The current
                  clipboard-based TSV export remains active.
                </p>
                <p className="mt-3 flex items-center gap-1 text-xs font-medium text-[#6b52bd]">
                  <LockKeyhole size={13} /> API credentials are not connected
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={prepared}
                onClick={togglePreparation}
                className={`relative h-7 w-12 shrink-0 rounded-full transition ${prepared ? "bg-[#0b6b4f]" : "bg-slate-300"}`}
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${prepared ? "left-6" : "left-1"}`}
                />
                <span className="sr-only">
                  Prepare authenticated Google Sheets export
                </span>
              </button>
            </div>
            <p className="mt-4 text-sm text-slate-500">
              Status:{" "}
              <strong className="text-[#003d32]">
                {prepared ? "Preparation enabled" : "Preparation disabled"}
              </strong>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
