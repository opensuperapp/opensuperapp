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
import {
  TAB_VISIBILITY_RULES_SCHEMA_VERSION,
} from "@/constants/Constants";

import {
  TabVisibilityMode,
  type TabVisibilityRule,
  type TabVisibilityRules,
  type TabVisibilityEvaluationContext,
} from "@/types/tabVisibility.types";

function isTabVisibilityMode(value: unknown): value is TabVisibilityMode {
  return (
    typeof value === "string" &&
    Object.values(TabVisibilityMode).includes(value as TabVisibilityMode)
  );
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
        `[RemoteConfig] Version mismatch! Expected ${TAB_VISIBILITY_RULES_SCHEMA_VERSION}, got ${parsed.version}. Using defaults.`,
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
      if (
        !entry ||
        typeof entry !== "object" ||
        !isTabVisibilityMode(entry.mode)
      ) {
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
      if (typeof entry.order === "number" && Number.isFinite(entry.order)) {
        merged.order = entry.order;
      }
      tabs[key] = merged;
    }

    return {
      version: TAB_VISIBILITY_RULES_SCHEMA_VERSION,
      tabs,
    };
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
  return true;
}

const DEFAULT_ORDER_FALLBACK_BASE = 100_000;

/**
 * Reorders tab definitions using per-tab `order` on `rules.tabs[name]` (Remote Config).
 * Tabs without a finite `order` sort after any ordered tabs, preserving the app default order.
 * @param tabs - Tab definitions in default order.
 * @param rules - Parsed visibility rules (may include `order` per tab).
 * @returns Same tab objects in sorted order.
 */
export function sortTabsByVisibilityRules<T extends { name: string }>(
  tabs: T[],
  rules: TabVisibilityRules,
): T[] {
  const indexed = tabs.map((t, defaultIndex) => ({ t, defaultIndex }));
  const hasAnyExplicitOrder = indexed.some(({ t }) => {
    const o = rules.tabs[t.name]?.order;
    return typeof o === "number" && Number.isFinite(o);
  });
  if (!hasAnyExplicitOrder) {
    return tabs;
  }
  return [...indexed]
    .sort((a, b) => {
      const orderA = rules.tabs[a.t.name]?.order;
      const orderB = rules.tabs[b.t.name]?.order;
      const keyA =
        typeof orderA === "number" && Number.isFinite(orderA)
          ? orderA
          : DEFAULT_ORDER_FALLBACK_BASE + a.defaultIndex;
      const keyB =
        typeof orderB === "number" && Number.isFinite(orderB)
          ? orderB
          : DEFAULT_ORDER_FALLBACK_BASE + b.defaultIndex;
      if (keyA !== keyB) {
        return keyA - keyB;
      }
      return a.defaultIndex - b.defaultIndex;
    })
    .map(({ t }) => t);
}

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
  if (rule.mode === TabVisibilityMode.PUBLIC) {
    return true;
  }
  if (rule.mode === TabVisibilityMode.AUTH_REQUIRED) {
    return ctx.isSignedIn;
  }
  if (rule.mode === TabVisibilityMode.DOMAIN_SPECIFIC) {
    if (!ctx.isSignedIn) {
      return false;
    }
    const domain = extractEmailDomain(ctx.email);
    if (!domain) {
      return false;
    }
    // Empty domains = no domains allowed; "*" = all domains allowed.
    const list = rule.domains ?? [];
    if (list.length === 0) {
      return false;
    }
    if (list.includes("*")) {
      return true;
    }
    return list.some((d) => d.trim().toLowerCase() === domain);
  }
  return true;
}
