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

export function homeForRole(role: string) {
  if (role === "ADMIN") return "/admin";
  if (role === "AGENT") return "/agent";
  return "/app";
}
