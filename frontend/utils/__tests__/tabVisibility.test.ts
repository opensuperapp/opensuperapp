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

describe("shouldShowTab — chat (domain_specific, gated to wso2.com)", () => {
  const rules = DEFAULT_TAB_CONFIG;

  it("shows chat for an authenticated wso2.com email", () => {
    expect(shouldShowTab("chat", "alice@wso2.com", true, rules)).toBe(true);
  });

  it("is case-insensitive on the email domain", () => {
    expect(shouldShowTab("chat", "Alice@WSO2.COM", true, rules)).toBe(true);
  });

  it("hides chat for an authenticated non-wso2.com email", () => {
    expect(shouldShowTab("chat", "bob@example.com", true, rules)).toBe(false);
  });

  it("hides chat (defaultVisible: false) when the email is null but authenticated", () => {
    expect(shouldShowTab("chat", null, true, rules)).toBe(false);
  });

  it("hides chat (defaultVisible: false) when the email is undefined but authenticated", () => {
    expect(shouldShowTab("chat", undefined, true, rules)).toBe(false);
  });

  it("hides chat for an unauthenticated user even with a wso2.com email", () => {
    expect(shouldShowTab("chat", "alice@wso2.com", false, rules)).toBe(false);
  });

  it("hides chat for an unauthenticated guest with no email", () => {
    expect(shouldShowTab("chat", null, false, rules)).toBe(false);
  });

  it("falls back to DEFAULT_TAB_CONFIG when no rules are provided", () => {
    expect(shouldShowTab("chat", "alice@wso2.com", true, null)).toBe(true);
    expect(shouldShowTab("chat", "bob@example.com", true, undefined)).toBe(false);
  });
});

describe("shouldShowTab — public tabs are unaffected by email", () => {
  it("shows a public tab regardless of email or auth", () => {
    expect(shouldShowTab("index", null, false, DEFAULT_TAB_CONFIG)).toBe(true);
    expect(shouldShowTab("profile", "bob@example.com", true, DEFAULT_TAB_CONFIG)).toBe(
      true
    );
  });
});

describe("shouldShowTab — unknown tab", () => {
  it("defaults to visible when no rule exists for the tab", () => {
    expect(shouldShowTab("nonexistent", null, false, DEFAULT_TAB_CONFIG)).toBe(true);
  });
});
