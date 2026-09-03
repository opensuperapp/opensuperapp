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

  describe("with the default allow-lists (wso2.com / wso2-employees)", () => {
    const hasBusinessCardAccess = loadHelper();

    it("grants access for a matching domain and group", () => {
      expect(
        hasBusinessCardAccess("alice@wso2.com", ["wso2-employees"]),
      ).toBe(true);
    });

    it("is case-insensitive on both domain and group", () => {
      expect(
        hasBusinessCardAccess("Alice@WSO2.COM", ["WSO2-Employees"]),
      ).toBe(true);
    });

    it("matches when the allowed group is one of several", () => {
      expect(
        hasBusinessCardAccess("alice@wso2.com", [
          "some-other-group",
          "wso2-employees",
        ]),
      ).toBe(true);
    });

    it("denies a non-allowed domain even with an allowed group", () => {
      expect(
        hasBusinessCardAccess("alice@example.com", ["wso2-employees"]),
      ).toBe(false);
    });

    it("denies an allowed domain with no matching group", () => {
      expect(
        hasBusinessCardAccess("alice@wso2.com", ["some-other-group"]),
      ).toBe(false);
    });

    it("denies when groups is undefined", () => {
      expect(hasBusinessCardAccess("alice@wso2.com", undefined)).toBe(false);
    });

    it("denies when groups is empty", () => {
      expect(hasBusinessCardAccess("alice@wso2.com", [])).toBe(false);
    });

    it("denies when email is undefined", () => {
      expect(hasBusinessCardAccess(undefined, ["wso2-employees"])).toBe(
        false,
      );
    });

    it("denies a malformed email with no domain", () => {
      expect(hasBusinessCardAccess("not-an-email", ["wso2-employees"])).toBe(
        false,
      );
    });

    it("denies a bare domain string carrying no @", () => {
      expect(hasBusinessCardAccess("wso2.com", ["wso2-employees"])).toBe(
        false,
      );
    });

    it("uses the domain after the last @ when the local part contains one", () => {
      expect(
        hasBusinessCardAccess('"a@b"@wso2.com', ["wso2-employees"]),
      ).toBe(true);
    });
  });

  describe("with env-configured allow-lists", () => {
    it("honors a custom, multi-value domain and group list", () => {
      const hasBusinessCardAccess = loadHelper({
        domains: "example.com, partner.io",
        groups: "contractors , partners",
      });

      expect(
        hasBusinessCardAccess("bob@partner.io", ["partners"]),
      ).toBe(true);
      expect(
        hasBusinessCardAccess("bob@wso2.com", ["partners"]),
      ).toBe(false);
      expect(
        hasBusinessCardAccess("bob@partner.io", ["wso2-employees"]),
      ).toBe(false);
    });

    it("falls back to the default when the env var is blank", () => {
      const hasBusinessCardAccess = loadHelper({ domains: "  ", groups: "" });

      expect(
        hasBusinessCardAccess("alice@wso2.com", ["wso2-employees"]),
      ).toBe(true);
    });
  });
});
