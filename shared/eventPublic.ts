export function isEventFull(
  registrationCount: number,
  capacity?: number | null
) {
  return (
    capacity !== undefined && capacity !== null && registrationCount >= capacity
  );
}

export function validatePublicRegistration(input: {
  name: string;
  email: string;
}) {
  if (input.name.trim().length < 2) return "Enter your full name";
  if (!/^\S+@\S+\.\S+$/.test(input.email.trim()))
    return "Enter a valid email address";
  return null;
}
