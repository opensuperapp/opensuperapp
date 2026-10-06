// Copyright (c) 2026 WSO2 LLC. (https://www.wso2.com).
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

// Schemes a WebView loads around the micro app's own document; they carry no
// origin of their own to leak the bridge to.
const BOOTSTRAP_SCHEMES = ["about:", "blob:", "data:"];

const SCHEME_PATTERN = /^([a-z][a-z\d+.-]*):\/+/i;

const collapseSegments = (path: string): string => {
  const segments: string[] = [];
  for (const segment of path.split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      segments.pop();
      continue;
    }
    segments.push(segment);
  }
  return segments.join("/");
};

// Brings the many shapes of the same location — "file://" vs "file:///", a
// percent-encoded path, "." and ".." segments, iOS reporting a document
// under both /var and /private/var — down to one comparable string.
const normalizeUri = (uri: string): string | null => {
  const trimmed = uri.trim();
  const scheme = SCHEME_PATTERN.exec(trimmed);
  if (!scheme) return null;

  const withoutQuery = trimmed
    .slice(scheme[0].length)
    .split("#")[0]
    .split("?")[0];

  let rest: string;
  try {
    rest = decodeURI(withoutQuery);
  } catch {
    rest = withoutQuery;
  }

  if (scheme[1].toLowerCase() === "file") {
    const path = collapseSegments(rest).replace(/^private\//, "");
    return path ? `file:///${path}` : "file://";
  }

  const pathStart = rest.indexOf("/");
  const authority = (
    pathStart === -1 ? rest : rest.slice(0, pathStart)
  ).toLowerCase();
  const path = pathStart === -1 ? "" : collapseSegments(rest.slice(pathStart));
  const origin = `${scheme[1].toLowerCase()}://${authority}`;
  return path ? `${origin}/${path}` : origin;
};

const originOf = (normalizedUri: string): string => {
  const pathStart = normalizedUri.indexOf("/", normalizedUri.indexOf("://") + 3);
  return pathStart === -1 ? normalizedUri : normalizedUri.slice(0, pathStart);
};

/**
 * Resolves the boundary a micro app is allowed to live within: the directory
 * its bundle is served from, or, for a development server, its whole origin.
 * @param uri - The uri the WebView loads the micro app from
 * @returns The normalized boundary, or null if the uri is unusable
 */
export const resolveMicroAppBoundary = (uri: string): string | null => {
  const normalized = normalizeUri(uri);
  if (!normalized) return null;
  if (!normalized.startsWith("file:///")) return originOf(normalized);
  return normalized.slice(0, normalized.lastIndexOf("/"));
};

/**
 * Checks whether a url the WebView reports belongs to the micro app itself.
 * @param url - The url to check
 * @param boundary - The boundary from resolveMicroAppBoundary
 * @returns True when the url is the micro app's own
 */
export const isWithinMicroAppBoundary = (
  url: string | undefined,
  boundary: string | null
): boolean => {
  if (!url || !boundary) return false;

  const normalized = normalizeUri(url);
  if (!normalized) return false;
  if (normalized === boundary || normalized.startsWith(`${boundary}/`)) {
    return true;
  }

  // Android reports only the origin of the frame a bridge message came from,
  // which is as far as a file:// bundle can be matched there.
  return (
    normalized === originOf(boundary) && normalized === originOf(normalized)
  );
};

/**
 * Checks whether a url is one a WebView loads on its own while starting up.
 * @param url - The url to check
 * @returns True when the url carries no origin to navigate away to
 */
export const isBootstrapUri = (url: string | undefined): boolean =>
  !url ||
  BOOTSTRAP_SCHEMES.some((scheme) => url.toLowerCase().startsWith(scheme));
