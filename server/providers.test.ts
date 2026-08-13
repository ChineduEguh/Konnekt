import { describe, expect, it } from "vitest";
import {
  DeferredPaymentProvider,
  DeferredWhatsAppProvider,
  compileWeeklyDigest,
} from "./providers";

describe("deferred integration providers", () => {
  it("keeps payment operations non-blocking when no gateway is configured", async () => {
    const result = await new DeferredPaymentProvider().createPayment({
      amountMinor: 1000,
      currency: "NGN",
      reference: "test",
    });
    expect(result.status).toBe("failed");
    expect(result.provider).toBe("deferred");
  });

  it("does not send WhatsApp messages without an official provider", async () => {
    await expect(
      new DeferredWhatsAppProvider().sendMessage({
        to: "+2340000000000",
        body: "Hello",
      })
    ).resolves.toEqual({ accepted: false });
  });

  it("prepares a seven day digest window", async () => {
    const result = await compileWeeklyDigest({
      workspaceId: 1,
      clicks: 4,
      scans: 2,
      registrations: 1,
      revenueMinor: 0,
      recipients: ["admin@example.com"],
    });
    expect(result.status).toBe("prepared");
    expect(result.delivery).toBe("deferred");
    expect(result.periodEnd.getTime() - result.periodStart.getTime()).toBe(
      7 * 24 * 60 * 60 * 1000
    );
  });
});
