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

// TEMPORARY. The identity provider still issues work emails on the old domain,
// and a few people go by an address other than the one it issues. These rules
// change only what the app shows, never the address it signs in or looks
// people up with. They mirror the wallet service's EMAIL_DOMAIN_REPLACE_* and
// EMAIL_ALIASES_FILE, so the preview and the installed pass print the same
// address. Delete both once the IdP issues the right addresses itself.
//
// This module is pure so app.config.ts can validate the rules at build time.

export type EmailDomainRewrite = {
  enabled: boolean;
  // A leading "@", surrounding whitespace and letter case are all ignored.
  from: string;
  to: string;
};

export type EmailDisplayRules = {
  domain: EmailDomainRewrite;
  // Keyed by the full address after the domain rewrite, lowercased.
  aliases: Record<string, string>;
};

export const NO_EMAIL_DISPLAY_RULES: EmailDisplayRules = {
  domain: { enabled: false, from: "", to: "" },
  aliases: {},
};

const normalizeDomain = (domain: string): string =>
  domain.trim().replace(/^@/, "").toLowerCase();

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const PLAUSIBLE_EMAIL = /^[^\s@]+@[^\s@]+$/;

// Rewrites only when all three fields are set, so a half-configured build
// shows the address it was given rather than a broken one.
const isDomainRewriteActive = ({ enabled, from, to }: EmailDomainRewrite) =>
  enabled && normalizeDomain(from) !== "" && normalizeDomain(to) !== "";

const rewriteDomain = (email: string, rewrite: EmailDomainRewrite): string => {
  if (!isDomainRewriteActive(rewrite)) return email;
  const trimmed = email.trim();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0) return email;
  if (normalizeDomain(trimmed.slice(at + 1)) !== normalizeDomain(rewrite.from)) {
    return email;
  }
  return trimmed.slice(0, at + 1) + normalizeDomain(rewrite.to);
};

/**
 * Returns the address to show for a work email: the domain rewritten, then a
 * per-person alias looked up on the full result. One pass only, so an alias
 * that is itself a key is not rewritten again.
 * @param email - The address the IdP or directory issued
 * @param rules - The rewrite and aliases to apply
 * @returns The address to display
 */
export const applyEmailDisplayRules = (
  email: string,
  rules: EmailDisplayRules
): string => {
  const rewritten = rewriteDomain(email, rules.domain);
  const alias = Object.prototype.hasOwnProperty.call(
    rules.aliases,
    normalizeEmail(rewritten)
  )
    ? rules.aliases[normalizeEmail(rewritten)]
    : undefined;
  return alias ?? rewritten;
};

/**
 * Parses the EMAIL_DOMAIN_REPLACE_ENABLED toggle the way the wallet service
 * does: unset means off, anything other than a boolean is an error.
 * @param value - The raw variable
 * @returns Whether the rewrite is switched on
 */
export const parseEnabledFlag = (value: string | undefined): boolean => {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "") return false;
  if (["true", "1", "t"].includes(normalized)) return true;
  if (["false", "0", "f"].includes(normalized)) return false;
  throw new Error(
    "EMAIL_DOMAIN_REPLACE_ENABLED must be true or false."
  );
};

/**
 * Fails when the swap is switched on but FROM or TO is blank. Left alone, the
 * rewrite would quietly do nothing, and an EAS Update built that way would
 * take the swapped addresses away from installed apps while the wallet pass
 * kept them. Names the variables only, never their values.
 * @param rewrite - The rewrite as read from the environment
 */
export const assertDomainRewriteComplete = (
  rewrite: EmailDomainRewrite
): void => {
  if (!rewrite.enabled) return;
  const missing = [
    normalizeDomain(rewrite.from) === "" && "EMAIL_DOMAIN_REPLACE_FROM",
    normalizeDomain(rewrite.to) === "" && "EMAIL_DOMAIN_REPLACE_TO",
  ].filter(Boolean);
  if (missing.length > 0) {
    throw new Error(
      `EMAIL_DOMAIN_REPLACE_ENABLED is true but ${missing.join(" and ")} ` +
        `${missing.length > 1 ? "are" : "is"} empty. Set both, or set ` +
        "EMAIL_DOMAIN_REPLACE_ENABLED=false to turn the swap off."
    );
  }
};

/**
 * Parses the alias file's contents. Errors name the entry by position, never
 * by address, because the addresses are personal data and build logs are not
 * private.
 * @param json - The file's contents
 * @param source - Where it came from, for error messages
 * @returns The aliases keyed by lowercased address
 */
export const parseEmailAliases = (
  json: string,
  source: string
): Record<string, string> => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error(`${source} is not valid JSON.`);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${source} must hold one JSON object of address pairs.`);
  }

  const aliases: Record<string, string> = {};
  Object.entries(parsed).forEach(([from, to], index) => {
    const entry = `${source}: entry ${index + 1}`;
    if (typeof to !== "string") {
      throw new Error(`${entry} must map to a string.`);
    }
    if (!PLAUSIBLE_EMAIL.test(from.trim())) {
      throw new Error(`${entry} has a key that is not an email address.`);
    }
    if (!PLAUSIBLE_EMAIL.test(to.trim())) {
      throw new Error(`${entry} has a value that is not an email address.`);
    }
    const key = normalizeEmail(from);
    if (Object.prototype.hasOwnProperty.call(aliases, key)) {
      throw new Error(`${entry} repeats an earlier key, ignoring case.`);
    }
    aliases[key] = to.trim();
  });
  return aliases;
};
