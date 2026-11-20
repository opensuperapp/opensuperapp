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
import type { hasBusinessCardAccess as HasBusinessCardAccess } from "@/utils/businessCardAccess";

// BUSINESS_CARD_ALLOWED_DOMAINS/GROUPS are parsed from env at module load, so
// each case that needs a non-default allow-list resets modules and re-requires
// both the constants and the helper together.
const loadHelper = (env?: {
  domains?: string;
  groups?: string;
}): typeof HasBusinessCardAccess => {
  jest.resetModules();
  if (env?.domains !== undefined) {
    process.env.EXPO_PUBLIC_BUSINESS_CARD_ALLOWED_DOMAINS = env.domains;
  } else {
    delete process.env.EXPO_PUBLIC_BUSINESS_CARD_ALLOWED_DOMAINS;
  }
  if (env?.groups !== undefined) {
    process.env.EXPO_PUBLIC_BUSINESS_CARD_ALLOWED_GROUPS = env.groups;
  } else {
    delete process.env.EXPO_PUBLIC_BUSINESS_CARD_ALLOWED_GROUPS;
  }
  /* eslint-disable-next-line @typescript-eslint/no-require-imports */
  return require("@/utils/businessCardAccess").hasBusinessCardAccess;
};

describe("hasBusinessCardAccess", () => {
  const originalDomains = process.env.EXPO_PUBLIC_BUSINESS_CARD_ALLOWED_DOMAINS;
  const originalGroups = process.env.EXPO_PUBLIC_BUSINESS_CARD_ALLOWED_GROUPS;

  afterAll(() => {
    process.env.EXPO_PUBLIC_BUSINESS_CARD_ALLOWED_DOMAINS = originalDomains;
    process.env.EXPO_PUBLIC_BUSINESS_CARD_ALLOWED_GROUPS = originalGroups;
  });

  describe("with a single-value allow-list (example.com / test-org-employees)", () => {
    const hasBusinessCardAccess = loadHelper({
      domains: "example.com",
      groups: "test-org-employees",
    });

    it("grants access for a matching domain and group", () => {
      expect(
        hasBusinessCardAccess("alice@example.com", ["test-org-employees"]),
      ).toBe(true);
    });

    it("is case-insensitive on both domain and group", () => {
      expect(
        hasBusinessCardAccess("Alice@EXAMPLE.COM", ["Test-Org-Employees"]),
      ).toBe(true);
    });

    it("matches when the allowed group is one of several", () => {
      expect(
        hasBusinessCardAccess("alice@example.com", [
          "some-other-group",
          "test-org-employees",
        ]),
      ).toBe(true);
    });

    it("denies a non-allowed domain even with an allowed group", () => {
      expect(
        hasBusinessCardAccess("alice@example.org", ["test-org-employees"]),
      ).toBe(false);
    });

    it("denies an allowed domain with no matching group", () => {
      expect(
        hasBusinessCardAccess("alice@example.com", ["some-other-group"]),
      ).toBe(false);
    });

    it("denies when groups is undefined", () => {
      expect(hasBusinessCardAccess("alice@example.com", undefined)).toBe(false);
    });

    it("denies when groups is empty", () => {
      expect(hasBusinessCardAccess("alice@example.com", [])).toBe(false);
    });

    it("denies when email is undefined", () => {
      expect(hasBusinessCardAccess(undefined, ["test-org-employees"])).toBe(
        false,
      );
    });

    it("denies a malformed email with no domain", () => {
      expect(hasBusinessCardAccess("not-an-email", ["test-org-employees"])).toBe(
        false,
      );
    });

    it("denies a bare domain string carrying no @", () => {
      expect(hasBusinessCardAccess("example.com", ["test-org-employees"])).toBe(
        false,
      );
    });

    it("uses the domain after the last @ when the local part contains one", () => {
      expect(
        hasBusinessCardAccess('"a@b"@example.com', ["test-org-employees"]),
      ).toBe(true);
    });
  });

  describe("with env-configured allow-lists", () => {
    it("honors a custom, multi-value domain and group list", () => {
      const hasBusinessCardAccess = loadHelper({
        domains: "example.com, partner.example",
        groups: "contractors , partners",
      });

      expect(
        hasBusinessCardAccess("bob@partner.example", ["partners"]),
      ).toBe(true);
      expect(
        hasBusinessCardAccess("bob@example.org", ["partners"]),
      ).toBe(false);
      expect(
        hasBusinessCardAccess("bob@partner.example", ["test-org-employees"]),
      ).toBe(false);
    });

    it("falls back to the default when the env var is blank", () => {
      // Built from the shipped default rather than spelling it out, so the
      // test carries no real domain or group.
      loadHelper();
      /* eslint-disable-next-line @typescript-eslint/no-require-imports */
      const defaults = require("@/constants/Constants");
      const [defaultDomain] = defaults.BUSINESS_CARD_ALLOWED_DOMAINS;
      const [defaultGroup] = defaults.BUSINESS_CARD_ALLOWED_GROUPS;
      expect(defaultDomain).toBeTruthy();
      expect(defaultGroup).toBeTruthy();

      const hasBusinessCardAccess = loadHelper({ domains: "  ", groups: "" });

      expect(
        hasBusinessCardAccess(`alice@${defaultDomain}`, [defaultGroup]),
      ).toBe(true);
      expect(
        hasBusinessCardAccess("alice@example.org", [defaultGroup]),
      ).toBe(false);
    });
  });
});
