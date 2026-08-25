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
import { BusinessCardData } from "@/types/businessCard.types";

const CRLF = "\r\n";

const hasValue = (value: string | undefined): value is string =>
  value !== undefined && value.trim().length > 0;

// RFC 2426 §5.8.4: backslash must be escaped first, then the other
// reserved characters, or the later escapes would themselves get escaped.
const escapeText = (value: string): string =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");

const buildFullName = (firstName: string, lastName: string): string =>
  [firstName, lastName]
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join(" ");

export const buildVCard = (data: BusinessCardData): string => {
  const firstName = data.firstName.trim();
  const lastName = data.lastName.trim();

  const organization = escapeText(data.organization.trim());
  const orgLine = hasValue(data.department)
    ? `ORG:${organization};${escapeText(data.department.trim())}`
    : `ORG:${organization}`;

  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${escapeText(lastName)};${escapeText(firstName)};;;`,
    `FN:${escapeText(buildFullName(firstName, lastName))}`,
    orgLine,
  ];

  if (hasValue(data.jobTitle)) {
    lines.push(`TITLE:${escapeText(data.jobTitle.trim())}`);
  }

  lines.push(`EMAIL;TYPE=INTERNET,WORK:${escapeText(data.workEmail.trim())}`);

  if (hasValue(data.workPhone)) {
    lines.push(`TEL;TYPE=WORK,VOICE:${escapeText(data.workPhone.trim())}`);
  }

  if (hasValue(data.mobile)) {
    lines.push(`TEL;TYPE=CELL,VOICE:${escapeText(data.mobile.trim())}`);
  }

  lines.push(`URL:${escapeText(data.website.trim())}`);

  if (hasValue(data.address)) {
    lines.push(`ADR;TYPE=WORK:;;${escapeText(data.address.trim())};;;;`);
  }

  lines.push("END:VCARD");

  return lines.join(CRLF) + CRLF;
};

const UNSAFE_FILENAME_CHARS = /[/\\:*?"<>|\s]+/g;

export const vCardFileName = (data: BusinessCardData): string => {
  const fullName = buildFullName(data.firstName, data.lastName);

  const safeName = fullName
    .replace(UNSAFE_FILENAME_CHARS, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return safeName.length > 0 ? `${safeName}.vcf` : "contact.vcf";
};
