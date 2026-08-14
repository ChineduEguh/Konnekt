import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, MessageSquare, Plus, UserRound } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Customers() {
  const { isAuthenticated } = useAuth();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const utils = trpc.useUtils();
  const contacts = trpc.contacts.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const timeline = trpc.conversations.timeline.useQuery(
    { contactId: selectedId ?? 0 },
    { enabled: Boolean(selectedId) && isAuthenticated }
  );
  const createContact = trpc.contacts.create.useMutation({
    onSuccess: created => {
      toast.success("Contact profile created");
      setForm({ name: "", email: "", phone: "" });
      void utils.contacts.list.invalidate();
      if (created) setSelectedId(created.id);
    },
    onError: error => toast.error(error.message),
  });

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen grid place-items-center bg-background px-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <UserRound className="mx-auto text-primary" />
            <h1 className="text-2xl font-semibold">Customers</h1>
            <p className="text-muted-foreground">
              Sign in to manage workspace contact profiles.
            </p>
            <Button onClick={() => startLogin()} className="w-full">
              Sign in
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground px-4 py-5 sm:px-8 lg:px-12">
      <header className="mx-auto max-w-7xl flex items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="outline" size="icon" aria-label="Back to overview">
              <ArrowLeft size={16} />
            </Button>
          </Link>
          <div>
            <p className="eyebrow">CRM</p>
            <h1 className="text-2xl sm:text-3xl font-semibold">Customers</h1>
          </div>
        </div>
        <ThemeToggle />
      </header>
      <div className="mx-auto max-w-7xl grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3">
            <CardTitle>Contact profiles</CardTitle>
            <span className="text-sm text-muted-foreground">
              {contacts.data?.length ?? 0} profiles
            </span>
          </CardHeader>
          <CardContent className="space-y-3">
            {contacts.isLoading ? (
              <p className="text-muted-foreground">Loading contacts...</p>
            ) : null}
            {!contacts.isLoading && !contacts.data?.length ? (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <UserRound className="mx-auto mb-3 text-primary" />
                <p className="font-medium">No customer profiles yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Create a profile to start a tenant-scoped activity timeline.
                </p>
              </div>
            ) : null}
            {contacts.data?.map(contact => (
              <button
                key={contact.id}
                onClick={() => setSelectedId(contact.id)}
                className={`w-full text-left rounded-xl border p-4 transition-colors ${selectedId === contact.id ? "border-primary bg-primary/10" : "hover:bg-muted/60"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {contact.name || "Unnamed contact"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {contact.email || contact.phone || "No contact channel"}
                    </p>
                  </div>
                  <MessageSquare size={17} className="text-primary" />
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Label htmlFor="customer-name">Name</Label>
              <Input
                id="customer-name"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Customer name"
              />
              <Label htmlFor="customer-email">Email</Label>
              <Input
                id="customer-email"
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="name@example.com"
              />
              <Label htmlFor="customer-phone">Phone</Label>
              <Input
                id="customer-phone"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                placeholder="+234..."
              />
              <Button
                className="w-full"
                disabled={
                  createContact.isPending || (!form.email && !form.phone)
                }
                onClick={() =>
                  createContact.mutate({
                    name: form.name || undefined,
                    email: form.email || undefined,
                    phone: form.phone || undefined,
                    whatsappOptIn: Boolean(form.phone),
                  })
                }
              >
                <Plus size={16} />
                Create profile
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Activity timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!selectedId ? (
                <p className="text-sm text-muted-foreground">
                  Select a contact to view recorded WhatsApp activity.
                </p>
              ) : null}
              {selectedId && timeline.isLoading ? (
                <p className="text-sm text-muted-foreground">
                  Loading activity...
                </p>
              ) : null}
              {selectedId && !timeline.isLoading && !timeline.data?.length ? (
                <p className="text-sm text-muted-foreground">
                  No conversation activity recorded yet.
                </p>
              ) : null}
              {timeline.data?.map(message => (
                <div key={message.id} className="rounded-lg bg-muted/50 p-3">
                  <div className="flex justify-between gap-3 text-xs text-muted-foreground">
                    <span>
                      {message.direction === "inbound" ? "Inbound" : "Outbound"}
                    </span>
                    <span>{message.deliveryStatus}</span>
                  </div>
                  <p className="mt-1 text-sm">{message.body}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
