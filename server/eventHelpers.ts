export type RegistrationState = "registered" | "cancelled" | "checked_in";

export function createTicketCode(randomValue = crypto.randomUUID()) {
  return `KNT-${randomValue.replaceAll("-", "").slice(0, 12).toUpperCase()}`;
}

export function resolveCheckInState(status: RegistrationState) {
  if (status === "checked_in") return "already_checked_in" as const;
  if (status === "cancelled") return "cancelled" as const;
  return "checked_in" as const;
}
