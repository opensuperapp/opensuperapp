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
import { useTokenClaims } from "@/hooks/useTokenClaims";
import { DecodedAccessToken } from "@/types/decodeAccessToken.types";
import React from "react";
import { act, create } from "react-test-renderer";

const base64Url = (value: object): string =>
  Buffer.from(JSON.stringify(value))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const jwt = (payload: object): string =>
  `${base64Url({ alg: "RS256" })}.${base64Url(payload)}.sig`;

// The claims the card needs and /user-info never returns.
const FULL_PAYLOAD = {
  given_name: "Jane",
  family_name: "Doe",
  email: "jane.doe@wso2.com",
  jobtitle: "Software Engineer",
  phone_number: "+94771234567",
  profile: "https://lh3.googleusercontent.com/a-/AAcHTtexampleavatartoken=s100",
};

// A token with the identity claims but WITHOUT jobtitle/phone_number — the
// shape Asgardeo hands out when those two are mapped onto the other token.
const THIN_PAYLOAD = {
  given_name: "Jane",
  family_name: "Doe",
  email: "jane.doe@wso2.com",
};

let mockAuthState: { accessToken: string | null; idToken: string | null } = {
  accessToken: null,
  idToken: null,
};

jest.mock("react-redux", () => ({
  useSelector: (selector: (state: unknown) => unknown) =>
    selector({ auth: mockAuthState }),
}));

const mockLoadAuthData = jest.fn();
jest.mock("@/utils/authTokenStore", () => ({
  loadAuthDataFromSecureStore: () => mockLoadAuthData(),
}));

/** Renders the hook and hands back whatever it returned. */
const renderClaims = async (): Promise<DecodedAccessToken | null> => {
  let captured: DecodedAccessToken | null = null;
  const Probe = () => {
    captured = useTokenClaims();
    return null;
  };
  await act(async () => {
    create(<Probe />);
  });
  return captured;
};

beforeEach(() => {
  mockAuthState = { accessToken: null, idToken: null };
  mockLoadAuthData.mockReset();
  mockLoadAuthData.mockResolvedValue(null);
});

describe("useTokenClaims", () => {
  it("reads jobtitle and phone_number from the access token", async () => {
    mockAuthState = { accessToken: jwt(FULL_PAYLOAD), idToken: null };

    const claims = await renderClaims();

    expect(claims?.jobtitle).toBe("Software Engineer");
    expect(claims?.phone_number).toBe("+94771234567");
    // Redux answered, so nothing had to touch the keychain.
    expect(mockLoadAuthData).not.toHaveBeenCalled();
  });

  it("falls back to the id token when the access token omits them", async () => {
    mockAuthState = {
      accessToken: jwt(THIN_PAYLOAD),
      idToken: jwt(FULL_PAYLOAD),
    };

    const claims = await renderClaims();

    expect(claims?.jobtitle).toBe("Software Engineer");
    expect(claims?.phone_number).toBe("+94771234567");
  });

  it("reads SecureStore when Redux has no tokens yet", async () => {
    mockLoadAuthData.mockResolvedValue({
      accessToken: jwt(FULL_PAYLOAD),
      idToken: jwt(THIN_PAYLOAD),
    });

    const claims = await renderClaims();

    expect(claims?.jobtitle).toBe("Software Engineer");
    expect(claims?.phone_number).toBe("+94771234567");
  });

  it("reads SecureStore when the Redux access token is opaque", async () => {
    // Asgardeo can be configured to issue opaque access tokens; jwtDecode
    // throws on those, and the old code turned that into a silently empty card.
    mockAuthState = { accessToken: "opaque-not-a-jwt", idToken: null };
    mockLoadAuthData.mockResolvedValue({
      accessToken: "opaque-not-a-jwt",
      idToken: jwt(FULL_PAYLOAD),
    });

    const claims = await renderClaims();

    expect(claims?.jobtitle).toBe("Software Engineer");
    expect(claims?.phone_number).toBe("+94771234567");
  });

  it("returns null when signed out", async () => {
    expect(await renderClaims()).toBeNull();
  });
});
