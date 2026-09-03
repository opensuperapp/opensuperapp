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

// The business card icon is installed via navigation.setOptions({ headerRight
// }), not in the screen's own tree, so this suite captures that callback off
// a mocked useNavigation and renders what it returns, rather than looking for
// the icon inside the screen itself.
import SettingsScreen from "@/app/(tabs)/profile";
import React from "react";
import { act, create } from "react-test-renderer";

jest.mock("@expo/vector-icons", () => ({ Ionicons: () => null }));

jest.mock("@/hooks/useTrackActiveScreen", () => ({
  useTrackActiveScreen: () => {},
}));

// Pulls in useSignInWithAsgardeo -> appConfigSlice -> @reduxjs/toolkit, which
// this suite has no need to exercise; only the signed-out branch renders it.
jest.mock("@/components/SignInMessage", () => "SignInMessage");

// profile.tsx imports these actions at module scope, which otherwise loads
// the real @reduxjs/toolkit slice modules this suite never dispatches.
jest.mock("@/context/slices/deviceSlice", () => ({
  disableFCMToken: jest.fn(),
}));
jest.mock("@/context/slices/userInfoSlice", () => ({
  getUserInfo: jest.fn(),
}));
// Pulls in appSlice -> exchangedTokenStore -> AsyncStorage, whose native
// module isn't linked in this Jest environment.
jest.mock("@/utils/performLogout", () => ({
  performLogout: jest.fn(),
}));

type HeaderRight = () => React.ReactElement | null;
let capturedHeaderRight: HeaderRight | undefined;
const mockSetOptions = jest.fn(
  (options: { headerRight?: HeaderRight }) =>
    (capturedHeaderRight = options.headerRight),
);

jest.mock("expo-router", () => ({
  useNavigation: () => ({ setOptions: mockSetOptions }),
}));

// A mutable object lets individual tests flip cardEnabled without re-mocking
// the module.
const walletPassConfig = { cardEnabled: true, walletDownloadEnabled: false };
jest.mock("@/hooks/useWalletPassConfig", () => ({
  useWalletPassConfig: () => walletPassConfig,
}));

// A well-formed (if minimal) JWT so jwtDecode succeeds quietly instead of
// logging a decode error this suite has no interest in.
const base64Url = (value: object): string =>
  Buffer.from(JSON.stringify(value))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
const validAccessToken = `${base64Url({ alg: "RS256" })}.${base64Url({})}.sig`;

let mockAccessToken: string | null = validAccessToken;
// A stable dispatch reference — a fresh jest.fn() per render would change
// identity every time and retrigger any effect that depends on it.
const mockDispatch = jest.fn();
jest.mock("react-redux", () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: (state: unknown) => unknown) =>
    selector({
      auth: { accessToken: mockAccessToken },
      userInfo: { userInfo: null },
    }),
}));

// SettingsScreen renders BusinessCardSheet unconditionally once signed in, so
// mounting it pulls in the same dependency chain as BusinessCardSheet's own
// suite.
jest.mock("expo-brightness", () => ({
  getBrightnessAsync: jest.fn().mockResolvedValue(0.5),
  setBrightnessAsync: jest.fn().mockResolvedValue(undefined),
  restoreSystemBrightnessAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("react-native-view-shot", () => ({
  captureRef: jest.fn().mockResolvedValue("file:///card.png"),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

jest.mock("react-native-qrcode-svg", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/services/authService", () => ({ logout: jest.fn() }));
jest.mock("@/services/walletPassService", () => ({
  saveBusinessCardPass: jest.fn().mockResolvedValue(false),
}));
jest.mock("@/services/businessCardService", () => ({
  shareVCard: jest.fn().mockResolvedValue(undefined),
  shareCardImage: jest.fn().mockResolvedValue(undefined),
}));

// BusinessCardSheet's Modal mounts with animationType="slide"; leaving it
// mounted across tests leaves its Animated timing loop running past the
// suite and crashes the Jest environment on teardown, so every root gets
// unmounted once its test is done.
const mountedRoots: ReturnType<typeof create>[] = [];

const renderScreen = () => {
  act(() => {
    mountedRoots.push(create(<SettingsScreen />));
  });
};

describe("Profile business card gate", () => {
  beforeEach(() => {
    capturedHeaderRight = undefined;
    mockSetOptions.mockClear();
  });

  afterEach(() => {
    act(() => {
      mountedRoots.splice(0).forEach((root) => root.unmount());
    });
  });

  it("reaches the business card icon when the card gate is on and signed in", () => {
    mockAccessToken = validAccessToken;
    walletPassConfig.cardEnabled = true;
    renderScreen();

    const element = capturedHeaderRight?.();
    expect(element).not.toBeNull();

    let button: ReturnType<typeof create> | undefined;
    act(() => {
      button = create(element as React.ReactElement);
    });
    expect(
      button!.root.findByProps({ accessibilityLabel: "open_business_card" }),
    ).toBeTruthy();
    act(() => button!.unmount());
  });

  it("hides the icon when the card gate is off", () => {
    mockAccessToken = validAccessToken;
    walletPassConfig.cardEnabled = false;
    renderScreen();

    expect(capturedHeaderRight?.()).toBeNull();
  });

  it("hides the icon when there is no access token", () => {
    mockAccessToken = null;
    walletPassConfig.cardEnabled = true;
    renderScreen();

    expect(capturedHeaderRight?.()).toBeNull();
  });
});
