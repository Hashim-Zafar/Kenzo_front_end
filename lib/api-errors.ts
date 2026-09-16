export class ApiError extends Error {
  readonly status?: number;
  readonly details?: unknown;

  constructor(
    message: string,
    options?: { status?: number; details?: unknown; cause?: unknown },
  ) {
    super(message, { cause: options?.cause });
    this.name = "ApiError";
    this.status = options?.status;
    this.details = options?.details;
  }
}

export function getFailureMessage(
  status: number,
  operation: "start" | "message" | "complete",
): string {
  if (status === 404) {
    return "This conversation could not be found. It may have expired.";
  }

  if (status === 409 || status === 410) {
    return "This conversation is no longer accepting messages.";
  }

  if (status === 400) {
    return "That interaction is not available right now. Please review the current question.";
  }

  if (status === 422) {
    return operation === "start"
      ? "Please check your details and try again."
      : "Kenzo couldn't use that response. Please review it and try again.";
  }

  if (status === 429) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  if (status === 503) {
    return "Kenzo is temporarily unavailable. Your conversation is saved here—please try again shortly.";
  }

  if (status >= 500) {
    return "Kenzo is temporarily unavailable. Please try again shortly.";
  }

  return operation === "start"
    ? "We couldn't start the conversation. Please try again."
    : "We couldn't send that to Kenzo. Please try again.";
}

/** Normalize FastAPI string and validation-array detail without displaying server traces. */
export function normalizeApiError(status: number, body: unknown, operation: "start" | "message" | "complete") {
  const detail = typeof body === "object" && body !== null && "detail" in body ? body.detail : null;
  const validationIssues = Array.isArray(detail)
    ? detail.flatMap(issue => typeof issue === "object" && issue !== null && typeof issue.msg === "string"
      ? [{ field: Array.isArray(issue.loc) ? String(issue.loc.at(-1)) : null, message: issue.msg }]
      : [])
    : [];
  return new ApiError(getFailureMessage(status, operation), {
    status, details: { detail, validationIssues },
  });
}
