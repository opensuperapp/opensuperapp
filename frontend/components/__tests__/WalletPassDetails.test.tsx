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
import { backFields } from "@/components/WalletPassDetails";
import { BusinessCardData } from "@/types/businessCard.types";

const baseData: BusinessCardData = {
  firstName: "Jane",
  lastName: "Doe",
  jobTitle: "Software Engineer",
  workEmail: "jane.doe@wso2.com",
  organization: "WSO2 LLC",
  website: "https://wso2.com",
};

// The order and labels are pinned against the wallet pass service's Apple
// pass builder (backFields). If that function changes, this test is the one
// that should fail.
describe("backFields", () => {
  it("always carries WEBSITE first, even with nothing else set", () => {
    expect(backFields(baseData)).toEqual([
      { key: "site", label: "WEBSITE", value: "https://wso2.com" },
    ]);
  });

  it("orders WEBSITE, OFFICE, PHONE, MOBILE when all are present", () => {
    const fields = backFields({
      ...baseData,
      address: "20 Palm Grove, Colombo 03, Sri Lanka",
      workPhone: "+94112345678",
      mobile: "+94771234567",
    });

    expect(fields.map((field) => field.label)).toEqual([
      "WEBSITE",
      "OFFICE",
      "PHONE",
      "MOBILE",
    ]);
  });

  it("omits an absent field entirely rather than emitting an empty row", () => {
    const fields = backFields({ ...baseData, mobile: "+94771234567" });

    expect(fields.map((field) => field.label)).toEqual(["WEBSITE", "MOBILE"]);
    expect(fields.every((field) => field.value.length > 0)).toBe(true);
  });
});
