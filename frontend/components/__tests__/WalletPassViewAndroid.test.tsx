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

// Imported by its explicit platform path: jest-expo resolves a bare
// "@/components/WalletPassView" to the iOS file, which the sibling
// WalletPassView.test.tsx covers.
import WalletPassView from "@/components/WalletPassView.android";
import { PASS_BACKGROUND_COLOR } from "@/constants/BusinessCard";
import { GOOGLE_PASS } from "@/constants/GooglePass";
import { BusinessCardData } from "@/types/businessCard.types";
import { buildVCard } from "@/utils/vcard";
import React from "react";
import { Image, Text, View } from "react-native";
import { act, create } from "react-test-renderer";

jest.mock("react-native-qrcode-svg", () => {
  const MockQRCode = (_props: { value: string }) => null;
  return {
    __esModule: true,
    default: MockQRCode,
  };
});

const QRCode = jest.requireMock("react-native-qrcode-svg").default;

const baseData: BusinessCardData = {
  firstName: "Jane",
  lastName: "Doe",
  jobTitle: "Software Engineer",
  workEmail: "jane.doe@wso2.com",
  mobile: "+94771234567",
  organization: "WSO2 LLC",
  website: "https://wso2.com",
  address: "20 Palm Grove, Colombo 03, Sri Lanka",
  photoUri: "https://lh3.googleusercontent.com/a-/abc",
};

const render = (data: BusinessCardData, onBarcodePress?: () => void) => {
  const ref = React.createRef<View>();
  let root: ReturnType<typeof create> | undefined;
  act(() => {
    root = create(
      <WalletPassView ref={ref} data={data} onBarcodePress={onBarcodePress} />
    );
  });
  return { root: root!, ref };
};

const allText = (root: ReturnType<typeof create>): string[] =>
  root.root
    .findAllByType(Text)
    .map((node) => node.props.children)
    .flat()
    .filter((value): value is string => typeof value === "string");

const flatten = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean));

const card = (root: ReturnType<typeof create>) =>
  root.root.findByProps({ collapsable: false });

describe("WalletPassView (Android) — Generic pass zones", () => {
  it("puts the organization in the card title row and the name in the header", () => {
    const { root } = render(baseData);
    const text = allText(root);
    expect(text).toContain("WSO2 LLC");
    expect(text).toContain("Jane Doe");
  });

  it("renders the job title as the subheader, above the name", () => {
    const { root } = render(baseData);
    const text = allText(root);
    expect(text.indexOf("Software Engineer")).toBeLessThan(
      text.indexOf("Jane Doe")
    );
  });

  it("drops the subheader entirely when there is no job title", () => {
    const { root } = render({ ...baseData, jobTitle: undefined });
    expect(allText(root)).not.toContain("Software Engineer");
  });

  it("labels the text modules in Title Case, not the SHOUTED Apple labels", () => {
    const { root } = render(baseData);
    const text = allText(root);
    expect(text).toContain("Email");
    expect(text).toContain("Phone");
    expect(text).not.toContain("EMAIL");
    expect(text).not.toContain("PHONE");
  });

  it("keeps the front to one row of at most two fields", () => {
    const { root } = render({ ...baseData, workPhone: "+94112345678" });
    const text = allText(root);
    const labels = text.filter((value) => ["Email", "Phone"].includes(value));
    expect(labels).toHaveLength(GOOGLE_PASS.fieldsPerRow);
  });

  it("shows the work phone over the mobile, like the pass the service builds", () => {
    const { root } = render({ ...baseData, workPhone: "+94112345678" });
    const text = allText(root);
    expect(text).toContain("+94112345678");
    expect(text).not.toContain("+94771234567");
  });
});

describe("WalletPassView (Android) — card geometry", () => {
  it("has no fixed aspect ratio: a Google pass is as tall as its content", () => {
    const { root } = render(baseData);
    expect(flatten(card(root).props.style).aspectRatio).toBeUndefined();
  });

  it("paints the card in the colour the service sends as hexBackgroundColor", () => {
    const { root } = render(baseData);
    expect(flatten(card(root).props.style).backgroundColor).toBe(
      PASS_BACKGROUND_COLOR
    );
  });

  it("masks the logo into a circle, as Wallet does", () => {
    const { root } = render(baseData);
    const logo = root.root
      .findAllByType(Image)
      .find((node) => node.props.source?.uri === undefined);

    const style = flatten(logo!.props.style);
    expect(style.width).toBe(GOOGLE_PASS.logoSize);
    expect(style.borderRadius).toBe(GOOGLE_PASS.logoSize / 2);
  });

  // The pass class carries no hero image, so the preview draws the logo and
  // nothing else — no photo, in any position.
  it("renders no image beyond the logo, even when the employee has a photo", () => {
    const { root } = render(baseData);
    const remote = root.root
      .findAllByType(Image)
      .filter((node) => node.props.source?.uri !== undefined);
    expect(remote).toHaveLength(0);
  });

  it("renders no image beyond the logo when the employee has no photo", () => {
    const { root } = render({ ...baseData, photoUri: undefined });
    const remote = root.root
      .findAllByType(Image)
      .filter((node) => node.props.source?.uri !== undefined);
    expect(remote).toHaveLength(0);
  });
});

describe("WalletPassView (Android) — barcode", () => {
  it("encodes exactly buildVCard(data)", () => {
    const { root } = render(baseData);
    expect(root.root.findByType(QRCode).props.value).toBe(buildVCard(baseData));
  });

  it("prints the alternate text under the barcode", () => {
    const { root } = render(baseData);
    expect(allText(root)).toContain(baseData.workEmail);
  });

  it("calls onBarcodePress when the barcode is tapped", () => {
    const onBarcodePress = jest.fn();
    const { root } = render(baseData, onBarcodePress);

    act(() => {
      root.root
        .findByProps({ accessibilityLabel: "pass_barcode" })
        .props.onPress();
    });

    expect(onBarcodePress).toHaveBeenCalledTimes(1);
  });

  it("populates the forwarded ref after render", () => {
    const { ref } = render(baseData);
    expect(ref.current).not.toBeNull();
  });
});
