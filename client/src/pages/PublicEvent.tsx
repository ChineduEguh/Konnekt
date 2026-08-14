import { useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Loader2,
  MapPin,
  Ticket,
  Users,
} from "lucide-react";
import { useRoute } from "wouter";
import { toast } from "sonner";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import ThemeToggle from "@/components/ThemeToggle";
import { isEventFull, validatePublicRegistration } from "@shared/eventPublic";

export default function PublicEvent() {
  const [, params] = useRoute("/events/:eventId");
  const eventId = Number(params?.eventId || 0);
  const event = trpc.events.publicDetail.useQuery(
    { eventId },
    { enabled: Number.isInteger(eventId) && eventId > 0 }
  );
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [ticket, setTicket] = useState<{ code: string; qr: string } | null>(
    null
  );
  const register = trpc.events.register.useMutation({
    onSuccess: async result => {
      const qr = await QRCode.toDataURL(result.ticketCode, {
        width: 360,
        margin: 2,
        errorCorrectionLevel: "H",
        color: { dark: "#003d32", light: "#ffffff" },
      });
      setTicket({ code: result.ticketCode, qr });
      setForm({ name: "", email: "", phone: "" });
      toast.success("Registration complete. Your ticket is ready.");
    },
    onError: error => {
      const message = error.message.toLowerCase();
      toast.error(
        message.includes("duplicate")
          ? "This email is already registered for the event."
          : error.message
      );
    },
  });

  if (event.isLoading)
    return (
      <div className="grid min-h-screen place-items-center bg-[#f5f7f9]">
        <Loader2 className="animate-spin text-[#0b6b4f]" />
      </div>
    );
  if (!event.data)
    return (
      <div className="grid min-h-screen place-items-center bg-[#f5f7f9] p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <h1 className="text-xl font-semibold text-[#003d32]">
              Event unavailable
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              This event is unpublished, ended, or no longer available.
            </p>
          </CardContent>
        </Card>
      </div>
    );

  const publicEvent = event.data;
  const isFull = isEventFull(
    publicEvent.registrationCount,
    publicEvent.capacity
  );

  return (
    <div className="min-h-screen bg-[#f5f7f9] p-5 text-slate-900 md:p-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="eyebrow">KONNEKT EVENT</p>
            <p className="mt-1 text-sm text-slate-500">Public registration</p>
          </div>
          <ThemeToggle />
        </div>
        <Card className="overflow-hidden rounded-3xl border-[#dfe9e4] shadow-sm">
          <div className="bg-[#003d32] p-7 text-white md:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b7dfcf]">
              You are invited
            </p>
            <h1 className="mt-3 font-[Space_Grotesk] text-4xl font-semibold tracking-tight">
              {publicEvent.title}
            </h1>
            <div className="mt-5 grid gap-3 text-sm text-[#d9f8ec] sm:grid-cols-2">
              <span className="flex items-center gap-2">
                <CalendarDays size={16} />{" "}
                {new Date(publicEvent.startsAt).toLocaleString()}
              </span>
              {publicEvent.venue && (
                <span className="flex items-center gap-2">
                  <MapPin size={16} /> {publicEvent.venue}
                </span>
              )}
              <span className="flex items-center gap-2">
                <Users size={16} />{" "}
                {publicEvent.capacity
                  ? `${publicEvent.registrationCount} of ${publicEvent.capacity} registered`
                  : `${publicEvent.registrationCount} registered`}
              </span>
            </div>
          </div>
          <CardContent className="grid gap-8 p-6 md:grid-cols-[1fr_.9fr] md:p-10">
            <div>
              <h2 className="text-xl font-semibold text-[#003d32]">
                Reserve your place
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Complete the form to receive a unique ticket for this event.
              </p>
              {publicEvent.description && (
                <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                  {publicEvent.description}
                </p>
              )}
              {ticket && (
                <div className="mt-6 rounded-2xl border border-[#b7dfcf] bg-[#f4faf7] p-5">
                  <CheckCircle2 className="text-[#0b6b4f]" />
                  <p className="mt-3 text-sm font-semibold text-[#003d32]">
                    Registration confirmed
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Ticket code: <strong>{ticket.code}</strong>
                  </p>
                  <img
                    src={ticket.qr}
                    alt="Your event ticket QR code"
                    className="mt-4 h-44 w-44 rounded-xl bg-white p-2"
                  />
                </div>
              )}
            </div>
            <form
              className="space-y-4 rounded-2xl bg-[#f4faf7] p-5"
              onSubmit={e => {
                e.preventDefault();
                const validationError = validatePublicRegistration({
                  name: form.name,
                  email: form.email,
                });
                if (validationError) return toast.error(validationError);

                register.mutate({
                  eventId,
                  workspaceId: publicEvent.workspaceId,
                  attendeeName: form.name.trim(),
                  attendeeEmail: form.email.trim(),
                  attendeePhone: form.phone.trim() || undefined,
                });
              }}
            >
              <label className="block text-sm font-semibold text-[#245247]">
                Full name
                <Input
                  className="mt-1 bg-white"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required
                  minLength={2}
                />
              </label>
              <label className="block text-sm font-semibold text-[#245247]">
                Email address
                <Input
                  className="mt-1 bg-white"
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  required
                />
              </label>
              <label className="block text-sm font-semibold text-[#245247]">
                Phone number{" "}
                <span className="font-normal text-slate-400">optional</span>
                <Input
                  className="mt-1 bg-white"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                />
              </label>
              <Button
                type="submit"
                disabled={isFull || register.isPending}
                className="w-full rounded-full bg-[#0b6b4f] text-white hover:bg-[#095a43]"
              >
                {register.isPending ? (
                  <Loader2 className="animate-spin" size={15} />
                ) : (
                  <Ticket size={15} />
                )}{" "}
                {isFull ? "Event is full" : "Register for this event"}
              </Button>
              {isFull && (
                <p className="text-center text-xs font-medium text-[#b45309]">
                  Capacity has been reached.
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
