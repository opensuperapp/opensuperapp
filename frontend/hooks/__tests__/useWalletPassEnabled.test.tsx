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
import React from "react";
import { act, create } from "react-test-renderer";

// Both gates are read at module load (the env constant) or through a mocked
// hook (the remote flag), so each case re-imports the hook against freshly
// configured mocks rather than trying to mutate them in place.
const mockUseRemoteConfig = jest.fn();

jest.mock("@/hooks/useRemoteConfig", () => ({
  useRemoteConfig: (key: string, defaultValue: unknown) =>
    mockUseRemoteConfig(key, defaultValue),
}));

const renderHook = (): boolean => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useWalletPassEnabled } = require("@/hooks/useWalletPassEnabled");
  let result = false;

  const Probe = () => {
    result = useWalletPassEnabled();
    return null;
  };

  act(() => {
    create(<Probe />);
  });

  return result;
};

/**
 * Loads the hook with the env flag and the platform set, and the remote config
 * hook handing back `config` verbatim — including shapes Firebase could
 * actually serve if someone edits the JSON badly.
 */
const setup = ({
  envEnabled,
  platform,
  config,
}: {
  envEnabled: boolean;
  platform: "ios" | "android";
  config: unknown;
}) => {
  jest.resetModules();
  process.env.EXPO_PUBLIC_ENABLE_WALLET_PASS = envEnabled ? "true" : "false";

  jest.doMock("react-native", () => ({ Platform: { OS: platform } }));

  mockUseRemoteConfig.mockReset();
  mockUseRemoteConfig.mockImplementation(() => ({
    value: config,
    loading: false,
    error: null,
  }));
};

describe("useWalletPassEnabled", () => {
  const originalEnv = process.env.EXPO_PUBLIC_ENABLE_WALLET_PASS;

  afterAll(() => {
    process.env.EXPO_PUBLIC_ENABLE_WALLET_PASS = originalEnv;
  });

  it("is enabled on iOS when the env flag and the config's ios field are both on", () => {
    setup({
      envEnabled: true,
      platform: "ios",
      config: { ios: true, android: false },
    });

    expect(renderHook()).toBe(true);
    expect(mockUseRemoteConfig).toHaveBeenCalledWith("wallet_pass_enabled", {
      ios: false,
      android: false,
    });
  });

  it("is enabled on Android when the env flag and the config's android field are both on", () => {
    setup({
      envEnabled: true,
      platform: "android",
      config: { ios: false, android: true },
    });

    expect(renderHook()).toBe(true);
  });

  // The point of keying the object by platform: one OS going live must not
  // carry the other with it.
  it("stays off on iOS when only android is on", () => {
    setup({
      envEnabled: true,
      platform: "ios",
      config: { ios: false, android: true },
    });

    expect(renderHook()).toBe(false);
  });

  it("stays off on Android when only ios is on", () => {
    setup({
      envEnabled: true,
      platform: "android",
      config: { ios: true, android: false },
    });

    expect(renderHook()).toBe(false);
  });

  it("stays off when the env flag is off, whatever the config says", () => {
    setup({
      envEnabled: false,
      platform: "ios",
      config: { ios: true, android: true },
    });

    expect(renderHook()).toBe(false);
  });

  it("stays off for a platform the config does not mention", () => {
    setup({ envEnabled: true, platform: "android", config: { ios: true } });

    expect(renderHook()).toBe(false);
  });

  // JSON.parse happily returns these, and indexing null would throw during
  // render, so the hook has to absorb them rather than trust the shape.
  it.each([
    ["null", null],
    ["a bare boolean", true],
    ["a stringly-typed flag", { ios: "true" }],
  ])("stays off when the config is %s", (_label, config) => {
    setup({ envEnabled: true, platform: "ios", config });

    expect(renderHook()).toBe(false);
  });
});
