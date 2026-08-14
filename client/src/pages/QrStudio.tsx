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
  const [fontFamily, setFontFamily] = useState("Space Grotesk");
  const [creativeName, setCreativeName] = useState("");
  const [creativeUrl, setCreativeUrl] = useState("");
  const [logoDataUrl, setLogoDataUrl] = useState("");
  const [logoName, setLogoName] = useState("");
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
    const render = async () => {
      const canvas = document.createElement("canvas");
      await QRCode.toCanvas(canvas, target, {
        width: 720,
        margin: 2,
        color: { dark: foregroundColor, light: backgroundColor },
        errorCorrectionLevel: "H",
      });
      if (!logoDataUrl) return setPreview(canvas.toDataURL("image/png"));
      const image = new Image();
      image.onerror = () => {
        setLogoDataUrl("");
        setLogoName("");
        toast.error(
          "That logo could not be previewed. Please choose another image."
        );
        setPreview(canvas.toDataURL("image/png"));
      };
      image.onload = () => {
        const context = canvas.getContext("2d");
        if (!context) return setPreview(canvas.toDataURL("image/png"));
        const size = 132;
        const x = (canvas.width - size) / 2;
        const y = (canvas.height - size) / 2;
        context.fillStyle = backgroundColor;
        context.beginPath();
        context.roundRect(x - 12, y - 12, size + 24, size + 24, 18);
        context.fill();
        context.drawImage(image, x, y, size, size);
        setPreview(canvas.toDataURL("image/png"));
      };
      image.src = logoDataUrl;
    };
    void render();
  }, [target, foregroundColor, backgroundColor, shape, logoDataUrl]);
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
    <div className="qr-studio-shell min-h-screen bg-[#f5f7f9] p-5 text-slate-900 md:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="qr-studio-header mb-8 flex flex-wrap items-end justify-between gap-4">
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
        <div className="qr-studio-grid grid gap-5 lg:grid-cols-[1fr_.9fr]">
          <Card className="qr-studio-controls rounded-2xl border-[#dfe9e4] shadow-sm">
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
                Centre logo
                <Input
                  className="mt-1"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={event => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    if (file.size > 1024 * 1024)
                      return toast.error("Logo must be smaller than 1 MB");
                    const reader = new FileReader();
                    reader.onload = () => {
                      setLogoName(file.name);
                      setLogoDataUrl(String(reader.result || ""));
                    };
                    reader.readAsDataURL(file);
                  }}
                />
                <span className="mt-1 block text-[11px] font-normal text-slate-400">
                  PNG, JPEG, or WebP. The logo is placed in a
                  high-error-correction centre panel.
                </span>
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                Font style
                <select
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  value={fontFamily}
                  onChange={e => setFontFamily(e.target.value)}
                >
                  <option>Space Grotesk</option>
                  <option>Inter</option>
                  <option>DM Sans</option>
                  <option>Georgia</option>
                </select>
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                Image or video creative
                <Input
                  className="mt-1"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,video/mp4,video/webm"
                  onChange={event => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    if (file.size > 8 * 1024 * 1024)
                      return toast.error("Creative must be smaller than 8 MB");
                    setCreativeName(file.name);
                    setCreativeUrl(URL.createObjectURL(file));
                  }}
                />
                <span className="mt-1 block text-[11px] font-normal text-slate-400">
                  Optional campaign reference. Images and videos stay local
                  until storage is connected.
                </span>
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
                  className="rounded-full bg-[#003d32] text-white hover:bg-[#0b6b4f]"
                  onClick={() =>
                    createQr.mutate({
                      smartLinkId: linkId!,
                      name,
                      foregroundColor,
                      backgroundColor,
                      shape,
                      frameLabel,
                      logoDataUrl: logoDataUrl || undefined,
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
          <Card className="qr-studio-preview-card qr-studio-preview rounded-2xl border-[#dfe9e4] shadow-sm">
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
                    style={{ color: foregroundColor, fontFamily }}
                  >
                    {frameLabel}
                  </div>
                </div>
              </div>
              {creativeUrl ? (
                <div className="mb-4 overflow-hidden rounded-xl border border-[#dfe9e4] bg-white">
                  {creativeName.match(/\.(mp4|webm)$/i) ? (
                    <video
                      src={creativeUrl}
                      controls
                      className="max-h-40 w-full object-cover"
                    />
                  ) : (
                    <img
                      src={creativeUrl}
                      alt={creativeName}
                      className="max-h-40 w-full object-cover"
                    />
                  )}
                  <p className="truncate px-3 py-2 text-xs text-slate-500">
                    {creativeName}
                  </p>
                </div>
              ) : null}
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                {logoDataUrl ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#e5f8ef] px-2.5 py-1 font-semibold text-[#087443]">
                    Logo previewed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
                    No centre logo
                  </span>
                )}
                {logoName ? (
                  <span className="max-w-[220px] truncate">{logoName}</span>
                ) : null}
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
