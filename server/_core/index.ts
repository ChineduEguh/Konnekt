import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { findLinkBySlug, recordConnectionEvent } from "../db";
import { createContext } from "./context";
import {
  detectBrowser,
  detectDevice,
  matchesRoutingRules,
  verifyPassword,
} from "../security";
import { handleWeeklyDigest } from "../scheduled";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.get(["/r/:slug", "/:slug"], async (req, res, next) => {
    const startedAt = performance.now();
    const isRedirectPath = req.path.startsWith("/r/");
    const slug = isRedirectPath ? req.params.slug : req.path.slice(1);
    try {
      const link = await findLinkBySlug(slug);
      if (!link)
        return isRedirectPath
          ? res.status(404).json({ error: "connection-not-found" })
          : next();
      const requestHost = String(req.hostname || "").toLowerCase();
      const customHostMatches = Boolean(
        link.customDomain && link.customDomain.toLowerCase() === requestHost
      );
      if (!isRedirectPath && !customHostMatches) return next();
      if (link.expiresAt && link.expiresAt.getTime() < Date.now())
        return res.status(410).json({ error: "connection-expired" });
      if (
        link.passwordHash &&
        (!String(req.query.password || "") ||
          !verifyPassword(String(req.query.password || ""), link.passwordHash))
      ) {
        return res.status(401).json({ error: "connection-password-required" });
      }
      const userAgent = String(req.headers["user-agent"] || "");
      const country = String(
        req.headers["cf-ipcountry"] || req.headers["x-country"] || ""
      ).toLowerCase();
      if (
        !matchesRoutingRules(
          link.routingRules as Record<string, string>,
          userAgent,
          country
        )
      ) {
        return res.status(404).json({ error: "connection-routing-miss" });
      }
      const destination = new URL(link.destinationUrl);
      if (link.utmSource)
        destination.searchParams.set("utm_source", link.utmSource);
      if (link.utmMedium)
        destination.searchParams.set("utm_medium", link.utmMedium);
      if (link.utmCampaign)
        destination.searchParams.set("utm_campaign", link.utmCampaign);
      void recordConnectionEvent({
        workspaceId: link.workspaceId,
        linkId: link.id,
        eventType: req.query.source === "qr" ? "scan" : "click",
        ipAddress:
          String(req.headers["x-forwarded-for"] || "").split(",")[0] || null,
        referrer: req.headers.referer || null,
        country:
          String(
            req.headers["cf-ipcountry"] || req.headers["x-country"] || ""
          ) || null,
        deviceType: detectDevice(String(req.headers["user-agent"] || "")),
        browser: detectBrowser(String(req.headers["user-agent"] || "")),
        utmSource: link.utmSource,
        utmMedium: link.utmMedium,
        utmCampaign: link.utmCampaign,
        metadata: {
          userAgent: req.headers["user-agent"] || null,
          resolutionMs: Number((performance.now() - startedAt).toFixed(2)),
        },
      });
      return res.redirect(302, destination.toString());
    } catch {
      return res.status(500).json({ error: "connection-resolution-failed" });
    }
  });
  app.post("/api/scheduled/weeklyDigest", handleWeeklyDigest);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
