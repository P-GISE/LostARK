const DEFAULT_BASE_URL = "http://localhost:3000";

type ShareBaseUrlInput = {
  allowedRequestHosts?: Array<string | null | undefined>;
  configuredBaseUrl?: string | null;
  requestHost?: string | null;
  requestProto?: string | null;
};

function firstHeaderValue(value?: string | null) {
  return value?.split(",")[0]?.trim() ?? "";
}

function normalizeHttpUrl(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    url.pathname = url.pathname.replace(/\/+$/, "");
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function normalizeHost(value?: string | null) {
  const host = firstHeaderValue(value);
  if (!host || host.includes("://")) return null;
  return host.replace(/\/+$/, "");
}

function hostnameFromBaseUrl(baseUrl: string) {
  try {
    return new URL(baseUrl).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function normalizeHostname(value?: string | null) {
  const host = normalizeHost(value);
  if (!host) return "";

  return host.split(":")[0]?.replace(/^\[|\]$/g, "").toLowerCase() ?? "";
}

function normalizeAllowedHostname(value?: string | null) {
  const trimmed = firstHeaderValue(value);
  if (!trimmed) return "";

  try {
    if (trimmed.includes("://")) {
      return new URL(trimmed).hostname.toLowerCase();
    }
  } catch {
    return "";
  }

  return normalizeHostname(trimmed);
}

function isAllowedRequestHost(input: ShareBaseUrlInput, host: string) {
  const hostname = normalizeHostname(host);
  if (!hostname) return false;
  if (isLocalHostname(hostname)) return true;

  return (input.allowedRequestHosts ?? [])
    .map(normalizeAllowedHostname)
    .filter(Boolean)
    .includes(hostname);
}

function isLocalHostname(hostname: string) {
  const normalized = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  return normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1";
}

function isLocalBaseUrl(baseUrl: string) {
  return isLocalHostname(hostnameFromBaseUrl(baseUrl));
}

function normalizeProto(value?: string | null) {
  const proto = firstHeaderValue(value).replace(/:$/, "").toLowerCase();
  return proto === "http" || proto === "https" ? proto : null;
}

function getRequestBaseUrl(input: ShareBaseUrlInput) {
  const host = normalizeHost(input.requestHost);
  if (!host) return null;
  if (!isAllowedRequestHost(input, host)) return null;

  const hostname = host.split(":")[0] ?? host;
  const proto = normalizeProto(input.requestProto) ??
    (isLocalHostname(hostname) ? "http" : "https");

  return normalizeHttpUrl(`${proto}://${host}`);
}

export function getShareBaseUrl(input: ShareBaseUrlInput) {
  const configuredBaseUrl = normalizeHttpUrl(input.configuredBaseUrl);
  const requestBaseUrl = getRequestBaseUrl(input);

  if (configuredBaseUrl && !isLocalBaseUrl(configuredBaseUrl)) {
    return configuredBaseUrl;
  }

  if (requestBaseUrl && !isLocalBaseUrl(requestBaseUrl)) {
    return requestBaseUrl;
  }

  return configuredBaseUrl ?? requestBaseUrl ?? DEFAULT_BASE_URL;
}

export function buildInviteUrl({
  baseUrl,
  inviteCode,
}: {
  baseUrl: string;
  inviteCode: string;
}) {
  const normalizedBaseUrl = normalizeHttpUrl(baseUrl) ?? DEFAULT_BASE_URL;
  return `${normalizedBaseUrl}/invite/${encodeURIComponent(inviteCode)}`;
}
