import { ApiError, normalizeApiError } from "@/lib/api-errors";
export { ApiError } from "@/lib/api-errors";
import { buildApiUrl, directiveTypes, isRecord, isConversationResponse } from "@/lib/helpers";
import type {
  ConversationResponse,
  ConversationStartResponse,
  Interaction,
  StartConversationRequest,
} from "@/types/types";

const startConversationPath = "/conversations/start";

function getApiBaseUrl(): string {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!apiBaseUrl) {
    throw new ApiError(
      "The conversation service is not configured. Please try again later.",
    );
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

async function postConversationJson(
  path: string,
  payload: StartConversationRequest | Interaction | undefined,
  operation: "start" | "message" | "complete",
): Promise<unknown> {
  const url = buildApiUrl(getApiBaseUrl(), path);
  const headers = getApiRequestHeaders();
  let response: Response;
  let responseBody: unknown;

  try {
    if (process.env.NODE_ENV === "development" && operation === "message") {
      const interaction = payload;
      console.debug("Kenzo interaction", interaction);
    }
    response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    responseBody = parseResponseBody(await response.text());
  } catch (error: unknown) {
    throw new ApiError(
      "We couldn't reach Kenzo. Check your connection and try again.",
      { cause: error },
    );
  }

  if (!response.ok) {
    if (process.env.NODE_ENV === "development") {
      // Never include request headers or tenant credentials in diagnostics.
      console.error("Kenzo API request failed", {
        status: response.status,
        responseBody: redactTenantDetails(responseBody),
        ...(operation === "message" ? { interaction: payload } : {}),
      });
    }
    throw normalizeApiError(response.status, responseBody, operation);
  }

  // Ignore future directive types; validate every known directive and all workflow fields.
  if (isRecord(responseBody) && Array.isArray(responseBody.ui_directives)) {
    responseBody.ui_directives = responseBody.ui_directives.filter(d =>
      !isRecord(d) || typeof d.type !== "string" || directiveTypes.includes(d.type));
  }
  return responseBody;
}

function redactTenantDetails(value: unknown): unknown {
  const tenants = [process.env.NEXT_PUBLIC_API_AGENCY_ID, process.env.NEXT_PUBLIC_API_SCHEMA_NAME]
    .filter((entry): entry is string => Boolean(entry));
  if (typeof value === "string") {
    return tenants.reduce((text, tenant) => text.replaceAll(tenant, "[redacted]"), value);
  }
  if (Array.isArray(value)) return value.map(redactTenantDetails);
  if (isRecord(value)) return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key,
    /authorization|cookie|secret|token|api[-_]?key|agency[-_]?id|schema[-_]?name/i.test(key)
      ? "[redacted]" : redactTenantDetails(entry),
  ]));
  return value;
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
): Promise<ConversationStartResponse & { conversation_id: string }> {
  const responseBody = await postConversationJson(
    startConversationPath,
    payload,
    "start",
  );

  assertConversationResponse(
    responseBody,
    "Kenzo returned an unexpected response. Please try again.",
  );

  if (!responseBody.conversation_id) {
    throw new ApiError(
      "Kenzo did not return a conversation ID. Please try again.",
    );
  }
  return responseBody as ConversationResponse & { conversation_id: string };
}

export async function sendInteraction(
  conversationId: string,
  payload: Interaction,
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

  if (
    responseBody.conversation_id !== conversationId
  ) {
    throw new ApiError(
      "Kenzo returned a response for a different conversation. Please refresh and try again.",
      { details: responseBody },
    );
  }

  return responseBody;
}

/** Explicit/recovery completion only; normal messages already finalize on the server. */
export async function completeConversation(conversationId: string): Promise<unknown> {
  // The completion response schema is not specified by the V4 contract.
  return postConversationJson(
    `/conversations/${encodeURIComponent(conversationId)}/complete`,
    undefined,
    "complete",
  );
}
