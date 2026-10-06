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

// The vCard encoder exists twice, here in TypeScript and again in Go in the
// wallet pass service, because the QR on the wallet pass and the QR in the app
// have to scan to the same contact.
//
// The two suites used to read one file. The service lives in its own repo, so
// vcard_cases.json is duplicated beside each suite and neither copy can be
// edited alone: change one, change the other, or the two encoders diverge
// silently and someone scans a wrong business card.
import { readFileSync } from "fs";
import { join } from "path";

import { BusinessCardData } from "@/types/businessCard.types";
import { buildVCard } from "@/utils/vcard";

const FIXTURE_PATH = join(__dirname, "vcard_cases.json");

type VCardCase = {
  name: string;
  input: BusinessCardData & { serialNumber?: string };
  expected: string;
};

const cases: VCardCase[] = JSON.parse(readFileSync(FIXTURE_PATH, "utf8")).cases;

describe("buildVCard — shared fixture with the Go wallet service", () => {
  it("loads the fixture", () => {
    expect(cases.length).toBeGreaterThan(0);
  });

  it.each(cases.map((c): [string, VCardCase] => [c.name, c]))(
    "%s",
    (_name, testCase) => {
      // Byte comparison, not field comparison. Line order, CRLF between lines
      // and the trailing CRLF after END:VCARD are all part of the contract.
      expect(buildVCard(testCase.input)).toBe(testCase.expected);
    }
  );
});
