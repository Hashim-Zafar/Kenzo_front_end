import {
  buildApiUrl,
  isConversationResponse,
} from "@/lib/helpers";
import type {
  ConversationResponse,
  ConversationStartResponse,
  SendConversationMessageRequest,
  StartConversationRequest,
} from "@/types/types";

const startConversationPath = "/conversations/start";

export class ApiError extends Error {
  readonly status?: number;
  readonly details?: unknown;

  constructor(message: string, options?: { status?: number; details?: unknown; cause?: unknown }) {
    super(message, { cause: options?.cause });
    this.name = "ApiError";
    this.status = options?.status;
    this.details = options?.details;
  }
}

function getApiBaseUrl(): string {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!apiBaseUrl) {
    throw new ApiError("The conversation service is not configured. Please try again later.");
  }

  return apiBaseUrl;
}

function getApiRequestHeaders(): Headers {
  const agencyId = process.env.NEXT_PUBLIC_API_AGENCY_ID?.trim();
  const schemaName = process.env.NEXT_PUBLIC_API_SCHEMA_NAME?.trim();

  if (!agencyId || !schemaName) {
    throw new ApiError(
      "The conversation service is missing its agency configuration. Please try again later.",
    );
  }

  return new Headers({
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Agency-Id": agencyId,
    "X-Schema-Name": schemaName,
  });
}

function parseResponseBody(body: string): unknown {
  if (!body) {
    return null;
  }

  try {
    return JSON.parse(body) as unknown;
  } catch {
    return body;
  }
}

function getFailureMessage(status: number, operation: "start" | "message"): string {
  if (status === 404) {
    return "This conversation could not be found. It may have expired.";
  }

  if (status === 409 || status === 410) {
    return "This conversation is no longer accepting messages.";
  }

  if (status === 400 || status === 422) {
    return operation === "start"
      ? "Please check your details and try again."
      : "Kenzo couldn't use that response. Please review it and try again.";
  }

  if (status === 429) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  if (status >= 500) {
    return "Kenzo is temporarily unavailable. Please try again shortly.";
  }

  return operation === "start"
    ? "We couldn't start the conversation. Please try again."
    : "We couldn't send that to Kenzo. Please try again.";
}

async function postConversationJson(
  path: string,
  payload: StartConversationRequest | SendConversationMessageRequest,
  operation: "start" | "message",
): Promise<unknown> {
  const url = buildApiUrl(getApiBaseUrl(), path);
  const headers = getApiRequestHeaders();
  let response: Response;

  try {

    response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
  } catch (error: unknown) {
    throw new ApiError(
      "We couldn't reach Kenzo. Check your connection and try again.",
      { cause: error },
    );
  }

  const responseBody = parseResponseBody(await response.text());

  if (!response.ok) {
    throw new ApiError(getFailureMessage(response.status, operation), {
      status: response.status,
      details: responseBody,
    });
  }

  return responseBody;
}

function assertConversationResponse(
  value: unknown,
  statusMessage: string,
): asserts value is ConversationResponse {
  if (!isConversationResponse(value)) {
    throw new ApiError(statusMessage, { details: value });
  }
}

export async function startConversation(
  payload: StartConversationRequest,
): Promise<ConversationStartResponse> {
  const responseBody = await postConversationJson(
    startConversationPath,
    payload,
    "start",
  );

  assertConversationResponse(
    responseBody,
    "Kenzo returned an unexpected response. Please try again.",
  );

  return responseBody;
}

export async function sendConversationMessage(
  conversationId: string,
  payload: SendConversationMessageRequest,
): Promise<ConversationResponse> {
  const responseBody = await postConversationJson(
    `/conversations/${encodeURIComponent(conversationId)}/messages`,
    payload,
    "message",
  );

  assertConversationResponse(
    responseBody,
    "Kenzo returned an unexpected response. Your conversation is still here—please try again.",
  );

  if (responseBody.conversation_id !== conversationId) {
    throw new ApiError(
      "Kenzo returned a response for a different conversation. Please refresh and try again.",
      { details: responseBody },
    );
  }

  return responseBody;
}
