import { useState } from "react";
import { Link } from "wouter";
import QRCode from "qrcode";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Link2,
  Search,
  Loader2,
  Mail,
  MapPin,
  Plus,
  ScanLine,
  Ticket,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";

export default function Events() {
  const { isAuthenticated, loading } = useAuth();
  const [selectedEvent, setSelectedEvent] = useState<number | null>(null);
  const [checkInCode, setCheckInCode] = useState("");
  const [attendeeSearch, setAttendeeSearch] = useState("");
  const [attendeeStatus, setAttendeeStatus] = useState<
    "all" | "registered" | "checked_in"
  >("all");
  const [eventFont, setEventFont] = useState("Space Grotesk");
  const [eventCreativeName, setEventCreativeName] = useState("");
  const [eventCreativeUrl, setEventCreativeUrl] = useState("");
  const [form, setForm] = useState({
    title: "",
    venue: "",
    startsAt: "",
    capacity: "",
  });
  const [attendee, setAttendee] = useState({ name: "", email: "", phone: "" });
  const [ticketQr, setTicketQr] = useState<{
    code: string;
    dataUrl: string;
  } | null>(null);
  const workspace = trpc.workspace.current.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const events = trpc.events.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const registrations = trpc.events.registrations.useQuery(
    { eventId: selectedEvent || 0 },
    { enabled: Boolean(selectedEvent) }
  );
  const createEvent = trpc.events.create.useMutation({
    onSuccess: () => {
      events.refetch();
      setForm({ title: "", venue: "", startsAt: "", capacity: "" });
      toast.success("Event created");
    },
    onError: e => toast.error(e.message),
  });
  const register = trpc.events.register.useMutation({
    onSuccess: result => {
      registrations.refetch();
      setAttendee({ name: "", email: "", phone: "" });
      QRCode.toDataURL(result.ticketCode, {
        width: 480,
        margin: 2,
        errorCorrectionLevel: "H",
        color: { dark: "#003D32", light: "#FFFFFF" },
      }).then(dataUrl => setTicketQr({ code: result.ticketCode, dataUrl }));
      toast.success(`Ticket issued: ${result.ticketCode}`);
    },
    onError: e =>
      toast.error(
        e.message.includes("Duplicate")
          ? "This attendee is already registered"
          : e.message
      ),
  });
  function downloadAttendees() {
    const rows = registrations.data || [];
    const escape = (value: unknown) =>
      `"${String(value ?? "").replaceAll('"', '""')}"`;
    const csv = [
      "name,email,phone,ticket_code,status,registered_at,checked_in_at",
      ...rows.map(row =>
        [
          row.attendeeName,
          row.attendeeEmail,
          row.attendeePhone,
          row.ticketCode,
          row.status,
          row.registeredAt,
          row.checkedInAt,
        ]
          .map(escape)
          .join(",")
      ),
    ].join("\\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" })
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `konnekt-attendees-${selectedEvent}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  const checkIn = trpc.events.checkIn.useMutation({
    onSuccess: result => {
      registrations.refetch();
      setCheckInCode("");
      toast[result.status === "checked_in" ? "success" : "error"](
        result.status === "checked_in"
          ? "Attendee checked in"
          : result.status.replaceAll("_", " ")
      );
    },
  });
  if (loading)
    return (
      <div className="min-h-screen grid place-items-center bg-[#f5f7f9]">
        <Loader2 className="animate-spin text-[#0b6b4f]" />
      </div>
    );
  if (!isAuthenticated)
    return (
      <div className="min-h-screen grid place-items-center bg-[#f5f7f9] p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <CalendarDays className="mx-auto mb-4 text-[#0b6b4f]" />
            <p>Sign in to manage events.</p>
          </CardContent>
        </Card>
      </div>
    );
  return (
    <div className="min-h-screen bg-[#f5f7f9] p-5 text-slate-900 md:p-10">
      <div className="mx-auto max-w-7xl">
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
            <p className="eyebrow">KONNEKT EVENTS</p>
            <h1 className="mt-2 font-[Space_Grotesk] text-4xl font-semibold tracking-tight text-[#003d32]">
              Manage attendance as a journey.
            </h1>
            <p className="mt-2 text-slate-500">
              Create events, issue unique tickets, and check guests in without
              duplicate entries.
            </p>
          </div>
          <Badge className="rounded-full bg-[#ddf8ec] px-3 py-1 text-[#087443] hover:bg-[#ddf8ec]">
            <ClipboardCheck size={14} className="mr-1" /> Workspace{" "}
            {workspace.data?.name || "ready"}
          </Badge>
        </div>
        <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
          <Card className="rounded-2xl border-[#dfe9e4] shadow-sm">
            <CardHeader style={{ fontFamily: eventFont }}>
              <CardTitle className="flex items-center gap-2 text-[#003d32]">
                <Plus size={18} /> Create an event
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="block text-xs font-semibold text-slate-600">
                Event name
                <Input
                  className="mt-1"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="Konnekt Connect Lagos"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                Venue
                <Input
                  className="mt-1"
                  value={form.venue}
                  onChange={e => setForm({ ...form, venue: e.target.value })}
                  placeholder="Landmark Centre"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-semibold text-slate-600">
                  Starts at
                  <Input
                    className="mt-1"
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={e =>
                      setForm({ ...form, startsAt: e.target.value })
                    }
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-600">
                  Capacity
                  <Input
                    className="mt-1"
                    type="number"
                    min="1"
                    value={form.capacity}
                    onChange={e =>
                      setForm({ ...form, capacity: e.target.value })
                    }
                    placeholder="250"
                  />
                </label>
              </div>
              <label className="block text-xs font-semibold text-slate-600">
                Event font
                <select
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  value={eventFont}
                  onChange={e => setEventFont(e.target.value)}
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
                    setEventCreativeName(file.name);
                    setEventCreativeUrl(URL.createObjectURL(file));
                  }}
                />
                <span className="mt-1 block text-[11px] font-normal text-slate-400">
                  Optional event creative preview. Uploads remain local until
                  storage is connected.
                </span>
              </label>
              {eventCreativeUrl ? (
                <div className="overflow-hidden rounded-xl border border-[#dfe9e4] bg-white">
                  {eventCreativeName.match(/\.(mp4|webm)$/i) ? (
                    <video
                      src={eventCreativeUrl}
                      controls
                      className="max-h-40 w-full object-cover"
                    />
                  ) : (
                    <img
                      src={eventCreativeUrl}
                      alt={eventCreativeName}
                      className="max-h-40 w-full object-cover"
                    />
                  )}
                  <p className="truncate px-3 py-2 text-xs text-slate-500">
                    {eventCreativeName}
                  </p>
                </div>
              ) : null}
              <Button
                className="w-full rounded-full bg-[#003d32] text-white hover:bg-[#0b6b4f]"
                disabled={
                  !form.title || !form.startsAt || createEvent.isPending
                }
                onClick={() =>
                  createEvent.mutate({
                    title: form.title,
                    venue: form.venue || undefined,
                    startsAt: new Date(form.startsAt),
                    capacity: form.capacity ? Number(form.capacity) : undefined,
                    status: "published",
                  })
                }
              >
                <CalendarDays size={15} /> Create published event
              </Button>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-[#dfe9e4] shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#003d32]">
                <CalendarDays size={18} /> Your events
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {events.data?.length ? (
                events.data.map(event => (
                  <button
                    key={event.id}
                    onClick={() => setSelectedEvent(event.id)}
                    className={`w-full rounded-xl border p-4 text-left transition ${selectedEvent === event.id ? "border-[#0b6b4f] bg-[#f0fbf5]" : "border-slate-200 bg-white hover:border-[#9dccba]"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <strong
                          className="block text-base text-[#003d32]"
                          style={{ fontFamily: eventFont }}
                        >
                          {event.title}
                        </strong>
                        <span className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                          <CalendarDays size={12} />{" "}
                          {new Date(event.startsAt).toLocaleString()}
                        </span>
                        {event.venue && (
                          <span className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                            <MapPin size={12} /> {event.venue}
                          </span>
                        )}
                      </div>
                      <Badge variant="outline" className="rounded-full">
                        {event.status}
                      </Badge>
                    </div>
                  </button>
                ))
              ) : (
                <div className="grid min-h-56 place-items-center text-center text-slate-500">
                  <div>
                    <CalendarDays className="mx-auto mb-2 text-[#0b6b4f]" />
                    <p className="text-sm">No events yet</p>
                    <p className="text-xs">
                      Create an event to start managing attendees.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        {selectedEvent && (
          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]">
            <Card className="rounded-2xl border-[#dfe9e4] shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#003d32]">
                  <UserPlus size={18} /> Register attendee
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Full name"
                  value={attendee.name}
                  onChange={e =>
                    setAttendee({ ...attendee, name: e.target.value })
                  }
                />
                <Input
                  type="email"
                  placeholder="Email address"
                  value={attendee.email}
                  onChange={e =>
                    setAttendee({ ...attendee, email: e.target.value })
                  }
                />
                <Input
                  placeholder="Phone number"
                  value={attendee.phone}
                  onChange={e =>
                    setAttendee({ ...attendee, phone: e.target.value })
                  }
                />
                <Button
                  className="rounded-full bg-[#e46f2e] hover:bg-[#c95f25]"
                  disabled={
                    !attendee.name || !attendee.email || register.isPending
                  }
                  onClick={() =>
                    register.mutate({
                      eventId: selectedEvent,
                      workspaceId: workspace.data!.id,
                      attendeeName: attendee.name,
                      attendeeEmail: attendee.email,
                      attendeePhone: attendee.phone || undefined,
                    })
                  }
                >
                  <Ticket size={15} /> Issue QR ticket
                </Button>
              </CardContent>
            </Card>
            {ticketQr && (
              <Card className="rounded-2xl border-[#dfe9e4] shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-[#003d32]">
                    <Ticket size={18} /> Ticket QR
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <img
                    src={ticketQr.dataUrl}
                    alt={`Ticket ${ticketQr.code}`}
                    className="mx-auto h-44 w-44 rounded-xl"
                  />
                  <p className="mt-3 font-mono text-xs text-slate-500">
                    {ticketQr.code}
                  </p>
                  <a
                    className="mt-3 inline-flex items-center rounded-full bg-[#003d32] px-4 py-2 text-xs font-semibold text-white"
                    href={ticketQr.dataUrl}
                    download={`${ticketQr.code}.png`}
                  >
                    <Download size={14} className="mr-1" /> Download ticket QR
                  </a>
                </CardContent>
              </Card>
            )}
            <Card className="rounded-2xl border-[#dfe9e4] shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#003d32]">
                  <ScanLine size={18} /> Check in attendee
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-500">
                  Enter the ticket code from the guest QR ticket. Repeated scans
                  are safely rejected.
                </p>
                <div className="flex gap-2">
                  <Input
                    value={checkInCode}
                    onChange={e => setCheckInCode(e.target.value.toUpperCase())}
                    placeholder="KNT-XXXXXXXXXXXX"
                  />
                  <Button
                    className="rounded-full bg-[#003d32]"
                    disabled={!checkInCode || checkIn.isPending}
                    onClick={() => checkIn.mutate({ ticketCode: checkInCode })}
                  >
                    <CheckCircle2 size={15} /> Check in
                  </Button>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-[#dfe9e4] shadow-sm lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#003d32]">
                  <Users size={18} /> Attendee list{" "}
                  <Badge variant="outline" className="ml-1 rounded-full">
                    {registrations.data?.length || 0}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-auto rounded-full"
                    disabled={!registrations.data?.length}
                    onClick={downloadAttendees}
                  >
                    <Download size={14} /> Export CSV
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_180px]">
                  <label className="relative block">
                    <Search
                      size={16}
                      className="absolute left-3 top-3 text-slate-400"
                    />
                    <Input
                      className="pl-9"
                      value={attendeeSearch}
                      onChange={e => setAttendeeSearch(e.target.value)}
                      placeholder="Search name, email, phone, or ticket"
                    />
                  </label>
                  <select
                    className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
                    value={attendeeStatus}
                    onChange={e =>
                      setAttendeeStatus(e.target.value as typeof attendeeStatus)
                    }
                  >
                    <option value="all">All statuses</option>
                    <option value="registered">Registered</option>
                    <option value="checked_in">Checked in</option>
                  </select>
                </div>
                {(() => {
                  const needle = attendeeSearch.trim().toLowerCase();
                  const filtered = (registrations.data || []).filter(row => {
                    const matchesStatus =
                      attendeeStatus === "all" || row.status === attendeeStatus;
                    const haystack =
                      `${row.attendeeName} ${row.attendeeEmail} ${row.attendeePhone || ""} ${row.ticketCode}`.toLowerCase();
                    return (
                      matchesStatus && (!needle || haystack.includes(needle))
                    );
                  });
                  return registrations.data?.length ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="border-b text-xs text-slate-500">
                          <tr>
                            <th className="pb-3">Attendee</th>
                            <th className="pb-3">Ticket</th>
                            <th className="pb-3">Status</th>
                            <th className="pb-3">Registered</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map(row => (
                            <tr key={row.id} className="border-b last:border-0">
                              <td className="py-3">
                                <strong>{row.attendeeName}</strong>
                                <span className="block text-xs text-slate-500">
                                  {row.attendeeEmail}
                                </span>
                              </td>
                              <td className="py-3 font-mono text-xs">
                                {row.ticketCode}
                              </td>
                              <td className="py-3">
                                <Badge
                                  className={
                                    row.status === "checked_in"
                                      ? "bg-[#ddf8ec] text-[#087443] hover:bg-[#ddf8ec]"
                                      : "bg-slate-100 text-slate-600 hover:bg-slate-100"
                                  }
                                >
                                  {row.status.replaceAll("_", " ")}
                                </Badge>
                              </td>
                              <td className="py-3 text-xs text-slate-500">
                                {new Date(row.registeredAt).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="py-8 text-center text-sm text-slate-500">
                      {needle || attendeeStatus !== "all"
                        ? "No attendees match these filters."
                        : "No attendees registered for this event yet."}
                    </p>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
