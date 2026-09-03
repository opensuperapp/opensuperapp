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
import WalletPassDetails, {
  detailRows,
} from "@/components/WalletPassDetails.android";
import { BusinessCardData } from "@/types/businessCard.types";
import React from "react";
import { Text } from "react-native";
import { act, create } from "react-test-renderer";

jest.mock("@expo/vector-icons", () => ({ Ionicons: () => null }));

const baseData: BusinessCardData = {
  firstName: "Jane",
  lastName: "Doe",
  jobTitle: "Software Engineer",
  workEmail: "jane.doe@wso2.com",
  workPhone: "+94112345678",
  mobile: "+94771234567",
  organization: "WSO2 LLC",
  website: "https://wso2.com",
  address: "20 Palm Grove, Colombo 03, Sri Lanka",
};

const render = (data: BusinessCardData) => {
  let root: ReturnType<typeof create> | undefined;
  act(() => {
    root = create(<WalletPassDetails data={data} colorScheme="light" />);
  });
  return root!;
};

const allText = (root: ReturnType<typeof create>): string[] =>
  root.root
    .findAllByType(Text)
    .map((node) => node.props.children)
    .flat()
    .filter((value): value is string => typeof value === "string");

describe("WalletPassDetails (Android) — expanded view", () => {
  it("labels every row in Title Case, as Google's guidelines require", () => {
    const labels = detailRows(baseData).map((row) => row.label);
    labels.forEach((label) => {
      expect(label).toBe(label[0].toUpperCase() + label.slice(1));
      expect(label).not.toBe(label.toUpperCase());
    });
  });

  it("gives every row an icon, which is how Wallet renders link modules", () => {
    detailRows(baseData).forEach((row) => {
      expect(row.icon).toBeTruthy();
    });
  });

  it("lists phone, mobile, email, website and office when all are present", () => {
    expect(detailRows(baseData).map((row) => row.key)).toEqual([
      "phone",
      "mobile",
      "email",
      "site",
      "addr",
    ]);
  });

  it("drops the rows the employee has no value for", () => {
    const rows = detailRows({
      ...baseData,
      workPhone: undefined,
      mobile: undefined,
      address: undefined,
    });
    expect(rows.map((row) => row.key)).toEqual(["email", "site"]);
  });

  it("renders each row's label and value", () => {
    const text = allText(render(baseData));
    expect(text).toContain("Office");
    expect(text).toContain(baseData.address);
    expect(text).toContain("Mobile");
    expect(text).toContain(baseData.mobile);
  });
});
