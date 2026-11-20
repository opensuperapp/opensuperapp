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
import { shouldShowTab } from "@/utils/tabVisibility";
import { DEFAULT_TAB_CONFIG } from "@/types/remoteConfig.types";

// The shipped default gates chat to the deployment's real domain. Swap in a
// placeholder so the tests (including the null-rules fallback, which reads
// DEFAULT_TAB_CONFIG directly) never carry a real domain.
jest.mock("@/types/remoteConfig.types", () => {
  const actual = jest.requireActual("@/types/remoteConfig.types");
  const defaults = actual.DEFAULT_TAB_CONFIG;
  return {
    ...actual,
    DEFAULT_TAB_CONFIG: {
      ...defaults,
      tabs: {
        ...defaults.tabs,
        chat: { ...defaults.tabs.chat, domains: ["example.com"] },
      },
    },
  };
});

describe("shouldShowTab — chat (domain_specific, gated to example.com)", () => {
  const rules = DEFAULT_TAB_CONFIG;

  it("shows chat for an authenticated example.com email", () => {
    expect(shouldShowTab("chat", "alice@example.com", true, rules)).toBe(true);
  });

  it("is case-insensitive on the email domain", () => {
    expect(shouldShowTab("chat", "Alice@EXAMPLE.COM", true, rules)).toBe(true);
  });

  it("hides chat for an authenticated non-example.com email", () => {
    expect(shouldShowTab("chat", "bob@example.org", true, rules)).toBe(false);
  });

  it("hides chat (defaultVisible: false) when the email is null but authenticated", () => {
    expect(shouldShowTab("chat", null, true, rules)).toBe(false);
  });

  it("hides chat (defaultVisible: false) when the email is undefined but authenticated", () => {
    expect(shouldShowTab("chat", undefined, true, rules)).toBe(false);
  });

  it("hides chat for an unauthenticated user even with an example.com email", () => {
    expect(shouldShowTab("chat", "alice@example.com", false, rules)).toBe(false);
  });

  it("hides chat for an unauthenticated guest with no email", () => {
    expect(shouldShowTab("chat", null, false, rules)).toBe(false);
  });

  it("falls back to DEFAULT_TAB_CONFIG when no rules are provided", () => {
    expect(shouldShowTab("chat", "alice@example.com", true, null)).toBe(true);
    expect(shouldShowTab("chat", "bob@example.org", true, undefined)).toBe(false);
  });
});

describe("shouldShowTab — public tabs are unaffected by email", () => {
  it("shows a public tab regardless of email or auth", () => {
    expect(shouldShowTab("index", null, false, DEFAULT_TAB_CONFIG)).toBe(true);
    expect(shouldShowTab("profile", "bob@example.org", true, DEFAULT_TAB_CONFIG)).toBe(
      true
    );
  });
});

describe("shouldShowTab — unknown tab", () => {
  it("defaults to visible when no rule exists for the tab", () => {
    expect(shouldShowTab("nonexistent", null, false, DEFAULT_TAB_CONFIG)).toBe(true);
  });
});
