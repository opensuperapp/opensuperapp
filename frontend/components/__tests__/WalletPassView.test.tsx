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
import WalletPassView from "@/components/WalletPassView";
import { PASS_BACKGROUND_COLOR } from "@/constants/BusinessCard";
import { BusinessCardData } from "@/types/businessCard.types";
import { DecodedAccessToken } from "@/types/decodeAccessToken.types";
import { toBusinessCardData } from "@/utils/businessCard";
import { buildVCard } from "@/utils/vcard";
import { jwtDecode } from "jwt-decode";
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

const qrValue = (root: ReturnType<typeof create>): string =>
  root.root.findByType(QRCode).props.value;

const flatten = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean));

describe("WalletPassView — pass.json parity", () => {
  it("renders the name as the primary field with no label above it", () => {
    const { root } = render(baseData);
    const text = allText(root);
    expect(text).toContain("Jane Doe");
    // pass.go writes label:"" for the name field, so there must be no NAME row.
    expect(text).not.toContain("NAME");
  });

  it("renders the TITLE, EMAIL and PHONE labels the service writes", () => {
    const { root } = render(baseData);
    const text = allText(root);
    expect(text).toContain("TITLE");
    expect(text).toContain("EMAIL");
    expect(text).toContain("PHONE");
  });

  it("drops the whole TITLE row when there is no job title", () => {
    const { root } = render({ ...baseData, jobTitle: undefined });
    expect(allText(root)).not.toContain("TITLE");
  });

  it("drops the whole PHONE row when there is neither work phone nor mobile", () => {
    const { root } = render({
      ...baseData,
      workPhone: undefined,
      mobile: undefined,
    });
    const text = allText(root);
    expect(text).not.toContain("PHONE");
    expect(text).toContain("EMAIL");
  });
});

describe("WalletPassView — front phone precedence", () => {
  // Mirrors the wallet pass service's Apple pass builder (frontPhone).
  it("shows the work phone when there is one", () => {
    const { root } = render({ ...baseData, workPhone: "+94112345678" });
    const text = allText(root);
    expect(text).toContain("+94112345678");
    expect(text).not.toContain("+94771234567");
  });

  it("falls back to the mobile when there is no work phone", () => {
    const { root } = render(baseData);
    expect(allText(root)).toContain("+94771234567");
  });
});

describe("WalletPassView — barcode", () => {
  it("encodes exactly buildVCard(data)", () => {
    const { root } = render(baseData);
    expect(qrValue(root)).toBe(buildVCard(baseData));
  });

  it("never encodes the photo, even a huge data URI", () => {
    const { root } = render({
      ...baseData,
      photoUri: `data:image/png;base64,${"A".repeat(5000)}`,
    });
    expect(qrValue(root)).not.toContain("PHOTO");
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
});

describe("WalletPassView — artwork", () => {
  it("paints the pass in the signed pass background colour, not the app orange", () => {
    const { root } = render(baseData);
    const pass = root.root.findByProps({ collapsable: false });
    expect(flatten(pass.props.style).backgroundColor).toBe(
      PASS_BACKGROUND_COLOR
    );
  });

  it("renders the employee photo as a ringed circle when there is one", () => {
    const { root } = render(baseData);
    const photo = root.root
      .findAllByType(Image)
      .find((node) => node.props.source?.uri === baseData.photoUri);

    expect(photo).toBeDefined();
    const style = flatten(photo!.props.style);
    // internal/photo draws a circle with a ring 4% of the diameter wide.
    expect(style.borderRadius).toBe((style.width as number) / 2);
    expect(style.borderWidth).toBeCloseTo((style.width as number) * 0.04);
  });

  it("renders no photo element at all when the employee has none", () => {
    const { root } = render({ ...baseData, photoUri: undefined });
    const remote = root.root
      .findAllByType(Image)
      .filter((node) => node.props.source?.uri !== undefined);
    expect(remote).toHaveLength(0);
  });

  it("populates the forwarded ref after render", () => {
    const { ref } = render(baseData);
    expect(ref.current).not.toBeNull();
  });
});

describe("WalletPassView — card geometry", () => {
  it("keeps the card in portrait 2:3, so it is taller than it is wide", () => {
    const { root } = render(baseData);
    const pass = root.root.findByProps({ collapsable: false });
    expect(flatten(pass.props.style).aspectRatio).toBeCloseTo(2 / 3);
  });

  it("draws the brand mark at exactly 40x40, pinned to the top-left", () => {
    const { root } = render(baseData);
    // The only local asset on the card is the pulse mark; the employee photo
    // is a remote { uri } source.
    const mark = root.root
      .findAllByType(Image)
      .find((node) => node.props.source?.uri === undefined);

    expect(mark).toBeDefined();
    const style = flatten(mark!.props.style);
    expect(style.width).toBe(40);
    expect(style.height).toBe(40);
    expect(style.alignSelf).toBe("flex-start");
    // Nothing above it: the mark sits against the content inset, which is what
    // "top-left" means once the pass's own padding is applied.
    expect(style.marginTop ?? 0).toBe(0);
  });
});

describe("WalletPassView — a real access token, end to end", () => {
  // The exact payload Asgardeo issues for a signed-in employee. Encoded and
  // decoded rather than hand-built, because the complaint this test exists for
  // was "the title and phone are missing from the card" — and every claim they
  // come from is right here in the token.
  const payload = {
    sub: "jane.doe@wso2.com",
    jobtitle: "Software Engineer",
    profile:
      "https://lh3.googleusercontent.com/a-/AAcHTtexampleavatartoken=s100",
    given_name: "Jane",
    family_name: "Doe",
    userid: "00000000-0000-4000-8000-000000000000",
    phone_number: "+94771234567",
    email: "jane.doe@wso2.com",
    org_handle: "wso2",
  };

  const base64Url = (value: object): string =>
    Buffer.from(JSON.stringify(value))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  const token = `${base64Url({ alg: "RS256", typ: "JWT" })}.${base64Url(
    payload
  )}.signature`;

  it("puts every claim on the card, with no directory response at all", () => {
    const claims = jwtDecode<DecodedAccessToken>(token);
    const data = toBusinessCardData(null, claims);
    expect(data).not.toBeNull();

    const { root } = render(data!);
    const text = allText(root);

    expect(text).toContain("Jane Doe");
    expect(text).toContain("TITLE");
    expect(text).toContain("Software Engineer");
    expect(text).toContain("EMAIL");
    expect(text).toContain("jane.doe@wso2.com");
    expect(text).toContain("PHONE");
    expect(text).toContain("+94771234567");

    // The avatar renders at full resolution — the =s100 suffix is stripped.
    const photo = root.root
      .findAllByType(Image)
      .find((node) => node.props.source?.uri !== undefined);
    expect(photo!.props.source.uri).toBe(
      "https://lh3.googleusercontent.com/a-/AAcHTtexampleavatartoken"
    );
  });
});
