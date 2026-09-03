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
import BusinessCardQrModal from "@/components/businessCard/BusinessCardQrModal";
import WalletDisclaimerSheet from "@/components/businessCard/WalletDisclaimerSheet";
import { saveBusinessCardPass } from "@/services/walletPassService";
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

// A mutable object lets individual tests flip walletDownloadEnabled without
// re-mocking the module.
const walletPassConfig = { cardEnabled: true, walletDownloadEnabled: false };
jest.mock("@/hooks/useWalletPassConfig", () => ({
  useWalletPassConfig: () => walletPassConfig,
}));

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

// The presence check reaches PassKit on iOS and AsyncStorage on Android;
// neither exists here, and this suite is about the sheet's wiring rather than
// what either platform answers.
jest.mock("@/services/wallet/passPresence", () => ({
  isPassInWallet: jest.fn().mockResolvedValue(false),
  markPassAdded: jest.fn().mockResolvedValue(undefined),
  openPassInWallet: jest.fn().mockResolvedValue(true),
}));

// Rendering the consent copy is WalletDisclaimerSheet's own suite's job. Here
// the markdown body only has to mount.
jest.mock("react-native-markdown-display", () => {
  const { Text: RnText } = jest.requireActual("react-native");
  return {
    __esModule: true,
    default: ({ children }: { children: string }) => (
      <RnText>{children}</RnText>
    ),
  };
});

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

// By component rather than by index into findAllByType(Modal): the sheet now
// nests two overlays, and an index silently starts pointing at whichever one
// happens to render first.
const qrModal = (root: ReturnType<typeof create>) =>
  root.root.findByType(BusinessCardQrModal);

const disclaimerSheet = (root: ReturnType<typeof create>) =>
  root.root.findByType(WalletDisclaimerSheet);

describe("BusinessCardSheet", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("presents as a sheet rather than a pushed screen", () => {
    const { root } = render(true);
    const sheet = root.root.findAllByType(Modal)[0];

    expect(sheet.props.visible).toBe(true);
    expect(sheet.props.animationType).toBe("slide");
    // pageSheet on iOS, where the presentation style is honoured.
    expect(["pageSheet", "fullScreen"]).toContain(
      sheet.props.presentationStyle,
    );
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

  // The hook is mocked to false by default, which is the hidden case: no
  // vendor wallet button, "Save image" promoted to the primary slot.
  it("leads with Save image while the pass flag is off", () => {
    const { root } = render(true);

    expect(
      root.root.findAllByProps({ accessibilityLabel: "save_business_card" }),
    ).toHaveLength(0);
    expect(allText(root)).toContain("Save image");
    expect(allText(root)).not.toContain("Save as image");
  });

  it("leads with the wallet badge while the pass flag is on", () => {
    walletPassConfig.walletDownloadEnabled = true;
    try {
      const { root } = render(true);

      expect(
        root.root.findAllByProps(
          { accessibilityLabel: "save_business_card" },
          { deep: false },
        ),
      ).toHaveLength(1);
      expect(allText(root)).not.toContain("Save image");
      expect(allText(root)).toContain("Save as image");
    } finally {
      walletPassConfig.walletDownloadEnabled = false;
    }
  });

  // The whole point of the consent step: the wallet button asks, it does not
  // save. A regression here would put employee data in a third-party wallet on
  // a single tap, which is the thing the sheet exists to prevent.
  it("asks for consent before building a pass, rather than saving on the tap", () => {
    walletPassConfig.walletDownloadEnabled = true;
    try {
      const { root } = render(true);
      expect(disclaimerSheet(root).props.visible).toBe(false);

      act(() => {
        root.root
          .findAllByProps(
            { accessibilityLabel: "save_business_card" },
            { deep: false },
          )[0]
          .props.onPress();
      });

      expect(disclaimerSheet(root).props.visible).toBe(true);
      expect(saveBusinessCardPass).not.toHaveBeenCalled();
    } finally {
      walletPassConfig.walletDownloadEnabled = false;
    }
  });

  it("builds the pass only once consent is given, and not when it is declined", async () => {
    walletPassConfig.walletDownloadEnabled = true;
    try {
      const { root } = render(true);

      act(() => {
        root.root
          .findAllByProps(
            { accessibilityLabel: "save_business_card" },
            { deep: false },
          )[0]
          .props.onPress();
      });

      act(() => {
        disclaimerSheet(root).props.onCancel();
      });
      expect(disclaimerSheet(root).props.visible).toBe(false);
      expect(saveBusinessCardPass).not.toHaveBeenCalled();

      act(() => {
        root.root
          .findAllByProps(
            { accessibilityLabel: "save_business_card" },
            { deep: false },
          )[0]
          .props.onPress();
      });
      await act(async () => {
        await disclaimerSheet(root).props.onProceed();
      });

      expect(saveBusinessCardPass).toHaveBeenCalledTimes(1);
      expect(disclaimerSheet(root).props.visible).toBe(false);
    } finally {
      walletPassConfig.walletDownloadEnabled = false;
    }
  });

  it("drops the QR overlay when the sheet is hidden, so reopening starts clean", () => {
    const { root, onClose } = render(true);

    act(() => {
      root.root
        .findByProps({ accessibilityLabel: "pass_barcode" })
        .props.onPress();
    });
    expect(qrModal(root).props.visible).toBe(true);

    // The sheet stays mounted while hidden. This is the iOS swipe-to-dismiss
    // path too: no onRequestClose, the parent just flips `visible`.
    act(() => {
      root.update(<BusinessCardSheet visible={false} onClose={onClose} />);
    });
    act(() => {
      root.update(<BusinessCardSheet visible onClose={onClose} />);
    });

    expect(qrModal(root).props.visible).toBe(false);
  });

  it("logs card_viewed only when the sheet becomes visible", () => {
    const log = jest.spyOn(console, "log").mockImplementation(() => {});
    const onClose = jest.fn();
    let root: ReturnType<typeof create>;

    act(() => {
      root = create(<BusinessCardSheet visible onClose={onClose} />);
    });
    act(() => {
      root!.update(<BusinessCardSheet visible={false} onClose={onClose} />);
    });
    act(() => {
      root!.update(<BusinessCardSheet visible onClose={onClose} />);
    });

    expect(
      log.mock.calls.filter(
        ([tag, event]) => tag === "[analytics]" && event === "card_viewed",
      ),
    ).toHaveLength(2);

    log.mockRestore();
  });
});
