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
import { WalletPassGates } from "@/hooks/useWalletPassConfig";

// Both gates are read at module load (the env constants) or through mocked
// hooks/selectors (the remote flag and the access token), so each case
// re-imports the hook against freshly configured mocks rather than trying to
// mutate them in place.
const mockUseRemoteConfig = jest.fn();

jest.mock("@/hooks/useRemoteConfig", () => ({
  useRemoteConfig: (key: string, defaultValue: unknown) =>
    mockUseRemoteConfig(key, defaultValue),
}));

const base64Url = (value: object): string =>
  Buffer.from(JSON.stringify(value))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const jwt = (payload: object): string =>
  `${base64Url({ alg: "RS256" })}.${base64Url(payload)}.sig`;

// Satisfies the default business-card allow-lists (wso2.com / wso2-employees)
// so every pre-existing remote-config test below keeps exercising only the
// remote-config gate, same as before this AND was added.
const AUTHORIZED_PAYLOAD = { email: "alice@wso2.com", groups: ["wso2-employees"] };
const UNAUTHORIZED_PAYLOAD = { email: "alice@example.com", groups: ["some-other-group"] };

const renderHook = (): WalletPassGates => {
  // Unlike the plain-function predecessor, this hook calls useMemo, so
  // react and react-test-renderer must be re-required from the same
  // post-resetModules registry as the hook itself — otherwise the freshly
  // loaded hook renders against a stale React whose hook dispatcher was
  // never wired up, and useMemo throws on a null dispatcher.
  /* eslint-disable @typescript-eslint/no-require-imports */
  const React = require("react");
  const { act, create } = require("react-test-renderer");
  const { useWalletPassConfig } = require("@/hooks/useWalletPassConfig");
  /* eslint-enable @typescript-eslint/no-require-imports */

  let result: WalletPassGates = {
    cardEnabled: false,
    walletDownloadEnabled: false,
  };

  const Probe = () => {
    result = useWalletPassConfig();
    return null;
  };

  act(() => {
    create(React.createElement(Probe));
  });

  return result;
};

/**
 * Loads the hook with the env flag and the platform set, the remote config
 * hook handing back `config` verbatim — including shapes Firebase could
 * actually serve if someone edits the JSON badly — and Redux handing back an
 * access token that decodes to `tokenPayload` (an authorized user by
 * default, so existing remote-config-only assertions still hold).
 */
const setup = ({
  envEnabled,
  platform,
  config,
  tokenPayload = AUTHORIZED_PAYLOAD,
}: {
  envEnabled: boolean;
  platform: "ios" | "android";
  config: unknown;
  tokenPayload?: object | null;
}) => {
  jest.resetModules();
  process.env.EXPO_PUBLIC_ENABLE_WALLET_PASS = envEnabled ? "true" : "false";
  delete process.env.EXPO_PUBLIC_BUSINESS_CARD_ALLOWED_DOMAINS;
  delete process.env.EXPO_PUBLIC_BUSINESS_CARD_ALLOWED_GROUPS;

  // The hook only pulls Platform.OS from react-native; useMemo comes from
  // react and is left un-mocked.
  jest.doMock("react-native", () => ({ Platform: { OS: platform } }));

  const accessToken = tokenPayload ? jwt(tokenPayload) : null;
  jest.doMock("react-redux", () => ({
    useSelector: (selector: (state: unknown) => unknown) =>
      selector({ auth: { accessToken } }),
  }));

  mockUseRemoteConfig.mockReset();
  mockUseRemoteConfig.mockImplementation(() => ({
    value: config,
    loading: false,
    error: null,
  }));
};

describe("useWalletPassConfig", () => {
  const originalEnabledEnv = process.env.EXPO_PUBLIC_ENABLE_WALLET_PASS;
  const originalDomainsEnv =
    process.env.EXPO_PUBLIC_BUSINESS_CARD_ALLOWED_DOMAINS;
  const originalGroupsEnv =
    process.env.EXPO_PUBLIC_BUSINESS_CARD_ALLOWED_GROUPS;

  afterAll(() => {
    process.env.EXPO_PUBLIC_ENABLE_WALLET_PASS = originalEnabledEnv;
    process.env.EXPO_PUBLIC_BUSINESS_CARD_ALLOWED_DOMAINS = originalDomainsEnv;
    process.env.EXPO_PUBLIC_BUSINESS_CARD_ALLOWED_GROUPS = originalGroupsEnv;
  });

  // The point of keying the object by platform: one OS going live must not
  // carry the other with it.
  it("is fully on for iOS while android is fully off, independently", () => {
    setup({
      envEnabled: true,
      platform: "ios",
      config: {
        ios: { enabled: true, walletDownload: true },
        android: { enabled: false, walletDownload: false },
      },
    });

    expect(renderHook()).toEqual({
      cardEnabled: true,
      walletDownloadEnabled: true,
    });
  });

  it("is fully on for android while ios is fully off, independently", () => {
    setup({
      envEnabled: true,
      platform: "android",
      config: {
        ios: { enabled: false, walletDownload: false },
        android: { enabled: true, walletDownload: true },
      },
    });

    expect(renderHook()).toEqual({
      cardEnabled: true,
      walletDownloadEnabled: true,
    });
  });

  it("shows the card with wallet download off for { enabled: true, walletDownload: false }", () => {
    setup({
      envEnabled: true,
      platform: "ios",
      config: { ios: { enabled: true, walletDownload: false } },
    });

    expect(renderHook()).toEqual({
      cardEnabled: true,
      walletDownloadEnabled: false,
    });
  });

  it("has enabled: false override a walletDownload: true, turning both off", () => {
    setup({
      envEnabled: true,
      platform: "ios",
      config: { ios: { enabled: false, walletDownload: true } },
    });

    expect(renderHook()).toEqual({
      cardEnabled: false,
      walletDownloadEnabled: false,
    });
  });

  it("keeps cardEnabled true when ENABLE_WALLET_PASS is off, only turning walletDownloadEnabled off (the asymmetry)", () => {
    setup({
      envEnabled: false,
      platform: "ios",
      config: { ios: { enabled: true, walletDownload: true } },
    });

    expect(renderHook()).toEqual({
      cardEnabled: true,
      walletDownloadEnabled: false,
    });
  });

  it("passes the two-flag default to useRemoteConfig under the wallet_pass_enabled key", () => {
    setup({ envEnabled: true, platform: "ios", config: undefined });

    renderHook();

    expect(mockUseRemoteConfig).toHaveBeenCalledWith("wallet_pass_enabled", {
      ios: { enabled: true, walletDownload: false },
      android: { enabled: true, walletDownload: false },
    });
  });

  // Legacy shape the console may still hold: a bare boolean per platform.
  it("turns both gates on for the legacy boolean shape { ios: true }", () => {
    setup({ envEnabled: true, platform: "ios", config: { ios: true } });

    expect(renderHook()).toEqual({
      cardEnabled: true,
      walletDownloadEnabled: true,
    });
  });

  it("shows the card with wallet download off for the legacy boolean shape { ios: false }", () => {
    setup({ envEnabled: true, platform: "ios", config: { ios: false } });

    expect(renderHook()).toEqual({
      cardEnabled: true,
      walletDownloadEnabled: false,
    });
  });

  // JSON.parse happily returns these, and indexing/dereferencing them must
  // not throw during render, so the hook has to absorb them rather than
  // trust the shape. Every one of these fails open on the card and closed
  // on the wallet download.
  it.each([
    [
      "a platform key the config does not mention",
      { android: { enabled: true, walletDownload: true } },
    ],
    ["an empty rule", { ios: {} }],
    ["a stringly-typed enabled flag", { ios: { enabled: "false" } }],
    [
      "a stringly-typed walletDownload flag",
      { ios: { walletDownload: "true" } },
    ],
    ["a null config", null],
    ["a bare boolean config", true],
    ["a non-object platform entry", { ios: 1 }],
  ])(
    "fails open on the card and closed on wallet download for %s",
    (_label, config) => {
      setup({ envEnabled: true, platform: "ios", config });

      expect(renderHook()).toEqual({
        cardEnabled: true,
        walletDownloadEnabled: false,
      });
    },
  );

  // The business-card access gate: ANDed on top of everything above, never a
  // replacement for it.
  describe("business card access gate (email domain AND group membership)", () => {
    const wideOpenConfig = { ios: { enabled: true, walletDownload: true } };

    it("keeps both gates off for an unauthorized user even when remote config is wide open", () => {
      setup({
        envEnabled: true,
        platform: "ios",
        config: wideOpenConfig,
        tokenPayload: UNAUTHORIZED_PAYLOAD,
      });

      expect(renderHook()).toEqual({
        cardEnabled: false,
        walletDownloadEnabled: false,
      });
    });

    it("denies a matching domain with no allowed group", () => {
      setup({
        envEnabled: true,
        platform: "ios",
        config: wideOpenConfig,
        tokenPayload: { email: "alice@wso2.com", groups: ["some-other-group"] },
      });

      expect(renderHook()).toEqual({
        cardEnabled: false,
        walletDownloadEnabled: false,
      });
    });

    it("denies an allowed group with a non-matching domain", () => {
      setup({
        envEnabled: true,
        platform: "ios",
        config: wideOpenConfig,
        tokenPayload: { email: "alice@example.com", groups: ["wso2-employees"] },
      });

      expect(renderHook()).toEqual({
        cardEnabled: false,
        walletDownloadEnabled: false,
      });
    });

    it("denies when there is no access token to decode", () => {
      setup({
        envEnabled: true,
        platform: "ios",
        config: wideOpenConfig,
        tokenPayload: null,
      });

      expect(renderHook()).toEqual({
        cardEnabled: false,
        walletDownloadEnabled: false,
      });
    });

    it("grants both gates for an authorized user when remote config is wide open", () => {
      setup({
        envEnabled: true,
        platform: "ios",
        config: wideOpenConfig,
        tokenPayload: AUTHORIZED_PAYLOAD,
      });

      expect(renderHook()).toEqual({
        cardEnabled: true,
        walletDownloadEnabled: true,
      });
    });

    it("still hides the card for an authorized user when the remote flag turns it off (AND, not OR)", () => {
      setup({
        envEnabled: true,
        platform: "ios",
        config: { ios: { enabled: false, walletDownload: true } },
        tokenPayload: AUTHORIZED_PAYLOAD,
      });

      expect(renderHook()).toEqual({
        cardEnabled: false,
        walletDownloadEnabled: false,
      });
    });
  });
});
