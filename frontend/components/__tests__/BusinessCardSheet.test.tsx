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
import BusinessCardSheet from "@/components/BusinessCardSheet";
import React from "react";
import { Modal, Text } from "react-native";
import { act, create } from "react-test-renderer";

// The Asgardeo payload for a signed-in employee, encoded so the component
// runs its own jwtDecode rather than being handed a pre-decoded object. This
// is the whole point of the suite: prove the sheet mounts and shows the title
// and phone number that only the token carries.
const payload = {
  jobtitle: "Software Engineer",
  profile: "https://lh3.googleusercontent.com/a-/AAcHTtexampleavatartoken=s100",
  given_name: "Jane",
  family_name: "Doe",
  phone_number: "+94771234567",
  email: "jane.doe@wso2.com",
};

const base64Url = (value: object): string =>
  Buffer.from(JSON.stringify(value))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const mockAccessToken = `${base64Url({ alg: "RS256" })}.${base64Url(payload)}.sig`;

// /user-info returns only these four; everything else on the card comes from
// the token.
const mockUserInfo = {
  firstName: "Jane",
  lastName: "Doe",
  workEmail: "jane.doe@wso2.com",
  employeeThumbnail: null,
};

// @expo/vector-icons pulls in expo-font -> expo-asset, which jest-expo does not
// resolve here. The icons carry no behaviour this suite cares about.
jest.mock("@expo/vector-icons", () => ({ Ionicons: () => null }));

jest.mock("react-redux", () => ({
  useSelector: (selector: (state: unknown) => unknown) =>
    selector({
      auth: { accessToken: mockAccessToken },
      userInfo: { userInfo: mockUserInfo },
    }),
}));

jest.mock("@/hooks/useWalletPassEnabled", () => ({
  useWalletPassEnabled: () => false,
}));

jest.mock("expo-brightness", () => ({
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

const render = (visible: boolean, onClose = jest.fn()) => {
  let root: ReturnType<typeof create> | undefined;
  act(() => {
    root = create(<BusinessCardSheet visible={visible} onClose={onClose} />);
  });
  return { root: root!, onClose };
};

const allText = (root: ReturnType<typeof create>): string[] =>
  root.root
    .findAllByType(Text)
    .map((node) => node.props.children)
    .flat()
    .filter((value): value is string => typeof value === "string");

describe("BusinessCardSheet", () => {
  it("presents as a sheet rather than a pushed screen", () => {
    const { root } = render(true);
    const sheet = root.root.findAllByType(Modal)[0];

    expect(sheet.props.visible).toBe(true);
    expect(sheet.props.animationType).toBe("slide");
    // pageSheet on iOS, where the presentation style is honoured.
    expect(["pageSheet", "fullScreen"]).toContain(sheet.props.presentationStyle);
  });

  it("shows the title and phone number the access token carries", () => {
    const { root } = render(true);
    const text = allText(root);

    expect(text).toContain("Jane Doe");
    expect(text).toContain("Software Engineer");
    expect(text).toContain("+94771234567");
    expect(text).toContain("jane.doe@wso2.com");
  });

  it("closes through the header control", () => {
    const { root, onClose } = render(true);

    act(() => {
      root.root
        .findByProps({ accessibilityLabel: "close_business_card" })
        .props.onPress();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("still renders the save action while the pass flag is off", () => {
    const { root } = render(true);
    expect(
      root.root.findByProps({ accessibilityLabel: "save_business_card" })
    ).toBeDefined();
  });
});
