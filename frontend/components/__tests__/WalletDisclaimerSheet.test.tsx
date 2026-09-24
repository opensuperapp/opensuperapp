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
// paths. The mechanics — a modal, a close control, a scroll view — are the same
// on both, but the copy is not, and the copy is the product: this screen is
// what WSO2 tells an employee about handing their details to a wallet. An Apple
// pass is signed by WSO2 and stays on the device, a Google pass is stored and
// rendered on Google's servers, and the two sheets have to say so separately.
// Swapping one text for the other would leave the app either warning about a
// disclosure that does not happen or silent about one that does.
import AndroidSheet from "@/components/businessCard/WalletDisclaimerSheet.android";
import AppleSheet from "@/components/businessCard/WalletDisclaimerSheet.ios";
import { DPO_EMAIL } from "@/constants/WalletDisclaimer";
import React from "react";
import { Modal, Text } from "react-native";
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

const render = (Sheet: Sheet, visible = true) => {
  const onClose = jest.fn();
  let root: ReturnType<typeof create> | undefined;
  act(() => {
    root = create(<Sheet visible={visible} onClose={onClose} />);
  });
  return { root: root!, onClose };
};

const press = (root: ReturnType<typeof create>, label: string) =>
  act(() =>
    root.root.findByProps({ accessibilityLabel: label }).props.onPress(),
  );

// The disclosure as the employee reads it, straight off the passthrough above.
const copy = (root: ReturnType<typeof create>): string => {
  const [text] = root.root.findByType(Markdown).findAllByType(Text);
  return String(text.props.children);
};

const allText = (root: ReturnType<typeof create>): string[] =>
  root.root
    .findAllByType(Text)
    .map((node) => node.props.children)
    .filter((child): child is string => typeof child === "string");

describe.each([
  ["iOS", AppleSheet] as const,
  ["Android", AndroidSheet] as const,
])("WalletDisclaimerSheet (%s)", (_name, Sheet) => {
  it("stays out of the way until it is opened", () => {
    const { root } = render(Sheet, false);

    expect(root.root.findByType(Modal).props.visible).toBe(false);
    expect(
      root.root.findAllByProps(
        { accessibilityLabel: "close_wallet_disclaimer" },
        { deep: false },
      ),
    ).toHaveLength(0);
  });

  it("closes on the cross button", () => {
    const { root, onClose } = render(Sheet);

    press(root, "close_wallet_disclaimer");

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on a system dismiss, which iOS and Android both offer", () => {
    const { root, onClose } = render(Sheet);

    act(() => root.root.findByType(Modal).props.onRequestClose());

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("only informs — there is nothing here to accept", () => {
    const { root } = render(Sheet);

    // The sheet used to gate the wallet button behind a "Continue" tap. It no
    // longer does, and a stray accept control would put that gate back.
    expect(
      root.root.findAllByProps(
        { accessibilityLabel: "accept_wallet_disclaimer" },
        { deep: false },
      ),
    ).toHaveLength(0);
  });

  it("names the DPO, which is the way to act on any of this", () => {
    expect(copy(render(Sheet).root)).toContain(DPO_EMAIL);
  });

  it("lists what actually goes on the card", () => {
    const { root } = render(Sheet);

    expect(copy(root)).toContain("What goes on the card");
    expect(copy(root)).toContain("directory photo");
  });

  it("titles itself as a disclaimer outside the scrolling copy", () => {
    const { root } = render(Sheet);

    // The `#` heading of the document is the sheet's header, so it has to be a
    // real Text and not part of the markdown body, or it would scroll away.
    expect(allText(root)).toContain(
      _name === "iOS" ? "Apple Wallet Disclaimer" : "Google Wallet Disclaimer",
    );
  });
});

// The reason the sheet is split into two files at all.
describe("WalletDisclaimerSheet — the disclosure each platform owes", () => {
  it("tells iOS the pass stays on the device, without inventing a hand-off", () => {
    const { root } = render(AppleSheet);

    expect(copy(root)).toContain("Apple Wallet on this device");
    // WSO2 signs the pass and Apple only carries a contentless push, so a
    // warning that the card details reach a third party would be false here.
    expect(copy(root)).not.toContain("Google's servers");
    expect(copy(root)).toContain("Apple never receives your card details");
  });

  it("tells Android the details are handed to Google", () => {
    const { root } = render(AndroidSheet);

    expect(copy(root)).toContain("Google's servers");
    expect(copy(root)).toContain("shares the details above with Google");
  });

  it("names the wallet it is about in the terms it asks agreement to", () => {
    expect(copy(render(AppleSheet).root)).toContain(
      "Continue with the Apple Wallet",
    );
    expect(copy(render(AndroidSheet).root)).toContain(
      "Continue with the Google Wallet",
    );
  });
});
