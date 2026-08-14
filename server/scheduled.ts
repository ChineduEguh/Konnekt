import type { Request, Response } from "express";
import { getWorkspaceByScheduleCronTaskUid, getWorkspaceSummary } from "./db";
import { compileWeeklyDigest } from "./providers";
import { sdk } from "./_core/sdk";

export async function handleWeeklyDigest(req: Request, res: Response) {
  const timestamp = new Date().toISOString();
  let taskUid: string | undefined;
  try {
    const user = await sdk.authenticateRequest(req);
    taskUid = user.taskUid;
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }

    const workspace = await getWorkspaceByScheduleCronTaskUid(user.taskUid);
    if (!workspace) return res.json({ ok: true, skipped: "orphan" });

    const summary = await getWorkspaceSummary(workspace.id);
    const digest = await compileWeeklyDigest({
      workspaceId: workspace.id,
      clicks: summary.clicks,
      scans: summary.scans,
      registrations: 0,
      revenueMinor: 0,
      recipients: [],
    });

    return res.json({ ok: true, digest });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "weekly-digest-failed",
      stack: error instanceof Error ? error.stack : undefined,
      context: {
        url: req.originalUrl,
        taskUid,
      },
      timestamp,
    });
  }
}
