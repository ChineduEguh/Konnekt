import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  ArrowLeft,
  Download,
  Link2,
  Monitor,
  Smartphone,
  Palette,
  QrCode,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  FileText,
  History,
  Trash2,
  Pencil,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { normalizeHttpUrl } from "../../../shared/urls";
import { canSaveQr, getQrExportFilename } from "../../../shared/qrStudio";
import { buildStyledQrSvg } from "../../../shared/qrSvg";

type PatternStyle = "square" | "dots" | "rounded";
type CornerStyle = "square" | "rounded" | "circle";

const qrThemes = [
  {
    id: "konnekt",
    label: "Konnekt Green",
    foreground: "#003D32",
    background: "#DDF8EC",
  },
  {
    id: "midnight",
    label: "Midnight Blue",
    foreground: "#102A43",
    background: "#E6F0FF",
  },
  {
    id: "coral",
    label: "Coral Signal",
    foreground: "#9B2C2C",
    background: "#FFF0EC",
  },
  {
    id: "violet",
    label: "Violet Studio",
    foreground: "#4C1D95",
    background: "#F3E8FF",
  },
  {
    id: "mono",
    label: "Classic Mono",
    foreground: "#111827",
    background: "#FFFFFF",
  },
] as const;

function drawStyledQr(
  canvas: HTMLCanvasElement,
  value: string,
  foreground: string,
  background: string,
  pattern: PatternStyle,
  corner: CornerStyle
) {
  const qr = QRCode.create(value, { errorCorrectionLevel: "H" });
  const modules = qr.modules;
  const count = modules.size;
  const quiet = 48;
  const size = 720;
  const cell = (size - quiet * 2) / count;
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.fillStyle = background;
  context.fillRect(0, 0, size, size);
  context.fillStyle = foreground;
  const isFinder = (row: number, column: number) =>
    (row < 7 && column < 7) ||
    (row < 7 && column >= count - 7) ||
    (row >= count - 7 && column < 7);
  const drawModule = (x: number, y: number) => {
    if (pattern === "dots") {
      context.beginPath();
      context.arc(x + cell / 2, y + cell / 2, cell * 0.42, 0, Math.PI * 2);
      context.fill();
    } else if (pattern === "rounded") {
      context.beginPath();
      context.roundRect(
        x + cell * 0.08,
        y + cell * 0.08,
        cell * 0.84,
        cell * 0.84,
        cell * 0.18
      );
      context.fill();
    } else {
      context.fillRect(x, y, cell + 0.3, cell + 0.3);
    }
  };
  for (let row = 0; row < count; row += 1) {
    for (let column = 0; column < count; column += 1) {
      if (modules.get(row, column) && !isFinder(row, column)) {
        drawModule(quiet + column * cell, quiet + row * cell);
      }
    }
  }
  const drawEye = (offsetX: number, offsetY: number) => {
    const x = quiet + offsetX * cell;
    const y = quiet + offsetY * cell;
    context.fillStyle = foreground;
    if (corner === "circle") {
      context.beginPath();
      context.arc(x + cell * 3.5, y + cell * 3.5, cell * 3.5, 0, Math.PI * 2);
      context.fill();
    } else if (corner === "rounded") {
      context.beginPath();
      context.roundRect(x, y, cell * 7, cell * 7, cell * 1.1);
      context.fill();
    } else {
      context.fillRect(x, y, cell * 7, cell * 7);
    }
    context.fillStyle = background;
    context.fillRect(x + cell, y + cell, cell * 5, cell * 5);
    context.fillStyle = foreground;
    if (corner === "circle") {
      context.beginPath();
      context.arc(x + cell * 3.5, y + cell * 3.5, cell * 1.7, 0, Math.PI * 2);
      context.fill();
    } else {
      context.fillRect(x + cell * 2, y + cell * 2, cell * 3, cell * 3);
    }
  };
  drawEye(0, 0);
  drawEye(count - 7, 0);
  drawEye(0, count - 7);
}

export default function QrStudio() {
  const { isAuthenticated, loading } = useAuth();
  const links = trpc.links.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const qrList = trpc.qr.list.useQuery(undefined, { enabled: isAuthenticated });
  const [linkId, setLinkId] = useState<number | null>(null);
  const [manualUrl, setManualUrl] = useState("");
  const [destinationTested, setDestinationTested] = useState(false);
  const [name, setName] = useState("Campaign QR");
  const [foregroundColor, setForegroundColor] = useState("#003D32");
  const [backgroundColor, setBackgroundColor] = useState("#DDF8EC");
  const [shape, setShape] = useState<PatternStyle>("rounded");
  const [cornerStyle, setCornerStyle] = useState<CornerStyle>("rounded");
  const [themeId, setThemeId] = useState("konnekt");
  const [frameLabel, setFrameLabel] = useState("SCAN TO CONNECT");
  const [fontFamily, setFontFamily] = useState("Space Grotesk");
  const [creativeName, setCreativeName] = useState("");
  const [creativeUrl, setCreativeUrl] = useState("");
  const [logoDataUrl, setLogoDataUrl] = useState("");
  const [logoName, setLogoName] = useState("");
  const [preview, setPreview] = useState("");
  const [previewMode, setPreviewMode] = useState<"mobile" | "desktop">(
    "mobile"
  );
  const [editingQrId, setEditingQrId] = useState<number | null>(null);
  const [editingQrName, setEditingQrName] = useState("");
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
  const renameQr = trpc.qr.rename.useMutation({
    onSuccess: () => {
      qrList.refetch();
      toast.success("QR label updated");
    },
    onError: e => toast.error(e.message),
  });
  const removeQr = trpc.qr.remove.useMutation({
    onSuccess: () => {
      qrList.refetch();
      toast.success("QR asset removed");
    },
    onError: e => toast.error(e.message),
  });
  const selected = links.data?.find(link => link.id === linkId);
  const manualUrlValidation = manualUrl.trim()
    ? normalizeHttpUrl(manualUrl)
    : null;
  const manualUrlHasError = Boolean(manualUrl.trim() && !manualUrlValidation);
  const normalizeQrDestination = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return "https://konnekt.af/connect?source=qr";
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  };
  const target = manualUrl.trim()
    ? normalizeQrDestination(manualUrl)
    : selected
      ? selected.customDomain
        ? `https://${selected.customDomain}/${selected.slug}?source=qr`
        : `${window.location.origin}/r/${selected.slug}?source=qr`
      : "https://konnekt.af/connect?source=qr";
  useEffect(() => {
    const render = async () => {
      const canvas = document.createElement("canvas");
      drawStyledQr(
        canvas,
        target,
        foregroundColor,
        backgroundColor,
        shape,
        cornerStyle
      );
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
  }, [
    target,
    foregroundColor,
    backgroundColor,
    shape,
    cornerStyle,
    logoDataUrl,
  ]);
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
  const filename = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "konnekt-qr"}`;
  function triggerDownload(url: string, extension: string) {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = getQrExportFilename(name, extension);
    anchor.click();
  }
  function downloadPng() {
    if (preview) triggerDownload(preview, "png");
  }
  async function downloadSvg() {
    const qr = QRCode.create(target, { errorCorrectionLevel: "H" });
    const modules = Array.from({ length: qr.modules.size }, (_, row) =>
      Array.from({ length: qr.modules.size }, (_, column) =>
        Boolean(qr.modules.get(row, column))
      )
    );
    const withLogo = buildStyledQrSvg(
      modules,
      foregroundColor,
      backgroundColor,
      shape,
      cornerStyle,
      logoDataUrl
    );
    triggerDownload(
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(withLogo)}`,
      "svg"
    );
  }
  function downloadPdf() {
    if (!preview) return;
    const jpegUrl = document.createElement("canvas");
    jpegUrl.width = 720;
    jpegUrl.height = 720;
    const context = jpegUrl.getContext("2d");
    const image = new Image();
    image.onload = () => {
      context?.drawImage(image, 0, 0, 720, 720);
      const jpeg = jpegUrl.toDataURL("image/jpeg", 0.92);
      const binary = atob(jpeg.split(",")[1]);
      const imageBytes = Uint8Array.from(binary, char => char.charCodeAt(0));
      const encoder = new TextEncoder();
      const objects = [
        "1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n",
        "2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n",
        "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 720 720] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>endobj\n",
        `4 0 obj<< /Type /XObject /Subtype /Image /Width 720 /Height 720 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>stream\n`,
        "5 0 obj<< /Length 31 >>stream\nq\n720 0 0 720 0 0 cm\n/Im0 Do\nQ\nendstream\nendobj\n",
      ];
      const header = encoder.encode("%PDF-1.4\n");
      const chunks: BlobPart[] = [header as unknown as ArrayBuffer];
      const offsets = [0];
      let position = header.length;
      for (let index = 0; index < objects.length; index += 1) {
        offsets.push(position);
        const head = encoder.encode(objects[index]);
        chunks.push(head as unknown as ArrayBuffer);
        position += head.length;
        if (index === 3) {
          chunks.push(imageBytes as unknown as ArrayBuffer);
          position += imageBytes.length;
          const tail = encoder.encode("\nendstream\nendobj\n");
          chunks.push(tail as unknown as ArrayBuffer);
          position += tail.length;
        }
      }
      const xref = position;
      const table = encoder.encode(
        `xref\n0 6\n0000000000 65535 f \n${offsets
          .slice(1)
          .map(offset => `${String(offset).padStart(10, "0")} 00000 n `)
          .join(
            "\n"
          )}\ntrailer<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
      );
      chunks.push(table as unknown as ArrayBuffer);
      triggerDownload(
        URL.createObjectURL(new Blob(chunks, { type: "application/pdf" })),
        "pdf"
      );
    };
    image.src = preview;
  }
  function loadQrAsset(qr: NonNullable<typeof qrList.data>[number]) {
    setName(qr.name);
    setLinkId(qr.smartLinkId ?? null);
    setManualUrl(qr.destinationUrl ?? "");
    setForegroundColor(qr.foregroundColor);
    setBackgroundColor(qr.backgroundColor);
    setShape(qr.shape as PatternStyle);
    setCornerStyle(qr.cornerStyle as CornerStyle);
    setFrameLabel(qr.frameLabel ?? "SCAN TO CONNECT");
    setLogoDataUrl(qr.logoUrl ?? "");
    setLogoName(qr.logoUrl ? "Saved centre logo" : "");
    setDestinationTested(false);
    toast.success("QR asset loaded into the editor");
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
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Badge className="page-header-badge hidden rounded-full bg-[#ddf8ec] px-3 py-1 text-[#087443] hover:bg-[#ddf8ec] sm:flex">
              <Sparkles size={14} className="mr-1" /> Dynamic connection asset
            </Badge>
          </div>
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
                QR destination URL
                <div className="mt-1 flex gap-2">
                  <Input
                    value={manualUrl}
                    aria-invalid={manualUrlHasError}
                    onChange={e => {
                      setManualUrl(e.target.value);
                      setDestinationTested(false);
                      if (e.target.value.trim()) setLinkId(null);
                    }}
                    placeholder="google.com or https://your-site.com"
                    className={manualUrlHasError ? "border-red-400" : ""}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!manualUrlValidation}
                    className="shrink-0 px-3"
                    title="Test destination URL"
                    onClick={() => {
                      if (!manualUrlValidation) return;
                      setDestinationTested(true);
                      window.open(
                        manualUrlValidation,
                        "_blank",
                        "noopener,noreferrer"
                      );
                    }}
                  >
                    <ExternalLink size={14} />
                    <span className="hidden sm:inline">Test link</span>
                  </Button>
                </div>
                {manualUrlHasError ? (
                  <span className="mt-1 block text-[11px] font-medium text-red-600">
                    Enter a valid URL, such as google.com or
                    https://your-site.com.
                  </span>
                ) : manualUrlValidation ? (
                  <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                    <CheckCircle2 size={13} className="animate-pulse" />
                    Valid destination: {manualUrlValidation}
                    {destinationTested ? " Test opened." : ""}
                  </span>
                ) : (
                  <span className="mt-1 block text-[11px] font-normal text-slate-400">
                    Type or paste any URL. Protocol is added automatically.
                  </span>
                )}
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                Or choose an existing smart link
                <select
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  value={linkId || ""}
                  onChange={e => {
                    setLinkId(Number(e.target.value) || null);
                    setManualUrl("");
                    setDestinationTested(false);
                  }}
                >
                  <option value="">Choose a smart link</option>
                  {links.data?.map(link => (
                    <option key={link.id} value={link.id}>
                      {link.customDomain || "knkt.af"}/{link.slug}
                    </option>
                  ))}
                </select>
                {selected ? (
                  <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                    <CheckCircle2 size={13} className="animate-pulse" />
                    Smart link selected and ready for QR generation.
                  </span>
                ) : null}
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                Quick colour theme
                <select
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  value={themeId}
                  onChange={e => {
                    const theme = qrThemes.find(
                      item => item.id === e.target.value
                    );
                    setThemeId(e.target.value);
                    if (theme) {
                      setForegroundColor(theme.foreground);
                      setBackgroundColor(theme.background);
                    }
                  }}
                >
                  {qrThemes.map(theme => (
                    <option key={theme.id} value={theme.id}>
                      {theme.label}
                    </option>
                  ))}
                  <option value="custom">Custom brand colours</option>
                </select>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="block text-xs font-semibold text-slate-600">
                  Foreground
                  <input
                    className="mt-1 h-10 w-full cursor-pointer rounded-md border border-slate-200 bg-white p-1"
                    type="color"
                    value={foregroundColor}
                    onChange={e => {
                      setThemeId("custom");
                      setForegroundColor(e.target.value);
                    }}
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-600">
                  Background
                  <input
                    className="mt-1 h-10 w-full cursor-pointer rounded-md border border-slate-200 bg-white p-1"
                    type="color"
                    value={backgroundColor}
                    onChange={e => {
                      setThemeId("custom");
                      setBackgroundColor(e.target.value);
                    }}
                  />
                </label>
              </div>
              <label className="block text-xs font-semibold text-slate-600">
                Pattern style
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
                Corner eye shape
                <select
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  value={cornerStyle}
                  onChange={e => setCornerStyle(e.target.value as CornerStyle)}
                >
                  <option value="rounded">Rounded eyes</option>
                  <option value="square">Square eyes</option>
                  <option value="circle">Circle eyes</option>
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
                  disabled={
                    !canSaveQr({
                      smartLinkId: linkId,
                      destinationUrl: manualUrl,
                      isValidManualUrl: Boolean(manualUrlValidation),
                    }) || createQr.isPending
                  }
                  className="rounded-full bg-[#003d32] text-white hover:bg-[#0b6b4f]"
                  onClick={() =>
                    createQr.mutate({
                      smartLinkId: linkId || undefined,
                      destinationUrl: manualUrl.trim() || undefined,
                      name,
                      foregroundColor,
                      backgroundColor,
                      shape,
                      cornerStyle,
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
                  onClick={downloadPng}
                >
                  <Download size={15} /> PNG
                </Button>
                <Button
                  variant="outline"
                  disabled={!preview}
                  className="rounded-full"
                  onClick={() => void downloadSvg()}
                >
                  <Download size={15} /> SVG
                </Button>
                <Button
                  variant="outline"
                  disabled={!preview}
                  className="rounded-full"
                  onClick={downloadPdf}
                >
                  <FileText size={15} /> PDF
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card className="qr-studio-preview-card qr-studio-preview rounded-2xl border-[#dfe9e4] shadow-sm">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-[#003d32]">
                <QrCode size={18} /> Live preview
              </CardTitle>
              <div
                className="preview-toggle"
                role="group"
                aria-label="Preview size"
              >
                <button
                  type="button"
                  className={previewMode === "mobile" ? "active" : ""}
                  onClick={() => setPreviewMode("mobile")}
                >
                  <Smartphone size={14} /> Mobile
                </button>
                <button
                  type="button"
                  className={previewMode === "desktop" ? "active" : ""}
                  onClick={() => setPreviewMode("desktop")}
                >
                  <Monitor size={14} /> Desktop
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div
                className="grid min-h-[390px] place-items-center rounded-2xl p-7"
                style={{ background: backgroundColor }}
              >
                <div
                  className={`qr-device-frame ${previewMode} rounded-2xl bg-white p-5 shadow-xl`}
                >
                  <span className="qr-device-label">
                    {previewMode === "mobile" ? "Mobile view" : "Desktop view"}
                  </span>
                  <img
                    src={preview}
                    alt={`QR code for ${manualUrl.trim() || selected?.slug || "Konnekt destination"}`}
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
                  ? `Linked to ${selected.customDomain || "knkt.af"}/${selected.slug}`
                  : "Choose a smart link to bind this QR code"}
              </div>
            </CardContent>
          </Card>
        </div>
        <Card className="mt-5 rounded-2xl border-[#dfe9e4] shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#003d32]">
              <History size={18} /> Recent QR history
            </CardTitle>
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
                        {qr.shape} / {qr.cornerStyle}
                      </Badge>
                    </div>
                    {editingQrId === qr.id ? (
                      <div className="flex gap-2">
                        <Input
                          value={editingQrName}
                          onChange={e => setEditingQrName(e.target.value)}
                          className="h-8 text-sm"
                          aria-label="Custom QR history name"
                        />
                        <Button
                          size="sm"
                          disabled={
                            renameQr.isPending ||
                            editingQrName.trim().length < 2
                          }
                          onClick={() => {
                            renameQr.mutate({
                              id: qr.id,
                              name: editingQrName.trim(),
                            });
                            setEditingQrId(null);
                          }}
                        >
                          Save
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <strong className="block truncate text-sm">
                          {qr.name}
                        </strong>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          aria-label={`Edit ${qr.name}`}
                          onClick={() => {
                            setEditingQrId(qr.id);
                            setEditingQrName(qr.name);
                          }}
                        >
                          <Pencil size={13} />
                        </Button>
                      </div>
                    )}
                    <span className="mt-1 block truncate text-xs text-slate-500">
                      {qr.destinationUrl ||
                        `Smart link ${qr.smartLinkId ?? ""}`}
                    </span>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadQrAsset(qr)}
                      >
                        Use again
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        disabled={removeQr.isPending}
                        onClick={() => removeQr.mutate({ id: qr.id })}
                      >
                        <Trash2 size={14} /> Remove
                      </Button>
                    </div>
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
