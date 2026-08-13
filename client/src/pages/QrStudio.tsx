import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  ArrowLeft,
  Download,
  Link2,
  Palette,
  QrCode,
  Sparkles,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";

export default function QrStudio() {
  const { isAuthenticated, loading } = useAuth();
  const links = trpc.links.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const qrList = trpc.qr.list.useQuery(undefined, { enabled: isAuthenticated });
  const [linkId, setLinkId] = useState<number | null>(null);
  const [name, setName] = useState("Campaign QR");
  const [foregroundColor, setForegroundColor] = useState("#003D32");
  const [backgroundColor, setBackgroundColor] = useState("#DDF8EC");
  const [shape, setShape] = useState<"square" | "dots" | "rounded">("rounded");
  const [frameLabel, setFrameLabel] = useState("SCAN TO CONNECT");
  const [preview, setPreview] = useState("");
  const workspace = trpc.workspace.current.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const createQr = trpc.qr.create.useMutation({
    onSuccess: () => {
      qrList.refetch();
      toast.success("QR code saved to your studio");
    },
    onError: e => toast.error(e.message),
  });
  const selected = links.data?.find(link => link.id === linkId);
  const target = selected
    ? `${window.location.origin}/r/${selected.slug}?source=qr`
    : "https://konnekt.af/connect?source=qr";
  useEffect(() => {
    QRCode.toDataURL(target, {
      width: 720,
      margin: 2,
      color: { dark: foregroundColor, light: backgroundColor },
      errorCorrectionLevel: "H",
    }).then(setPreview);
  }, [target, foregroundColor, backgroundColor, shape]);
  if (loading)
    return (
      <div className="min-h-screen grid place-items-center bg-[#f5f7f9]">
        Loading QR Studio...
      </div>
    );
  if (!isAuthenticated)
    return (
      <div className="min-h-screen grid place-items-center bg-[#f5f7f9] p-6">
        <Card>
          <CardContent className="p-8 text-center">
            Sign in to use QR Studio.
          </CardContent>
        </Card>
      </div>
    );
  function download() {
    if (!preview) return;
    const anchor = document.createElement("a");
    anchor.href = preview;
    anchor.download = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "konnekt-qr"}.png`;
    anchor.click();
  }
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
            <p className="eyebrow">KONNEKT QR STUDIO</p>
            <h1 className="mt-2 font-[Space_Grotesk] text-4xl font-semibold tracking-tight text-[#003d32]">
              Make the physical world measurable.
            </h1>
            <p className="mt-2 text-slate-500">
              Style a dynamic QR code, bind it to a smart link, and keep the
              destination editable.
            </p>
          </div>
          <Badge className="rounded-full bg-[#ddf8ec] px-3 py-1 text-[#087443] hover:bg-[#ddf8ec]">
            <Sparkles size={14} className="mr-1" /> Dynamic connection asset
          </Badge>
        </div>
        <div className="grid gap-5 lg:grid-cols-[1fr_.9fr]">
          <Card className="rounded-2xl border-[#dfe9e4] shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#003d32]">
                <Palette size={18} /> QR design controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <label className="block text-xs font-semibold text-slate-600">
                QR name
                <Input
                  className="mt-1"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Trade show QR"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                Smart link destination
                <select
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  value={linkId || ""}
                  onChange={e => setLinkId(Number(e.target.value) || null)}
                >
                  <option value="">Choose a smart link</option>
                  {links.data?.map(link => (
                    <option key={link.id} value={link.id}>
                      knkt.af/{link.slug}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="block text-xs font-semibold text-slate-600">
                  Foreground
                  <input
                    className="mt-1 h-10 w-full cursor-pointer rounded-md border border-slate-200 bg-white p-1"
                    type="color"
                    value={foregroundColor}
                    onChange={e => setForegroundColor(e.target.value)}
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-600">
                  Background
                  <input
                    className="mt-1 h-10 w-full cursor-pointer rounded-md border border-slate-200 bg-white p-1"
                    type="color"
                    value={backgroundColor}
                    onChange={e => setBackgroundColor(e.target.value)}
                  />
                </label>
              </div>
              <label className="block text-xs font-semibold text-slate-600">
                Shape
                <select
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  value={shape}
                  onChange={e => setShape(e.target.value as typeof shape)}
                >
                  <option value="rounded">Rounded modules</option>
                  <option value="dots">Dot modules</option>
                  <option value="square">Square modules</option>
                </select>
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                Frame label
                <Input
                  className="mt-1"
                  value={frameLabel}
                  onChange={e => setFrameLabel(e.target.value)}
                  placeholder="SCAN TO CONNECT"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={!linkId || createQr.isPending}
                  className="rounded-full bg-[#003d32] hover:bg-[#0b6b4f]"
                  onClick={() =>
                    createQr.mutate({
                      smartLinkId: linkId!,
                      name,
                      foregroundColor,
                      backgroundColor,
                      shape,
                      frameLabel,
                    })
                  }
                >
                  <QrCode size={15} /> Save QR asset
                </Button>
                <Button
                  variant="outline"
                  disabled={!preview}
                  className="rounded-full"
                  onClick={download}
                >
                  <Download size={15} /> Download PNG
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-[#dfe9e4] shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#003d32]">
                <QrCode size={18} /> Live preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="grid min-h-[390px] place-items-center rounded-2xl p-7"
                style={{ background: backgroundColor }}
              >
                <div className="rounded-2xl bg-white p-5 shadow-xl">
                  <img
                    src={preview}
                    alt={`QR code for ${selected?.slug || "Konnekt smart link"}`}
                    className={`h-64 w-64 ${shape === "rounded" ? "rounded-3xl" : shape === "dots" ? "rounded-full" : ""}`}
                  />
                  <div
                    className="mt-3 text-center font-mono text-[10px] font-semibold tracking-[.16em]"
                    style={{ color: foregroundColor }}
                  >
                    {frameLabel}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                <Link2 size={14} />
                {selected
                  ? `Linked to knkt.af/${selected.slug}`
                  : "Choose a smart link to bind this QR code"}
              </div>
            </CardContent>
          </Card>
        </div>
        <Card className="mt-5 rounded-2xl border-[#dfe9e4] shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#003d32]">Saved QR assets</CardTitle>
          </CardHeader>
          <CardContent>
            {qrList.data?.length ? (
              <div className="grid gap-3 md:grid-cols-3">
                {qrList.data.map(qr => (
                  <div
                    key={qr.id}
                    className="rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <QrCode size={18} style={{ color: qr.foregroundColor }} />
                      <Badge variant="outline" className="rounded-full">
                        {qr.shape}
                      </Badge>
                    </div>
                    <strong className="block text-sm">{qr.name}</strong>
                    <span className="mt-1 block text-xs text-slate-500">
                      {qr.frameLabel || "Dynamic QR asset"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-slate-500">
                No saved QR assets yet. Choose a link and save your first
                design.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
