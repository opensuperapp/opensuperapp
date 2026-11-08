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
import { type AppGlyphId } from "@/constants/brand";

// Brand words carry no meaning for picking a glyph ("WSO2 Con" is the Con app).
const BRAND_WORDS = new Set(["wso2", "choreo", "labs", "choreolabs"]);

const words = (value: string) =>
  value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word && !BRAND_WORDS.has(word));

type Rule = [AppGlyphId, (w: string[], joined: string) => boolean];

const has = (w: string[], ...candidates: string[]) =>
  candidates.some((c) => w.includes(c));

// Order matters: "Con Attendees" must win over "Con".
const RULES: Rule[] = [
  ["attendees", (w, j) => j.includes("attendee")],
  ["con", (w, j) => has(w, "con") || j.includes("conference")],
  ["wifi", (w, j) => j.includes("wifi")],
  ["auth", (w, j) => j.includes("authenticator") || has(w, "auth", "mfa", "otp", "2fa")],
  ["carlift", (w, j) => j.includes("carlift") || has(w, "car", "carpool", "lift", "ride")],
  ["portal", (w, j) => j.includes("portal")],
  ["dod", (w, j) => has(w, "dod") || j.includes("dinner")],
  ["menu", (w) => has(w, "menu", "lunch", "cafeteria", "food")],
  ["leave", (w) => has(w, "leave", "leaves", "holiday", "vacation")],
  ["opd", (w, j) => has(w, "opd") || j.includes("claim") || j.includes("medical")],
  ["people", (w) => has(w, "people", "directory", "employee", "employees")],
  ["sub", (w, j) => j.includes("subscription")],
  ["visitor", (w, j) => j.includes("visitor")],
  ["wallet", (w) => has(w, "wallet")],
  ["access", (w) => has(w, "access", "door")],
];

const match = (value: string | undefined): AppGlyphId | null => {
  if (!value) return null;
  const w = words(value);
  if (w.length === 0) return null;
  const joined = w.join("");
  return RULES.find(([, test]) => test(w, joined))?.[0] ?? null;
};

/**
 * Picks the brand glyph for a backend micro-app from its name, then its id.
 * Returns null when nothing fits; the tile then shows the app's initial.
 */
export function resolveAppGlyph(name: string, appId?: string): AppGlyphId | null {
  return match(name) ?? match(appId);
}

/** First letter of the app's name, ignoring brand words, for the fallback tile. */
export function appInitial(name: string): string {
  const first = words(name)[0] ?? name.trim();
  return (first.charAt(0) || "?").toUpperCase();
}
