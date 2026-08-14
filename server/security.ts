import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_SALT_LENGTH = 16;

export function hashPassword(password: string) {
  const salt = randomBytes(SCRYPT_SALT_LENGTH).toString("hex");
  const derivedKey = scryptSync(password, salt, SCRYPT_KEY_LENGTH).toString(
    "hex"
  );
  return `scrypt$${salt}$${derivedKey}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [algorithm, salt, expectedHex] = storedHash.split("$");
  if (algorithm !== "scrypt" || !salt || !expectedHex) return false;
  const actual = scryptSync(password, salt, SCRYPT_KEY_LENGTH);
  const expected = Buffer.from(expectedHex, "hex");
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}

export function detectDevice(userAgent: string) {
  return /android|iphone|ipad|mobile/i.test(userAgent) ? "mobile" : "desktop";
}

export function detectBrowser(userAgent: string) {
  if (/edg\//i.test(userAgent)) return "edge";
  if (/chrome|crios/i.test(userAgent)) return "chrome";
  if (/safari/i.test(userAgent) && !/chrome|crios/i.test(userAgent))
    return "safari";
  if (/firefox|fxios/i.test(userAgent)) return "firefox";
  return "other";
}

export function matchesRoutingRules(
  rules: Record<string, string> | null | undefined,
  userAgent: string,
  country: string | null | undefined
) {
  if (!rules) return true;
  if (rules.device && rules.device !== detectDevice(userAgent)) return false;
  if (rules.browser && rules.browser !== detectBrowser(userAgent)) return false;
  if (rules.country && rules.country !== (country || "").toLowerCase())
    return false;
  return true;
}

export function isContactInWorkspace(
  contactWorkspaceId: number | undefined,
  workspaceId: number
) {
  return contactWorkspaceId === workspaceId;
}

export function isWorkspaceRoleAllowed(
  role: "owner" | "admin" | "member" | null | undefined,
  allowedRoles: Array<"owner" | "admin" | "member">
) {
  return Boolean(role && allowedRoles.includes(role));
}

export function normalizeRoutingRules(
  rules: Record<string, string> | undefined
) {
  if (!rules) return null;
  const allowedKeys = new Set(["device", "country", "browser"]);
  const normalized = Object.entries(rules).reduce<Record<string, string>>(
    (result, [key, value]) => {
      if (
        allowedKeys.has(key) &&
        typeof value === "string" &&
        value.trim().length > 0 &&
        value.length <= 80
      ) {
        result[key] = value.trim().toLowerCase();
      }
      return result;
    },
    {}
  );
  return Object.keys(normalized).length > 0 ? normalized : null;
}
