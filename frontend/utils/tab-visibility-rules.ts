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
import defaultRulesJson from "@/integrations/firebase/tab_visibility_rules.default.json";
import { WSO2_EMAIL_DOMAIN } from "@/constants/Constants";

/** Remote Config JSON schema version supported by this build. */
export const TAB_VISIBILITY_RULES_SCHEMA_VERSION = 1 as const;

export type TabVisibilityMode = "public" | "auth_required" | "allow_domains";

/**
 * Per-tab visibility rule from Remote Config (merged with app defaults).
 */
export type TabVisibilityRule = {
  mode: TabVisibilityMode;
  domains?: string[];
  requiresAuth?: boolean;
};

/**
 * Parsed `tab_visibility_rules` payload.
 */
export type TabVisibilityRules = {
  version: typeof TAB_VISIBILITY_RULES_SCHEMA_VERSION;
  tabs: Record<string, TabVisibilityRule>;
};

const MODES: TabVisibilityMode[] = ["public", "auth_required", "allow_domains"];

function isTabVisibilityMode(value: unknown): value is TabVisibilityMode {
  return typeof value === "string" && MODES.includes(value as TabVisibilityMode);
}

function cloneDefaults(): TabVisibilityRules {
  return JSON.parse(JSON.stringify(defaultRulesJson)) as TabVisibilityRules;
}

/**
 * Returns the registrable domain part of an email, lowercased, or null if missing.
 * @param email - Raw email from the user profile.
 * @returns Domain substring or null.
 */
export function extractEmailDomain(email: string): string | null {
  const t = email.trim().toLowerCase();
  const at = t.lastIndexOf("@");
  if (at <= 0 || at === t.length - 1) {
    return null;
  }
  return t.slice(at + 1);
}

/**
 * Parses and validates Remote Config JSON; merges onto bundled defaults.
 * @param raw - JSON string from Remote Config or bundled defaults.
 * @returns {TabVisibilityRules} Safe rules object (never throws).
 */
export function parseTabVisibilityRules(raw: string): TabVisibilityRules {
  const base = cloneDefaults();
  if (!raw || typeof raw !== "string" || !raw.trim()) {
    return base;
  }
  try {
    const parsed = JSON.parse(raw) as {
      version?: unknown;
      tabs?: Record<string, unknown>;
    };
    if (parsed.version !== TAB_VISIBILITY_RULES_SCHEMA_VERSION) {
      console.warn(
        `[RemoteConfig] Version mismatch! Expected ${TAB_VISIBILITY_RULES_SCHEMA_VERSION}, got ${parsed.version}. Using defaults.`
      );
      return base;
    }
    if (!parsed.tabs || typeof parsed.tabs !== "object") {
      console.warn("[RemoteConfig] Invalid payload: 'tabs' object missing.");
      return base;
    }
    const tabs: Record<string, TabVisibilityRule> = { ...base.tabs };
    for (const key of Object.keys(parsed.tabs)) {
      const entry = parsed.tabs[key] as Record<string, unknown> | null;
      if (!entry || typeof entry !== "object" || !isTabVisibilityMode(entry.mode)) {
        continue;
      }
      const domains = Array.isArray(entry.domains)
        ? entry.domains.filter((d): d is string => typeof d === "string")
        : undefined;
      const prev = tabs[key];
      const merged: TabVisibilityRule = {
        ...(prev ?? {}),
        mode: entry.mode,
      };
      if (domains !== undefined) {
        merged.domains = domains;
      }
      if (typeof entry.requiresAuth === "boolean") {
        merged.requiresAuth = entry.requiresAuth;
      }
      tabs[key] = merged;
    }
    return { version: TAB_VISIBILITY_RULES_SCHEMA_VERSION, tabs };
  } catch {
    return base;
  }
}

function legacyShouldShowTab(
  tabName: string,
  ctx: TabVisibilityEvaluationContext,
): boolean {
  if (ctx.tabRequiresAuth && !ctx.isSignedIn) {
    return false;
  }
  if (tabName === "chat") {
    const email = ctx.email.trim().toLowerCase();
    return (
      ctx.isSignedIn && email.endsWith(WSO2_EMAIL_DOMAIN.toLowerCase())
    );
  }
  return true;
}

export type TabVisibilityEvaluationContext = {
  isSignedIn: boolean;
  email: string;
  tabRequiresAuth?: boolean;
};

/**
 * Pure visibility decision for one tab (UX only; not authorization).
 * @param tabName - Expo route name for the tab screen.
 * @param rules - Parsed rules merged with defaults.
 * @param ctx - Auth state and email for domain checks.
 * @returns {boolean} Whether the tab should appear in the tab bar.
 */
export function shouldShowTab(
  tabName: string,
  rules: TabVisibilityRules,
  ctx: TabVisibilityEvaluationContext,
): boolean {
  const rule = rules.tabs[tabName];
  if (!rule) {
    return legacyShouldShowTab(tabName, ctx);
  }
  if (rule.mode === "public") {
    return true;
  }
  if (rule.mode === "auth_required") {
    return ctx.isSignedIn;
  }
  if (rule.mode === "allow_domains") {
    if (!ctx.isSignedIn) {
      return false;
    }
    const domain = extractEmailDomain(ctx.email);
    if (!domain) {
      return false;
    }
    const list = rule.domains ?? [];
    if (list.length === 0 || list.includes("*")) {
      return true;
    }
    return list.some((d) => d.trim().toLowerCase() === domain);
  }
  return true;
}
