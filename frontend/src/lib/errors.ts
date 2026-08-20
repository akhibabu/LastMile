export class ApiClientError extends Error {
  code?: string;
  status?: number;
  fieldErrors?: Array<{ path?: string; message?: string }>;

  constructor(
    message: string,
    options?: { code?: string; status?: number; fieldErrors?: Array<{ path?: string; message?: string }> },
  ) {
    super(message);
    this.name = "ApiClientError";
    this.code = options?.code;
    this.status = options?.status;
    this.fieldErrors = options?.fieldErrors;
  }
}

const CODE_MESSAGES: Record<string, string> = {
  MISSING_RATE_CARD: "Pricing isn't available for this route yet. Please try another delivery area.",
  RATE_CARD_NOT_FOUND: "Pricing isn't available for this route yet. Please try another delivery area.",
  ZONE_UNRESOLVED: "We're not delivering to this area yet.",
  LOCATION_NOT_SERVICEABLE: "We're not delivering to this area yet.",
  ADDRESS_PINCODE_MISMATCH: "That address doesn't match the selected area. Choose a supported location.",
  UNAUTHORIZED: "Please sign in to continue.",
  FORBIDDEN: "You don't have permission to do that.",
  NOT_FOUND: "We couldn't find that record.",
};

export function toUserMessage(
  code?: string,
  fallback?: string,
  fieldErrors?: Array<{ path?: string; message?: string }>,
) {
  if (code === "VALIDATION_ERROR") {
    const first = fieldErrors?.find((item) => item.message)?.message;
    return first ?? "Please check the highlighted fields and try again.";
  }
  if (code && CODE_MESSAGES[code]) return CODE_MESSAGES[code];
  if (fallback && !looksTechnical(fallback)) return fallback;
  return fallback || "Something went wrong. Please try again.";
}

function looksTechnical(message: string) {
  return /prisma|sql|econn|undefined|null is not|stack/i.test(message);
}

export function formatApiError(error: unknown) {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}
