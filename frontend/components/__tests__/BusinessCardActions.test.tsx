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

// Both platform buttons are covered here, imported by their explicit platform
// paths. These are brand-compliance tests, and none of what they check is
// visible in a normal review diff: Google forbids recolouring, dimming,
// relabelling and free-scaling its button artwork, and Apple forbids using its
// badge artwork in an app at all — iOS has to hand the whole affordance to
// PassKit's PKAddPassButton, so what is asserted there is the frame and the
// accessibility the app wraps that control in.
import AppleActions from "@/components/businessCard/BusinessCardActions.ios";
import AndroidActions from "@/components/businessCard/BusinessCardActions.android";
import AddToAppleWalletButton from "@/components/wallet/AddToAppleWalletButton";
import AddToGoogleWalletButton from "@/components/wallet/AddToGoogleWalletButton";
import {
  APPLE_ADD_PASS_BUTTON,
  GOOGLE_WALLET_BUTTON,
  GOOGLE_WALLET_BUTTON_ASPECT_RATIO,
} from "@/constants/WalletButton";
import { AppleWalletButtonView } from "@/modules/apple-wallet-button";
import React from "react";
import { ActivityIndicator } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import { act, create } from "react-test-renderer";

jest.mock("@expo/vector-icons", () => ({ Ionicons: () => null }));

// The iOS half is PassKit's PKAddPassButton behind a local Expo module, so
// there is no native view here to render and `AppleWalletButtonView` would be
// null under Jest. Standing a component in its place keeps the iOS tree
// mountable and gives the assertions below an identity to search for; what is
// asserted is the props the app hands the control, which is all the JS owns.
jest.mock("@/modules/apple-wallet-button", () => ({
  AppleWalletButtonView: jest.fn(() => null),
  isAppleWalletButtonAvailable: true,
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

type Actions = typeof AppleActions | typeof AndroidActions;

const handlers = () => ({
  onSavePass: jest.fn(),
  onOpenWallet: jest.fn(),
  onAddAgain: jest.fn(),
  onShareVCard: jest.fn(),
  onSaveAsImage: jest.fn(),
  onShowDisclaimer: jest.fn(),
});

const render = (
  Actions: Actions,
  saving: boolean,
  walletDownloadEnabled = true,
  passInWallet = false,
) => {
  const props = handlers();
  let root: ReturnType<typeof create> | undefined;
  act(() => {
    root = create(
      <Actions
        saving={saving}
        walletDownloadEnabled={walletDownloadEnabled}
        passInWallet={passInWallet}
        {...props}
      />,
    );
  });
  return { root: root!, props };
};

const flatten = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean));

const button = (root: ReturnType<typeof create>) =>
  root.root.findByProps({ accessibilityLabel: "save_business_card" });

// The stand-in for PKAddPassButton itself, one level under the thin wrapper.
const addPassButton = (root: ReturnType<typeof create>) =>
  root.root.findByType(AppleWalletButtonView!);

describe.each([
  ["iOS", AppleActions] as const,
  ["Android", AndroidActions] as const,
])("BusinessCardActions (%s) — shared behaviour", (_name, Actions) => {
  it("fires onSavePass when the wallet button is tapped", () => {
    const { root, props } = render(Actions, false);
    act(() => button(root).props.onPress());
    expect(props.onSavePass).toHaveBeenCalledTimes(1);
  });

  it("swaps the vendor artwork for a spinner while saving, never dimming it", () => {
    const { root } = render(Actions, true);
    expect(root.root.findAllByType(ActivityIndicator)).toHaveLength(1);
    // A dimmed or tinted vendor button is a guideline violation on both
    // platforms, so the pending state must not set opacity on the tap target.
    expect(flatten(button(root).props.style).opacity).toBeUndefined();
  });

  it("still offers the two fallbacks that do not need a wallet", () => {
    const { root, props } = render(Actions, false);

    act(() =>
      root.root
        .findByProps({ accessibilityLabel: "share_contact_file" })
        .props.onPress(),
    );
    act(() =>
      root.root
        .findByProps({ accessibilityLabel: "save_card_image" })
        .props.onPress(),
    );

    expect(props.onShareVCard).toHaveBeenCalledTimes(1);
    expect(props.onSaveAsImage).toHaveBeenCalledTimes(1);
  });
});

describe("BusinessCardActions (iOS) — PKAddPassButton", () => {
  it("uses PassKit's control, not Apple's badge artwork", () => {
    const { root } = render(AppleActions, false);

    expect(root.root.findAllByType(AddToAppleWalletButton)).toHaveLength(1);
    expect(root.root.findAllByType(AppleWalletButtonView!)).toHaveLength(1);
    // Apple restricts the badge to "web pages and emails, or printed
    // materials" and says apps must use PKAddPassButton, so no transcribed
    // artwork may come back: the system draws and localises this control.
    expect(root.root.findAllByType(Svg)).toHaveLength(0);
  });

  it("asks for one of the two styles PassKit defines", () => {
    const { root } = render(AppleActions, false);
    expect(["black", "blackOutline"]).toContain(
      addPassButton(root).props.addPassButtonStyle,
    );
  });

  it("spans the footer's width, which the control supports", () => {
    const { root } = render(AppleActions, false);
    const style = flatten(addPassButton(root).props.style);

    // The control fills the frame it is given — background edge to edge, glyph
    // and label centred — so the width is the footer's, not a fixed number.
    expect(style.alignSelf).toBe("stretch");
    expect(style.width).toBeUndefined();
    expect(style.aspectRatio).toBeUndefined();
  });

  it("never hands the control a frame it has to scale its artwork into", () => {
    const { root } = render(AppleActions, false);
    const style = flatten(addPassButton(root).props.style);

    expect(style.height).toBe(APPLE_ADD_PASS_BUTTON.height);
    // Below its intrinsic height the system shrinks its own glyph and label.
    expect(APPLE_ADD_PASS_BUTTON.height).toBeGreaterThanOrEqual(
      APPLE_ADD_PASS_BUTTON.intrinsicHeight,
    );
    expect(APPLE_ADD_PASS_BUTTON.height).toBeGreaterThanOrEqual(44);
  });

  it("leaves the announcement to the control instead of doubling it", () => {
    const { root } = render(AppleActions, false);

    // PKAddPassButton is already an accessibility element with the button trait
    // and a system-localised label, so the container adds neither a role nor a
    // hint. The label stays: it is how the rest of the code finds this button.
    expect(button(root).props.accessibilityLabel).toBe("save_business_card");
    expect(button(root).props.accessibilityRole).toBeUndefined();
    expect(button(root).props.accessibilityHint).toBeUndefined();
    expect(button(root).props.accessible).toBeUndefined();
  });

  it("takes the control off screen while a pass is being fetched", () => {
    const { root } = render(AppleActions, true);

    // A system control cannot be dimmed or disabled in place without
    // restyling it, so there is nothing left to tap at all.
    expect(root.root.findAllByType(AppleWalletButtonView!)).toHaveLength(0);
    expect(button(root).props.onPress).toBeUndefined();
    expect(button(root).props.accessibilityState).toEqual({ disabled: true });
  });
});

describe("BusinessCardActions (Android) — Add to Google Wallet button", () => {
  const artwork = (root: ReturnType<typeof create>) =>
    root.root
      .findByType(AddToGoogleWalletButton)
      .findByProps({ viewBox: "0 0 283 50" });

  it("renders Google's button artwork, not a text button", () => {
    const { root } = render(AndroidActions, false);
    expect(root.root.findAllByType(AddToGoogleWalletButton)).toHaveLength(1);
  });

  it("draws the button at Google's own artboard height, clearing its 48 dp minimum", () => {
    const { root } = render(AndroidActions, false);
    const svg = artwork(root);

    expect(svg.props.height).toBe(GOOGLE_WALLET_BUTTON.intrinsicHeight);
    expect(svg.props.height).toBeGreaterThanOrEqual(
      GOOGLE_WALLET_BUTTON.minHeight,
    );
  });

  it("never free-scales the button: width follows the artwork ratio", () => {
    const { root } = render(AndroidActions, false);
    const svg = artwork(root);
    expect(svg.props.width / svg.props.height).toBeCloseTo(
      GOOGLE_WALLET_BUTTON_ASPECT_RATIO,
    );
  });

  it("disables the button while a pass is being fetched", () => {
    const { root } = render(AndroidActions, true);
    expect(button(root).props.disabled).toBe(true);
    expect(button(root).props.accessibilityState).toEqual({ disabled: true });
  });

  it("keeps Google's 8 dp clear space and leaves the artwork untinted", () => {
    const { root } = render(AndroidActions, false);
    expect(flatten(button(root).props.style).padding).toBe(
      GOOGLE_WALLET_BUTTON.clearSpace,
    );
    // Recolouring is forbidden, so the artwork must still carry Google's own
    // fills: the dark pill and the three brand colours of the card stack.
    const fills = [
      ...artwork(root).findAllByType(Rect),
      ...artwork(root).findAllByType(Path),
    ].map((node) => node.props.fill);
    expect(fills).toEqual(
      expect.arrayContaining(["#1F1F1F", "#34A853", "#FBBC04", "#EA4335"]),
    );
  });

  it("leaves no shape with an unset fill", () => {
    const { root } = render(AndroidActions, false);
    // react-native-svg defaults an unset fill to black rather than inheriting
    // the root's `fill="none"` the way Google's .svg does, so a stroke-only
    // shape with no explicit fill paints a solid pill over the artwork.
    const shapes = [
      ...artwork(root).findAllByType(Rect),
      ...artwork(root).findAllByType(Path),
    ];
    expect(shapes.length).toBeGreaterThan(0);
    for (const shape of shapes) {
      expect(shape.props.fill).toBeDefined();
    }
  });
});

describe.each([
  ["iOS", AppleActions] as const,
  ["Android", AndroidActions] as const,
])("BusinessCardActions (%s) — wallet pass disabled", (_name, Actions) => {
  it("renders no vendor artwork and no wallet button", () => {
    const { root } = render(Actions, false, false);

    expect(root.root.findAllByType(AddToAppleWalletButton)).toHaveLength(0);
    expect(root.root.findAllByType(AddToGoogleWalletButton)).toHaveLength(0);
    expect(
      root.root.findAllByProps(
        { accessibilityLabel: "save_business_card" },
        { deep: false },
      ),
    ).toHaveLength(0);
  });

  it("renders a primary Save image button that calls onSaveAsImage", () => {
    const { root, props } = render(Actions, false, false);

    const saveImage = root.root.findByProps({
      accessibilityLabel: "save_card_image",
    });
    expect(saveImage.props.accessibilityRole).toBe("button");

    act(() => saveImage.props.onPress());
    expect(props.onSaveAsImage).toHaveBeenCalledTimes(1);
  });

  it("still offers Share contact file", () => {
    const { root, props } = render(Actions, false, false);

    act(() =>
      root.root
        .findByProps({ accessibilityLabel: "share_contact_file" })
        .props.onPress(),
    );
    expect(props.onShareVCard).toHaveBeenCalledTimes(1);
  });

  it("never renders both the primary and secondary Save image affordances at once", () => {
    const { root } = render(Actions, false, false);
    expect(
      root.root.findAllByProps(
        { accessibilityLabel: "save_card_image" },
        { deep: false },
      ),
    ).toHaveLength(1);
  });
});

describe.each([
  ["iOS", AppleActions] as const,
  ["Android", AndroidActions] as const,
])("BusinessCardActions (%s) — wallet pass enabled", (_name, Actions) => {
  it("has exactly one Save image affordance, tucked into the secondary row", () => {
    const { root } = render(Actions, false, true);
    expect(
      root.root.findAllByProps(
        { accessibilityLabel: "save_card_image" },
        { deep: false },
      ),
    ).toHaveLength(1);
  });
});

// On iOS, once the card is in the wallet the add button has no work left:
// re-adding re-opens the same PassKit sheet to no effect. PassKit is also the
// one that answers the presence question, so the app is acting on the wallet's
// own word. The primary slot goes to a plain "Open" affordance drawn in app
// chrome, because Apple does not allow its control to be relabelled.
describe("BusinessCardActions (iOS) — card already in the wallet", () => {
  const openButton = (root: ReturnType<typeof create>) =>
    root.root.findByProps({ accessibilityLabel: "open_wallet_app" });

  it("drops the add button and offers Open in wallet instead", () => {
    const { root } = render(AppleActions, false, true, true);

    expect(root.root.findAllByType(AddToAppleWalletButton)).toHaveLength(0);
    expect(
      root.root.findAllByProps(
        { accessibilityLabel: "save_business_card" },
        { deep: false },
      ),
    ).toHaveLength(0);
    expect(
      root.root.findAllByProps(
        { accessibilityLabel: "open_wallet_app" },
        { deep: false },
      ),
    ).toHaveLength(1);
  });

  it("fires onOpenWallet, not onSavePass, when it is tapped", () => {
    const { root, props } = render(AppleActions, false, true, true);

    act(() => openButton(root).props.onPress());

    expect(props.onOpenWallet).toHaveBeenCalledTimes(1);
    expect(props.onSavePass).not.toHaveBeenCalled();
  });

  it("offers no Add again: PassKit answers presence, so nothing can go stale", () => {
    const { root } = render(AppleActions, false, true, true);

    expect(
      root.root.findAllByProps(
        { accessibilityLabel: "add_to_wallet_again" },
        { deep: false },
      ),
    ).toHaveLength(0);
  });
});

// Android does none of that, and the reason is that neither half of it holds.
// There is no Google Wallet app to open — the save URL is a web link, so an
// "Open in Google Wallet" button put the employee in a browser instead of the
// wallet it named. And Google cannot be asked what a wallet holds, so
// passInWallet is only a note of what this device last did: a card deleted from
// Google Wallet, or added on another device, would have left that employee with
// a browser link and no way to add it back. So the add button always stands.
describe("BusinessCardActions (Android) — the wallet slot never changes", () => {
  it("keeps Google's add button even when the app thinks the card is saved", () => {
    const { root, props } = render(AndroidActions, false, true, true);

    expect(root.root.findAllByType(AddToGoogleWalletButton)).toHaveLength(1);

    act(() =>
      root.root
        .findByProps({ accessibilityLabel: "save_business_card" })
        .props.onPress(),
    );

    expect(props.onSavePass).toHaveBeenCalledTimes(1);
  });

  it("offers no Open in wallet, which only ever reached a browser", () => {
    const { root, props } = render(AndroidActions, false, true, true);

    expect(
      root.root.findAllByProps(
        { accessibilityLabel: "open_wallet_app" },
        { deep: false },
      ),
    ).toHaveLength(0);
    expect(props.onOpenWallet).not.toHaveBeenCalled();
  });

  it("offers no Add again, now that the add button is never taken away", () => {
    const { root } = render(AndroidActions, false, true, true);

    expect(
      root.root.findAllByProps(
        { accessibilityLabel: "add_to_wallet_again" },
        { deep: false },
      ),
    ).toHaveLength(0);
  });
});

// The disclaimer describes what a wallet does with the employee's details. With
// the wallet download switched off the card never reaches a wallet at all, so
// the notice would be describing something that cannot happen — and offering it
// there would imply an affordance the remote config has taken away.
describe.each([
  ["iOS", AppleActions] as const,
  ["Android", AndroidActions] as const,
])(
  "BusinessCardActions (%s) — the wallet disclaimer link",
  (_name, Actions) => {
    const label = { accessibilityLabel: "view_wallet_disclaimer" };

    it("offers the disclaimer once the wallet download is on", () => {
      const { root, props } = render(Actions, false, true);

      expect(root.root.findAllByProps(label, { deep: false })).toHaveLength(1);

      act(() => root.root.findByProps(label).props.onPress());

      expect(props.onShowDisclaimer).toHaveBeenCalledTimes(1);
    });

    it("keeps offering it once the card is already in the wallet", () => {
      const { root } = render(Actions, false, true, true);

      expect(root.root.findAllByProps(label, { deep: false })).toHaveLength(1);
    });

    it("withholds it when the wallet download is off", () => {
      const { root } = render(Actions, false, false);

      expect(root.root.findAllByProps(label, { deep: false })).toHaveLength(0);
    });
  },
);
