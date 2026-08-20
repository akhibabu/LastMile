export function inr(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount);
}

export function kg(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  const text = Number.isInteger(amount)
    ? String(amount)
    : amount.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
  return `${text} kg`;
}

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function formatAge(value?: string | number | Date | null) {
  if (value == null) return "never";
  const timestamp = typeof value === "number" ? Date.now() - value : new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "never";
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  return `${hours} hour${hours === 1 ? "" : "s"} ago`;
}

export function homeForRole(role: string) {
  if (role === "ADMIN") return "/admin";
  if (role === "AGENT") return "/agent";
  return "/app";
}
