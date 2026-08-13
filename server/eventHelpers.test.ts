import { describe, expect, it } from "vitest";
import { createTicketCode, resolveCheckInState } from "./eventHelpers";

describe("event helpers", () => {
  it("creates stable ticket codes from a random identifier", () => {
    expect(createTicketCode("1234-5678-9012-3456")).toBe("KNT-123456789012");
  });

  it("rejects duplicate check-ins", () => {
    expect(resolveCheckInState("checked_in")).toBe("already_checked_in");
    expect(resolveCheckInState("cancelled")).toBe("cancelled");
    expect(resolveCheckInState("registered")).toBe("checked_in");
  });
});
