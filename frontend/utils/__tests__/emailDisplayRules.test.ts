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
import {
  applyEmailDisplayRules,
  assertAliasesSetForProductionUpdate,
  assertDomainRewriteComplete,
  EmailDisplayRules,
  NO_EMAIL_DISPLAY_RULES,
  parseEmailAliases,
  parseEnabledFlag,
} from "@/utils/emailDisplayRules";

const swap = { enabled: true, from: "example.org", to: "example.com" };
const rules = (
  overrides: Partial<EmailDisplayRules> = {}
): EmailDisplayRules => ({ ...NO_EMAIL_DISPLAY_RULES, ...overrides });

describe("applyEmailDisplayRules — domain", () => {
  it.each([
    ["rewrites an exact domain match", "jane@example.org", "jane@example.com"],
    ["ignores the domain's case", "jane@EXAMPLE.org", "jane@example.com"],
    ["leaves another domain alone", "jane@example.net", "jane@example.net"],
    ["leaves a subdomain alone", "jane@mail.example.org", "jane@mail.example.org"],
    ["leaves a non-address alone", "example.org", "example.org"],
    ["leaves an empty address alone", "", ""],
  ])("%s", (_, email, expected) => {
    expect(applyEmailDisplayRules(email, rules({ domain: swap }))).toBe(
      expected
    );
  });

  it.each([
    ["switched off", { ...swap, enabled: false }],
    ["missing the domain to replace", { ...swap, from: " " }],
    ["missing the replacement", { ...swap, to: "@" }],
  ])("does nothing when %s", (_, domain) => {
    expect(applyEmailDisplayRules("jane@example.org", rules({ domain }))).toBe(
      "jane@example.org"
    );
  });

  it("accepts domains written with a leading @ and padding", () => {
    const domain = { enabled: true, from: " @Example.org ", to: "@example.com" };
    expect(applyEmailDisplayRules("jane@example.org", rules({ domain }))).toBe(
      "jane@example.com"
    );
  });
});

describe("applyEmailDisplayRules — aliases", () => {
  const aliases = { "harrya@example.com": "harry@example.com" };

  it("swaps an exact address", () => {
    expect(
      applyEmailDisplayRules("harrya@example.com", rules({ aliases }))
    ).toBe("harry@example.com");
  });

  it("matches ignoring case and padding", () => {
    expect(
      applyEmailDisplayRules(" HarryA@Example.com ", rules({ aliases }))
    ).toBe("harry@example.com");
  });

  it("leaves everyone else alone", () => {
    expect(
      applyEmailDisplayRules("jane@example.com", rules({ aliases }))
    ).toBe("jane@example.com");
  });

  it("does not match the same name on another domain", () => {
    expect(
      applyEmailDisplayRules("harrya@example.net", rules({ aliases }))
    ).toBe("harrya@example.net");
  });

  it("applies after the domain swap, so one key covers both domains", () => {
    expect(
      applyEmailDisplayRules("harrya@example.org", rules({ domain: swap, aliases }))
    ).toBe("harry@example.com");
  });

  it("works with the domain swap off", () => {
    expect(
      applyEmailDisplayRules("harrya@example.com", rules({ aliases }))
    ).toBe("harry@example.com");
  });

  it("applies once, without chaining", () => {
    const chain = {
      "a@example.com": "b@example.com",
      "b@example.com": "c@example.com",
    };
    expect(applyEmailDisplayRules("a@example.com", rules({ aliases: chain }))).toBe(
      "b@example.com"
    );
  });

  it("is not fooled by an inherited key", () => {
    expect(applyEmailDisplayRules("constructor", rules({ aliases }))).toBe(
      "constructor"
    );
  });
});

describe("parseEnabledFlag", () => {
  it.each([
    [undefined, false],
    ["", false],
    ["true", true],
    [" TRUE ", true],
    ["1", true],
    ["false", false],
    ["0", false],
  ])("reads %p as %p", (value, expected) => {
    expect(parseEnabledFlag(value)).toBe(expected);
  });

  it("rejects anything that is not a boolean", () => {
    expect(() => parseEnabledFlag("yes")).toThrow(/true or false/);
  });
});

describe("assertDomainRewriteComplete", () => {
  it("accepts a complete swap", () => {
    expect(() => assertDomainRewriteComplete(swap)).not.toThrow();
  });

  it("ignores blank fields while the swap is off", () => {
    expect(() =>
      assertDomainRewriteComplete({ enabled: false, from: "", to: "" })
    ).not.toThrow();
  });

  it.each([
    [{ ...swap, from: "" }, /EMAIL_DOMAIN_REPLACE_FROM is empty/],
    [{ ...swap, to: " @ " }, /EMAIL_DOMAIN_REPLACE_TO is empty/],
    [
      { ...swap, from: "", to: "" },
      /EMAIL_DOMAIN_REPLACE_FROM and EMAIL_DOMAIN_REPLACE_TO are empty/,
    ],
  ])("rejects %p", (rewrite, message) => {
    expect(() => assertDomainRewriteComplete(rewrite)).toThrow(message);
  });

  it("does not print the configured domain", () => {
    expect(() =>
      assertDomainRewriteComplete({ ...swap, to: "" })
    ).not.toThrow(/example\.org/);
  });
});

describe("assertAliasesSetForProductionUpdate", () => {
  const FILE = "/secrets/email-aliases.example.json";

  it.each([undefined, "", "development"])(
    "ignores a missing alias file outside a production update (%p)",
    (channel) => {
      expect(() =>
        assertAliasesSetForProductionUpdate(channel, "")
      ).not.toThrow();
    }
  );

  it.each(["production", " Production "])(
    "accepts a production update with the file set (%p)",
    (channel) => {
      expect(() =>
        assertAliasesSetForProductionUpdate(channel, FILE)
      ).not.toThrow();
    }
  );

  it.each(["", "   "])(
    "rejects a production update without the file (%p)",
    (file) => {
      expect(() =>
        assertAliasesSetForProductionUpdate("production", file)
      ).toThrow(/EMAIL_ALIASES_FILE is not set for a production update/);
    }
  );
});

describe("parseEmailAliases", () => {
  const SOURCE = "EMAIL_ALIASES_FILE";

  it("lowercases keys and trims values", () => {
    expect(
      parseEmailAliases(
        '{" HarryA@Example.com ": " Harry@example.com "}',
        SOURCE
      )
    ).toEqual({ "harrya@example.com": "Harry@example.com" });
  });

  it("accepts an empty object", () => {
    expect(parseEmailAliases("{}", SOURCE)).toEqual({});
  });

  it.each([
    ["invalid JSON", "{", /not valid JSON/],
    ["an array", '["harrya@example.com"]', /one JSON object/],
    ["a bare string", '"harrya@example.com"', /one JSON object/],
    ["null", "null", /one JSON object/],
    ["a non-string value", '{"harrya@example.com": 1}', /entry 1 must map to a string/],
    ["a key that is not an address", '{"harrya": "harry@example.com"}', /entry 1 has a key/],
    ["a value that is not an address", '{"harrya@example.com": "harry"}', /entry 1 has a value/],
    ["a value with a space", '{"harrya@example.com": "har ry@example.com"}', /entry 1 has a value/],
    [
      "two keys that differ only by case",
      '{"harrya@example.com": "harry@example.com", "HARRYA@example.com": "h@example.com"}',
      /entry 2 repeats/,
    ],
  ])("rejects %s", (_, json, message) => {
    expect(() => parseEmailAliases(json, SOURCE)).toThrow(message);
  });

  it("never puts an address in an error", () => {
    const bad = [
      '{"harrya": "harry@example.com"}',
      '{"harrya@example.com": "harry"}',
      '{"harrya@example.com": "harry@example.com", "HARRYA@example.com": "h@example.com"}',
    ];
    for (const json of bad) {
      expect(() => parseEmailAliases(json, SOURCE)).toThrow(
        expect.objectContaining({ message: expect.not.stringMatching(/harr/i) })
      );
    }
  });
});
