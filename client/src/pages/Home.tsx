import { useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowUpRight,
  BarChart3,
  Bot,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  ExternalLink,
  Link2,
  LogIn,
  Menu,
  MousePointerClick,
  QrCode,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { toast } from "sonner";

const nav = [
  { label: "Overview", icon: BarChart3 },
  { label: "Smart links", icon: Link2 },
  { label: "QR Studio", icon: QrCode },
  { label: "Events", icon: BriefcaseBusiness },
  { label: "Customers", icon: Users },
  { label: "Conversations", icon: Send },
];

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Link2;
  tone: string;
}) {
  return (
    <Card className="metric-card">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">{label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              {value}
            </p>
          </div>
          <span className={`metric-icon ${tone}`}>
            <Icon size={18} />
          </span>
        </div>
        <p className="mt-3 flex items-center gap-1 text-xs text-slate-500">
          <ArrowUpRight size={13} className="text-emerald-600" />
          {detail}
        </p>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [slug, setSlug] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [campaign, setCampaign] = useState("");
  const workspaceQuery = trpc.workspace.current.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const summaryQuery = trpc.workspace.summary.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const linksQuery = trpc.links.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const createLink = trpc.links.create.useMutation({
    onSuccess: () => {
      linksQuery.refetch();
      summaryQuery.refetch();
      setSlug("");
      setDestinationUrl("");
      toast.success("Smart link created");
    },
    onError: error => toast.error(error.message),
  });
  const slugSuggestion = trpc.ai.suggestSlug.useMutation({
    onSuccess: result => {
      setSlug(result.suggestion);
      toast.success("Slug suggestion ready");
    },
  });
  const utmSuggestion = trpc.ai.generateUtm.useMutation({
    onSuccess: result =>
      toast.success(
        `${result.utmSource} / ${result.utmMedium} / ${result.utmCampaign}`
      ),
  });
  const summary = summaryQuery.data;
  const currentLinks = linksQuery.data ?? [];
  const activity = useMemo(
    () => summary?.recentEvents ?? [],
    [summary?.recentEvents]
  );

  if (loading)
    return (
      <div className="min-h-screen bg-[#f5f7f9] grid place-items-center">
        <div className="loading-orb" />
      </div>
    );
  if (!isAuthenticated)
    return (
      <div className="marketing-shell">
        <header className="marketing-nav">
          <div className="brand-mark">
            <span>K</span>
            <strong>Konnekt</strong>
          </div>
          <Button
            onClick={() => startLogin()}
            variant="outline"
            className="rounded-full border-slate-300 bg-white"
          >
            Sign in <LogIn size={15} />
          </Button>
        </header>
        <main className="hero-grid">
          <section className="hero-copy">
            <Badge className="rounded-full bg-[#d9f8ec] px-3 py-1 text-[#087443] hover:bg-[#d9f8ec]">
              Africa's connection infrastructure
            </Badge>
            <h1>
              Turn every touchpoint into a <em>relationship.</em>
            </h1>
            <p>
              Smart links, QR journeys, events, conversations, and customer
              intelligence in one operating system built for how Africa
              connects.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => startLogin()}
                className="rounded-full bg-[#0b6b4f] px-6 text-white shadow-[0_12px_28px_rgba(11,107,79,0.22)] hover:bg-[#095a43]"
              >
                Open your workspace <ArrowUpRight size={16} />
              </Button>
              <Button
                variant="outline"
                className="rounded-full border-[#b7dfcf] bg-white text-[#245247] hover:bg-[#f0faf5]"
              >
                Explore the platform <ChevronRight size={16} />
              </Button>
            </div>
            <div className="hero-proof">
              <div className="proof-avatar">N</div>
              <div>
                <strong>Built for connected growth</strong>
                <span>From first scan to long-term loyalty</span>
              </div>
            </div>
          </section>
          <section className="hero-visual">
            <div className="visual-glow" />
            <div className="connection-card">
              <div className="connection-top">
                <span className="status-dot" /> Live connection map{" "}
                <span className="ml-auto text-xs text-slate-400">Today</span>
              </div>
              <div className="connection-line line-a" />
              <div className="connection-line line-b" />
              <div className="connection-node node-a">
                <Link2 size={17} />
                <span>Smart link</span>
              </div>
              <div className="connection-node node-b">
                <QrCode size={17} />
                <span>QR journey</span>
              </div>
              <div className="connection-node node-c">
                <Send size={17} />
                <span>WhatsApp</span>
              </div>
              <div className="connection-center">
                <span>∞</span>
                <small>CONNECT</small>
              </div>
              <div className="visual-footer">
                <span>Connection</span>
                <strong>→ Conversation → Transaction</strong>
              </div>
            </div>
          </section>
        </main>
        <section className="platform-strip">
          <div>
            <span>CONNECT</span>
            <span>CONVERSE</span>
            <span>TRANSACT</span>
            <span>MEASURE</span>
            <span>RETAIN</span>
            <span>OPTIMIZE</span>
          </div>
        </section>
      </div>
    );

  return (
    <div className="app-shell">
      <aside className={`app-sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="sidebar-top">
          <div className="brand-mark">
            <span>K</span>
            <strong>Konnekt</strong>
          </div>
          <button className="mobile-close" onClick={() => setMobileOpen(false)}>
            <X size={18} />
          </button>
        </div>
        <div className="workspace-switcher">
          <div className="workspace-avatar">
            {(workspaceQuery.data?.name || "K").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <span className="workspace-label">WORKSPACE</span>
            <strong className="block truncate">
              {workspaceQuery.data?.name || "Your workspace"}
            </strong>
          </div>
          <ChevronRight size={15} className="ml-auto text-slate-400" />
        </div>
        <nav className="sidebar-nav">
          {nav.map((item, index) => (
            <button
              className={`nav-item ${index === 0 ? "active" : ""}`}
              key={item.label}
              onClick={() =>
                index === 2
                  ? (window.location.href = "/qr-studio")
                  : index === 3
                    ? (window.location.href = "/events")
                    : index !== 0 &&
                      toast.info(
                        `${item.label} workspace is ready for your next build step`
                      )
              }
            >
              <item.icon size={17} />
              <span>{item.label}</span>
              {index === 1 && (
                <Badge className="ml-auto bg-[#d9f8ec] text-[10px] text-[#087443] hover:bg-[#d9f8ec]">
                  Core
                </Badge>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            className="nav-item"
            onClick={() =>
              toast.info("Settings are available as the workspace grows")
            }
          >
            <Settings2 size={17} />
            <span>Workspace settings</span>
          </button>
          <button
            className="nav-item"
            onClick={() => toast.info("Help center coming soon")}
          >
            <CircleHelp size={17} />
            <span>Help center</span>
          </button>
          <div className="profile-row">
            <div className="profile-avatar">
              {(user?.name || "U").slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <strong className="block truncate text-sm">
                {user?.name || "Workspace member"}
              </strong>
              <span className="block truncate text-xs text-slate-500">
                {user?.email || "Signed in"}
              </span>
            </div>
            <button onClick={() => logout()} aria-label="Sign out">
              <ExternalLink size={14} className="text-slate-400" />
            </button>
          </div>
        </div>
      </aside>
      <main className="app-main">
        <header className="app-header">
          <button className="mobile-menu" onClick={() => setMobileOpen(true)}>
            <Menu size={20} />
          </button>
          <div>
            <p className="eyebrow">WORKSPACE OVERVIEW</p>
            <h1>Good morning, {user?.name?.split(" ")[0] || "there"}.</h1>
          </div>
          <div className="header-actions">
            <a
              href="/analytics"
              className="hidden rounded-full border border-[#b7dfcf] bg-white px-4 py-2 text-sm font-semibold text-[#0b6b4f] transition hover:bg-[#f1fbf6] sm:inline-flex"
            >
              Analytics
            </a>
            <Badge
              variant="outline"
              className="hidden rounded-full border-[#b7dfcf] bg-[#f1fbf6] px-3 py-1 text-[#087443] sm:flex"
            >
              <ShieldCheck size={14} className="mr-1" /> Protected workspace
            </Badge>
            <Button
              className="rounded-full bg-[#0b6b4f] hover:bg-[#095a43]"
              onClick={() =>
                document
                  .getElementById("create-link")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              <Link2 size={16} /> Create connection
            </Button>
          </div>
        </header>
        <section className="main-content">
          <div className="intro-row">
            <div>
              <p className="section-kicker">YOUR CONNECTION LAYER</p>
              <h2>One workspace. Every customer journey.</h2>
              <p className="section-description">
                Orchestrate how people discover, engage, transact, and come
                back.
              </p>
            </div>
            <div className="date-pill">
              <Clock3 size={15} /> Last 30 days
            </div>
          </div>
          <div className="metrics-grid">
            <MetricCard
              label="Connections"
              value={String(summary?.clicks ?? 0)}
              detail="Clicks captured"
              icon={MousePointerClick}
              tone="green"
            />
            <MetricCard
              label="QR scans"
              value={String(summary?.scans ?? 0)}
              detail="Scans captured"
              icon={QrCode}
              tone="orange"
            />
            <MetricCard
              label="Smart links"
              value={String(summary?.links ?? 0)}
              detail="Active destinations"
              icon={Link2}
              tone="blue"
            />
            <MetricCard
              label="Customers"
              value={String(summary?.contacts ?? 0)}
              detail="Profiles in workspace"
              icon={Users}
              tone="purple"
            />
          </div>
          <div className="dashboard-grid">
            <Card className="chart-card">
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Connection activity</CardTitle>
                  <p className="mt-1 text-xs text-slate-500">
                    Every click and scan becomes a signal.
                  </p>
                </div>
                <Tabs defaultValue="connections">
                  <TabsList className="h-8 bg-slate-100">
                    <TabsTrigger value="connections" className="h-7 text-xs">
                      Connections
                    </TabsTrigger>
                    <TabsTrigger value="conversion" className="h-7 text-xs">
                      Conversion
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              <CardContent>
                <div className="chart-placeholder">
                  <div className="chart-grid-lines">
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                  <div className="chart-empty">
                    <div className="chart-orb">
                      <BarChart3 size={20} />
                    </div>
                    <strong>Activity will appear here</strong>
                    <span>Publish a link or QR code to start measuring.</span>
                  </div>
                  <div className="chart-axis">
                    <span>Mon</span>
                    <span>Tue</span>
                    <span>Wed</span>
                    <span>Thu</span>
                    <span>Fri</span>
                    <span>Sat</span>
                    <span>Sun</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="activity-card">
              <CardHeader>
                <CardTitle>Recent signals</CardTitle>
                <p className="mt-1 text-xs text-slate-500">
                  Your latest connection events
                </p>
              </CardHeader>
              <CardContent>
                {activity.length ? (
                  activity.map(event => (
                    <div className="activity-item" key={event.id}>
                      <span className="activity-icon">
                        <MousePointerClick size={14} />
                      </span>
                      <div className="min-w-0">
                        <strong className="block text-sm">
                          {event.eventType} recorded
                        </strong>
                        <span className="text-xs text-slate-500">
                          {new Date(event.occurredAt).toLocaleString()}
                        </span>
                      </div>
                      <ChevronRight
                        size={15}
                        className="ml-auto text-slate-300"
                      />
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon">
                      <Sparkles size={18} />
                    </div>
                    <strong>No activity yet</strong>
                    <span>
                      Your first click, scan, or registration will show here.
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          <div className="bottom-grid">
            <Card id="create-link" className="create-card">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="card-icon">
                    <Link2 size={17} />
                  </div>
                  <div>
                    <CardTitle>Create a smart link</CardTitle>
                    <p className="mt-1 text-xs text-slate-500">
                      Make a measurable doorway into your customer journey.
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="form-grid">
                  <div>
                    <label>Destination URL</label>
                    <Input
                      value={destinationUrl}
                      onChange={e => setDestinationUrl(e.target.value)}
                      placeholder="https://yourbrand.com/campaign"
                    />
                  </div>
                  <div>
                    <label>Custom slug</label>
                    <div className="input-prefix">
                      <span>knkt.af/</span>
                      <Input
                        value={slug}
                        onChange={e =>
                          setSlug(
                            e.target.value.toLowerCase().replace(/\s+/g, "-")
                          )
                        }
                        placeholder="your-campaign"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-4">
                  <Button
                    disabled={!destinationUrl || !slug || createLink.isPending}
                    onClick={() => createLink.mutate({ slug, destinationUrl })}
                    className="rounded-full bg-[#0b6b4f] hover:bg-[#095a43]"
                  >
                    <Link2 size={15} />{" "}
                    {createLink.isPending ? "Creating..." : "Create link"}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!campaign || slugSuggestion.isPending}
                    onClick={() => slugSuggestion.mutate({ campaign })}
                    className="rounded-full"
                  >
                    <Sparkles size={15} /> Suggest slug
                  </Button>
                  <Input
                    value={campaign}
                    onChange={e => setCampaign(e.target.value)}
                    className="max-w-[220px] rounded-full"
                    placeholder="Campaign description"
                  />
                  <Button
                    variant="ghost"
                    disabled={!campaign}
                    onClick={() => utmSuggestion.mutate({ campaign })}
                    className="rounded-full text-slate-500"
                  >
                    <Bot size={15} /> Generate UTM
                  </Button>
                </div>
              </CardContent>
            </Card>
            <Card className="links-card">
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Your smart links</CardTitle>
                  <p className="mt-1 text-xs text-slate-500">
                    A live view of your destinations
                  </p>
                </div>
                <Badge variant="outline" className="rounded-full">
                  {currentLinks.length}
                </Badge>
              </CardHeader>
              <CardContent>
                {currentLinks.length ? (
                  currentLinks.slice(0, 4).map(link => (
                    <div className="link-row" key={link.id}>
                      <div className="link-symbol">
                        <Link2 size={15} />
                      </div>
                      <div className="min-w-0">
                        <strong className="block truncate text-sm">
                          knkt.af/{link.slug}
                        </strong>
                        <span className="block max-w-[180px] truncate text-xs text-slate-500">
                          {link.destinationUrl}
                        </span>
                      </div>
                      <Badge className="ml-auto bg-[#eaf7f1] text-[10px] text-[#087443] hover:bg-[#eaf7f1]">
                        Active
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="empty-state compact">
                    <div className="empty-icon">
                      <Link2 size={18} />
                    </div>
                    <strong>No links created</strong>
                    <span>Create your first measurable connection.</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          <div className="capability-row">
            <div>
              <span className="section-kicker">BUILT FOR THE LOOP</span>
              <h3>From connection to retention.</h3>
            </div>
            <div className="capability-chips">
              <span>
                <QrCode size={14} /> QR journeys
              </span>
              <span>
                <BriefcaseBusiness size={14} /> Events
              </span>
              <span>
                <Send size={14} /> WhatsApp
              </span>
              <span>
                <WalletCards size={14} /> Payments later
              </span>
              <span>
                <Bot size={14} /> AI assist
              </span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
