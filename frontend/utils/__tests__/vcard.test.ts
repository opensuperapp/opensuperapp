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
import { buildVCard, vCardFileName } from "@/utils/vcard";
import { BusinessCardData } from "@/types/businessCard.types";

const fullData: BusinessCardData = {
  firstName: "Jane",
  lastName: "Doe",
  jobTitle: "Software Engineer",
  department: "Platform",
  workEmail: "jane.doe@wso2.com",
  workPhone: "+94112345678",
  mobile: "+94771234567",
  organization: "WSO2 LLC",
  website: "https://wso2.com",
  address: "20 Palm Grove, Colombo 03, Sri Lanka",
  photoUri: "data:image/png;base64,AAAA",
};

const minimalData: BusinessCardData = {
  firstName: "Jane",
  lastName: "Doe",
  workEmail: "jane.doe@wso2.com",
  organization: "WSO2 LLC",
  website: "https://wso2.com",
};

describe("buildVCard — document structure", () => {
  it("builds a full vCard 3.0 document with all fields, in order", () => {
    const vcard = buildVCard(fullData);
    const expectedLines = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      "N:Doe;Jane;;;",
      "FN:Jane Doe",
      "ORG:WSO2 LLC;Platform",
      "TITLE:Software Engineer",
      "EMAIL;TYPE=INTERNET,WORK:jane.doe@wso2.com",
      "TEL;TYPE=WORK,VOICE:+94112345678",
      "TEL;TYPE=CELL,VOICE:+94771234567",
      "URL:https://wso2.com",
      "ADR;TYPE=WORK:;;20 Palm Grove\\, Colombo 03\\, Sri Lanka;;;;",
      "END:VCARD",
    ];
    expect(vcard).toBe(expectedLines.join("\r\n") + "\r\n");
  });

  it("starts with BEGIN:VCARD followed by VERSION:3.0", () => {
    const lines = buildVCard(minimalData).split("\r\n");
    expect(lines[0]).toBe("BEGIN:VCARD");
    expect(lines[1]).toBe("VERSION:3.0");
  });

  it("ends with END:VCARD and a trailing CRLF", () => {
    const vcard = buildVCard(minimalData);
    expect(vcard.endsWith("END:VCARD\r\n")).toBe(true);
  });

  it("joins lines with CRLF, never a bare LF", () => {
    const vcard = buildVCard(fullData);
    expect(vcard.includes("\r\n")).toBe(true);
    expect(vcard.replace(/\r\n/g, "").includes("\n")).toBe(false);
  });
});

describe("buildVCard — N and FN", () => {
  it("emits N:Last;First;;; and FN:First Last", () => {
    const vcard = buildVCard(minimalData);
    expect(vcard).toContain("N:Doe;Jane;;;\r\n");
    expect(vcard).toContain("FN:Jane Doe\r\n");
  });

  it("FN has no stray space when lastName is empty", () => {
    const vcard = buildVCard({ ...minimalData, lastName: "" });
    expect(vcard).toContain("FN:Jane\r\n");
    expect(vcard).not.toContain("FN:Jane \r\n");
  });

  it("FN has no stray space when firstName is empty", () => {
    const vcard = buildVCard({ ...minimalData, firstName: "" });
    expect(vcard).toContain("FN:Doe\r\n");
    expect(vcard).not.toContain("FN: Doe\r\n");
  });
});

describe("buildVCard — ORG", () => {
  it("emits ORG:Organization;Department when department is present", () => {
    const vcard = buildVCard({ ...minimalData, department: "Platform" });
    expect(vcard).toContain("ORG:WSO2 LLC;Platform\r\n");
  });

  it("emits ORG:Organization only when department is absent", () => {
    const vcard = buildVCard(minimalData);
    expect(vcard).toContain("ORG:WSO2 LLC\r\n");
  });

  it("emits ORG:Organization only when department is whitespace-only", () => {
    const vcard = buildVCard({ ...minimalData, department: "   " });
    expect(vcard).toContain("ORG:WSO2 LLC\r\n");
  });
});

describe("buildVCard — TITLE", () => {
  it("emits TITLE when jobTitle is a non-empty string", () => {
    const vcard = buildVCard({ ...minimalData, jobTitle: "Software Engineer" });
    expect(vcard).toContain("TITLE:Software Engineer\r\n");
  });

  it("omits TITLE when jobTitle is undefined", () => {
    const vcard = buildVCard(minimalData);
    expect(vcard).not.toContain("TITLE:");
  });

  it("omits TITLE when jobTitle is whitespace-only", () => {
    const vcard = buildVCard({ ...minimalData, jobTitle: "   " });
    expect(vcard).not.toContain("TITLE:");
  });
});

describe("buildVCard — EMAIL and URL", () => {
  it("emits EMAIL;TYPE=INTERNET,WORK: for workEmail", () => {
    const vcard = buildVCard(minimalData);
    expect(vcard).toContain("EMAIL;TYPE=INTERNET,WORK:jane.doe@wso2.com\r\n");
  });

  it("emits URL: for website", () => {
    const vcard = buildVCard(minimalData);
    expect(vcard).toContain("URL:https://wso2.com\r\n");
  });
});

describe("buildVCard — TEL", () => {
  it("emits TEL;TYPE=WORK,VOICE: when workPhone is present", () => {
    const vcard = buildVCard({ ...minimalData, workPhone: "+94112345678" });
    expect(vcard).toContain("TEL;TYPE=WORK,VOICE:+94112345678\r\n");
  });

  it("omits the WORK TEL line when workPhone is absent", () => {
    const vcard = buildVCard(minimalData);
    expect(vcard).not.toContain("TYPE=WORK,VOICE");
  });

  it("omits the WORK TEL line when workPhone is whitespace-only", () => {
    const vcard = buildVCard({ ...minimalData, workPhone: "   " });
    expect(vcard).not.toContain("TYPE=WORK,VOICE");
  });

  it("emits TEL;TYPE=CELL,VOICE: when mobile is present (opted in)", () => {
    const vcard = buildVCard({ ...minimalData, mobile: "+94771234567" });
    expect(vcard).toContain("TEL;TYPE=CELL,VOICE:+94771234567\r\n");
  });

  it("never emits a CELL TEL line when mobile is undefined (privacy opt-in guarantee)", () => {
    const vcard = buildVCard(minimalData);
    expect(vcard).not.toContain("TYPE=CELL,VOICE");
  });

  it("never emits a CELL TEL line when mobile is an empty string", () => {
    const vcard = buildVCard({ ...minimalData, mobile: "" });
    expect(vcard).not.toContain("TYPE=CELL,VOICE");
  });

  it("never emits a CELL TEL line when mobile is whitespace-only", () => {
    const vcard = buildVCard({ ...minimalData, mobile: "   " });
    expect(vcard).not.toContain("TYPE=CELL,VOICE");
  });
});

describe("buildVCard — ADR", () => {
  it("emits ADR;TYPE=WORK:;;<address>;;;; when address is present", () => {
    const vcard = buildVCard({ ...minimalData, address: "20 Palm Grove" });
    expect(vcard).toContain("ADR;TYPE=WORK:;;20 Palm Grove;;;;\r\n");
  });

  it("omits ADR when address is absent", () => {
    const vcard = buildVCard(minimalData);
    expect(vcard).not.toContain("ADR;TYPE=WORK");
  });

  it("omits ADR when address is whitespace-only", () => {
    const vcard = buildVCard({ ...minimalData, address: "   " });
    expect(vcard).not.toContain("ADR;TYPE=WORK");
  });
});

describe("buildVCard — PHOTO must never appear", () => {
  it("never emits a PHOTO line, even when photoUri is a data URI", () => {
    const vcard = buildVCard({
      ...minimalData,
      photoUri: "data:image/png;base64,iVBORw0KGgoAAAANSU",
    });
    expect(vcard).not.toContain("PHOTO");
    expect(vcard).not.toContain("data:image");
    expect(vcard).not.toContain("base64");
  });

  it("never emits a PHOTO line when photoUri is absent", () => {
    const vcard = buildVCard(minimalData);
    expect(vcard).not.toContain("PHOTO");
  });
});

describe("buildVCard — escaping (RFC 2426)", () => {
  it("escapes commas in ORG, e.g. WSO2, LLC", () => {
    const vcard = buildVCard({ ...minimalData, organization: "WSO2, LLC" });
    expect(vcard).toContain("ORG:WSO2\\, LLC\r\n");
  });

  it("escapes semicolons in a text value", () => {
    const vcard = buildVCard({ ...minimalData, department: "R&D; Platform" });
    expect(vcard).toContain("ORG:WSO2 LLC;R&D\\; Platform\r\n");
  });

  it("escapes backslashes in a text value", () => {
    const vcard = buildVCard({ ...minimalData, department: "Team\\Alpha" });
    expect(vcard).toContain("ORG:WSO2 LLC;Team\\\\Alpha\r\n");
  });

  it("escapes newlines in a multi-line address as literal \\n", () => {
    const vcard = buildVCard({
      ...minimalData,
      address: "20 Palm Grove\nColombo 03\nSri Lanka",
    });
    expect(vcard).toContain(
      "ADR;TYPE=WORK:;;20 Palm Grove\\nColombo 03\\nSri Lanka;;;;\r\n"
    );
  });

  it("escapes commas and semicolons together in the address", () => {
    const vcard = buildVCard({
      ...minimalData,
      address: "20 Palm Grove, Colombo 03; Sri Lanka",
    });
    expect(vcard).toContain(
      "ADR;TYPE=WORK:;;20 Palm Grove\\, Colombo 03\\; Sri Lanka;;;;\r\n"
    );
  });
});

describe("buildVCard — UTF-8 safety", () => {
  it("passes non-ASCII Sinhala names through unmodified", () => {
    const vcard = buildVCard({
      ...minimalData,
      firstName: "සමන්",
      lastName: "පෙරේරා",
    });
    expect(vcard).toContain("N:පෙරේරා;සමන්;;;\r\n");
    expect(vcard).toContain("FN:සමන් පෙරේරා\r\n");
  });

  it("passes accented Latin names through unmodified", () => {
    const vcard = buildVCard({ ...minimalData, firstName: "Zoë", lastName: "Müller" });
    expect(vcard).toContain("N:Müller;Zoë;;;\r\n");
    expect(vcard).toContain("FN:Zoë Müller\r\n");
  });
});

describe("vCardFileName", () => {
  it("builds a First_Last.vcf filename", () => {
    expect(vCardFileName(minimalData)).toBe("Jane_Doe.vcf");
  });

  it("keeps non-ASCII letters as-is", () => {
    expect(vCardFileName({ ...minimalData, firstName: "Zoë", lastName: "Müller" })).toBe(
      "Zoë_Müller.vcf"
    );
  });

  it("replaces filesystem-unsafe characters with underscores", () => {
    const name = vCardFileName({ ...minimalData, firstName: "John/Doe", lastName: "A:B" });
    expect(name).not.toMatch(/[/\\:*?"<>|]/);
    expect(name.endsWith(".vcf")).toBe(true);
  });

  it("collapses repeated underscores", () => {
    const name = vCardFileName({ ...minimalData, firstName: "John   /  Doe", lastName: "" });
    expect(name).not.toMatch(/_{2,}/);
  });

  it("cannot be used for path traversal", () => {
    const name = vCardFileName({ ...minimalData, firstName: "../../etc", lastName: "passwd" });
    expect(name).not.toContain("/");
    expect(name).not.toContain("\\");
  });

  it("falls back to contact.vcf when the name yields nothing usable", () => {
    expect(vCardFileName({ ...minimalData, firstName: "   ", lastName: "" })).toBe("contact.vcf");
  });

  it("falls back to contact.vcf when the name is only unsafe characters", () => {
    expect(vCardFileName({ ...minimalData, firstName: "///", lastName: ":::" })).toBe(
      "contact.vcf"
    );
  });
});
