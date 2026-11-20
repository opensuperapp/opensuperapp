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
import { toBusinessCardData } from "@/utils/businessCard";
import { displayEmail } from "@/utils/displayEmail";

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        emailDisplay: {
          domain: { enabled: true, from: "example.org", to: "example.com" },
          aliases: { "harrya@example.com": "harry@example.com" },
        },
      },
    },
  },
}));

describe("displayEmail with the rules built into the app", () => {
  it("shows the alias for an address issued on the old domain", () => {
    expect(displayEmail("harrya@example.org")).toBe("harry@example.com");
  });

  it("shows everyone else on the new domain", () => {
    expect(displayEmail("jane@example.org")).toBe("jane@example.com");
  });
});

describe("toBusinessCardData shows the display address", () => {
  it("on the card built from the directory", () => {
    const card = toBusinessCardData({
      firstName: "Harry",
      lastName: "A",
      workEmail: "harrya@example.org",
      employeeThumbnail: null,
    });
    expect(card?.workEmail).toBe("harry@example.com");
  });

  it("on the card built from token claims alone", () => {
    const card = toBusinessCardData(null, {
      email: "harrya@example.org",
      given_name: "Harry",
      family_name: "A",
      userid: "00000000-0000-4000-8000-000000000000",
    });
    expect(card?.workEmail).toBe("harry@example.com");
  });
});
