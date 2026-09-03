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

// Both platform sheets are covered here, imported by their explicit platform
// paths. The mechanics — a modal, two buttons, a spinner — are the same on
// both, but the copy is not, and the copy is the product: this screen is the
// consent record for handing employee data to a wallet. An Apple pass is
// signed by WSO2 and stays on the device, a Google pass is stored and rendered
// on Google's servers, and the two sheets have to say so separately. Swapping
// one text for the other would leave the app either warning about a disclosure
// that does not happen or silent about one that does.
import AndroidSheet from "@/components/businessCard/WalletDisclaimerSheet.android";
import AppleSheet from "@/components/businessCard/WalletDisclaimerSheet.ios";
import React from "react";
import { ActivityIndicator, Modal, Text } from "react-native";
import Markdown from "react-native-markdown-display";
import { act, create } from "react-test-renderer";

jest.mock("@expo/vector-icons", () => ({ Ionicons: () => null }));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

// The real renderer parses the markdown into a tree of styled nodes, which
// would make the copy assertable only by reassembling it from fragments. A
// passthrough that drops the source string into a Text keeps the component
// mountable and leaves the text exactly as the constant wrote it.
jest.mock("react-native-markdown-display", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ReactModule = require("react");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text: RNText } = require("react-native");

  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) =>
      ReactModule.createElement(RNText, null, children),
  };
});

type Sheet = typeof AppleSheet | typeof AndroidSheet;

const handlers = () => ({
  onCancel: jest.fn(),
  onProceed: jest.fn(),
});

const render = (Sheet: Sheet, visible = true, proceeding = false) => {
  const props = handlers();
  let root: ReturnType<typeof create> | undefined;
  act(() => {
    root = create(
      <Sheet visible={visible} proceeding={proceeding} {...props} />,
    );
  });
  return { root: root!, props };
};

const press = (root: ReturnType<typeof create>, label: string) =>
  act(() =>
    root.root.findByProps({ accessibilityLabel: label }).props.onPress(),
  );

const acceptButton = (root: ReturnType<typeof create>) =>
  root.root.findByProps({ accessibilityLabel: "accept_wallet_disclaimer" });

// The disclosure as the employee reads it, straight off the passthrough above.
const copy = (root: ReturnType<typeof create>): string => {
  const [text] = root.root.findByType(Markdown).findAllByType(Text);
  return String(text.props.children);
};

describe.each([
  ["iOS", AppleSheet] as const,
  ["Android", AndroidSheet] as const,
])("WalletDisclaimerSheet (%s)", (_name, Sheet) => {
  it("shows nothing to accept until it is opened", () => {
    const { root } = render(Sheet, false);

    expect(root.root.findByType(Modal).props.visible).toBe(false);
    expect(
      root.root.findAllByProps(
        { accessibilityLabel: "accept_wallet_disclaimer" },
        { deep: false },
      ),
    ).toHaveLength(0);
    expect(
      root.root.findAllByProps(
        { accessibilityLabel: "cancel_wallet_disclaimer" },
        { deep: false },
      ),
    ).toHaveLength(0);
  });

  it("proceeds only on the accept button", () => {
    const { root, props } = render(Sheet);

    press(root, "accept_wallet_disclaimer");

    expect(props.onProceed).toHaveBeenCalledTimes(1);
    expect(props.onCancel).not.toHaveBeenCalled();
  });

  it("cancels on the cancel button", () => {
    const { root, props } = render(Sheet);

    press(root, "cancel_wallet_disclaimer");

    expect(props.onCancel).toHaveBeenCalledTimes(1);
    expect(props.onProceed).not.toHaveBeenCalled();
  });

  it("closes the door on a second accept while the first is still running", () => {
    const { root } = render(Sheet, true, true);

    expect(acceptButton(root).props.disabled).toBe(true);
    expect(acceptButton(root).props.accessibilityState).toEqual({
      disabled: true,
    });
    expect(root.root.findAllByType(ActivityIndicator)).toHaveLength(1);
  });

  it("names the policy and the DPO, which are the ways to act on the consent", () => {
    const { root } = render(Sheet);

    expect(copy(root)).toContain("dpo@wso2.com");
    expect(copy(root)).toContain("https://wso2.com/privacy-policy");
  });

  it("lists what actually goes on the card", () => {
    const { root } = render(Sheet);

    expect(copy(root)).toContain("What goes on the card");
  });
});

// The reason the sheet is split into two files at all.
describe("WalletDisclaimerSheet — the disclosure each platform owes", () => {
  it("tells iOS the pass stays on the device, without inventing a hand-off", () => {
    const { root } = render(AppleSheet);

    expect(copy(root)).toContain("Apple Wallet");
    // WSO2 signs the pass and Apple only carries a contentless push, so a
    // warning that the card details reach a third party would be false here.
    expect(copy(root)).not.toContain("Google's servers");
  });

  it("tells Android the details are handed to Google", () => {
    const { root } = render(AndroidSheet);

    expect(copy(root)).toContain("Google's servers");
    expect(copy(root)).toContain("shares the details above with Google");
  });
});
