import { describe, expect, it } from "vitest";
import {
  hashPassword,
  isWorkspaceRoleAllowed,
  matchesRoutingRules,
  normalizeRoutingRules,
  verifyPassword,
} from "./security";

describe("security helpers", () => {
  it("hashes passwords with unique salted scrypt hashes", () => {
    const first = hashPassword("correct horse battery staple");
    const second = hashPassword("correct horse battery staple");

    expect(first).not.toBe(second);
    expect(verifyPassword("correct horse battery staple", first)).toBe(true);
    expect(verifyPassword("wrong password", first)).toBe(false);
  });

  it("enforces workspace role boundaries", () => {
    expect(isWorkspaceRoleAllowed("owner", ["owner", "admin"])).toBe(true);
    expect(isWorkspaceRoleAllowed("member", ["owner", "admin"])).toBe(false);
    expect(
      isWorkspaceRoleAllowed(undefined, ["owner", "admin", "member"])
    ).toBe(false);
  });

  it("matches supported link routing rules", () => {
    const mobileChrome =
      "Mozilla/5.0 (Linux; Android 13) AppleWebKit Chrome/120 Mobile";
    expect(
      matchesRoutingRules(
        { device: "mobile", browser: "chrome", country: "ng" },
        mobileChrome,
        "NG"
      )
    ).toBe(true);
    expect(
      matchesRoutingRules({ device: "mobile" }, "Mozilla/5.0 Desktop", "NG")
    ).toBe(false);
    expect(matchesRoutingRules({ browser: "safari" }, mobileChrome, "NG")).toBe(
      false
    );
    expect(matchesRoutingRules({ country: "gb" }, mobileChrome, "NG")).toBe(
      false
    );
  });

  it("keeps only supported routing rules", () => {
    expect(
      normalizeRoutingRules({
        device: " Mobile ",
        browser: "Chrome",
        unsupported: "ignored",
        country: "NG",
      })
    ).toEqual({ device: "mobile", browser: "chrome", country: "ng" });
    expect(normalizeRoutingRules({ unsupported: "ignored" })).toBeNull();
  });
});
