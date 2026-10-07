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

const MANIFEST_FILE_NAME = "microapp.json";

/**
 * Reads the `requiredPermissions` field of a microapp.json, ignoring anything that is
 * not an array of strings. A malformed field must grant nothing rather than everything.
 * @param value The raw value read from microapp.json.
 * @returns The declared permissions, or an empty list.
 */
export const parseRequiredPermissions = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];

/**
 * Resolves where a dev server serves its microapp.json: beside the page it serves.
 * A last path segment with a dot is taken as a file (`index.html`) and dropped.
 * @param webUri The URL the Developer app loads.
 * @returns The manifest URL.
 */
export const getDevServerManifestUrl = (webUri: string): string => {
  const [withoutHash] = webUri.split("#");
  const [base] = withoutHash.split("?");

  // Only the path can name a file; a dotted host (`kasunsi.local`) must survive.
  const pathStart = base.indexOf("/", base.indexOf("://") + 3);
  if (pathStart === -1) return `${base}/${MANIFEST_FILE_NAME}`;

  const origin = base.slice(0, pathStart);
  let path = base.slice(pathStart);
  const lastSegment = path.slice(path.lastIndexOf("/") + 1);
  if (lastSegment.includes(".")) {
    path = path.slice(0, path.length - lastSegment.length);
  } else if (!path.endsWith("/")) {
    path = `${path}/`;
  }

  return `${origin}${path}${MANIFEST_FILE_NAME}`;
};

/**
 * Fetches the permissions a dev server's microapp.json declares. The Developer app
 * loads a live URL instead of an installed zip, so this stands in for the manifest
 * read at install time. Any failure grants nothing.
 * @param webUri The URL the Developer app loads.
 * @returns The declared permissions, or an empty list.
 */
export const fetchDevServerPermissions = async (
  webUri: string
): Promise<string[]> => {
  const manifestUrl = getDevServerManifestUrl(webUri);
  try {
    // Uncached, so an edit to microapp.json takes effect on the next reload.
    const response = await fetch(manifestUrl, { cache: "no-store" });
    if (!response.ok) {
      console.warn(
        `No ${MANIFEST_FILE_NAME} at ${manifestUrl} (HTTP ${response.status}); no permissions declared.`
      );
      return [];
    }

    const manifest: unknown = await response.json();
    return manifest && typeof manifest === "object"
      ? parseRequiredPermissions(
          (manifest as { requiredPermissions?: unknown }).requiredPermissions
        )
      : [];
  } catch (error) {
    console.warn(
      `Could not read ${manifestUrl}; no permissions declared.`,
      error
    );
    return [];
  }
};
