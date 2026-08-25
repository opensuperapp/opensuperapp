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
import { CARD_ORGANIZATION, CARD_WEBSITE } from "@/constants/BusinessCard";
import { UserInfo } from "@/context/slices/userInfoSlice";
import { DecodedAccessToken } from "@/types/decodeAccessToken.types";
import {
  fullResolutionPhotoUri,
  toBusinessCardData,
} from "@/utils/businessCard";

const baseUserInfo: UserInfo = {
  firstName: "Jane",
  lastName: "Doe",
  workEmail: "jane.doe@wso2.com",
  employeeThumbnail: null,
};

// A representative access-token payload, trimmed to the claims this
// module reads.
const baseClaims: DecodedAccessToken = {
  email: "jane.doe@wso2.com",
  given_name: "Jane",
  family_name: "Doe",
  userid: "00000000-0000-4000-8000-000000000000",
  jobtitle: "Software Engineer",
  phone_number: "+94771234567",
  profile:
    "https://lh3.googleusercontent.com/a-/AAcHTtexampleavatartoken=s100",
};

describe("toBusinessCardData — nothing worth putting on a card", () => {
  it("returns null with no directory data and no claims", () => {
    expect(toBusinessCardData(null, null)).toBeNull();
    expect(toBusinessCardData(undefined)).toBeNull();
  });

  it("returns null when neither source has a name or a workEmail", () => {
    const result = toBusinessCardData(
      {
        firstName: "",
        lastName: "  ",
        workEmail: "   ",
        employeeThumbnail: null,
      },
      { jobtitle: "Software Engineer" }
    );
    expect(result).toBeNull();
  });

  it("returns data when a name is present even without a workEmail", () => {
    const result = toBusinessCardData(
      {
        firstName: "Jane",
        lastName: "Doe",
        workEmail: "   ",
        employeeThumbnail: null,
      },
      null
    );
    expect(result).not.toBeNull();
  });

  it("returns data when a workEmail is present even without a name", () => {
    const result = toBusinessCardData(
      {
        firstName: " ",
        lastName: " ",
        workEmail: "jane.doe@wso2.com",
        employeeThumbnail: null,
      },
      null
    );
    expect(result).not.toBeNull();
  });
});

describe("toBusinessCardData — token claims alone", () => {
  it("builds a full card from the access token with no directory response", () => {
    const result = toBusinessCardData(null, baseClaims);

    expect(result).toMatchObject({
      firstName: "Jane",
      lastName: "Doe",
      workEmail: "jane.doe@wso2.com",
      jobTitle: "Software Engineer",
      mobile: "+94771234567",
    });
  });

  it("takes phone_number as the mobile, never the work phone", () => {
    const result = toBusinessCardData(null, baseClaims);
    expect(result?.mobile).toBe("+94771234567");
    expect(result?.workPhone).toBeUndefined();
  });

  it("leaves absent claims undefined rather than rendering empty rows", () => {
    const result = toBusinessCardData(null, {
      email: "nobody@wso2.com",
      given_name: "No",
      family_name: "Body",
    });
    expect(result?.jobTitle).toBeUndefined();
    expect(result?.mobile).toBeUndefined();
    expect(result?.photoUri).toBeUndefined();
  });
});

describe("toBusinessCardData — precedence", () => {
  it("prefers the directory name and email over the token's", () => {
    const result = toBusinessCardData(baseUserInfo, baseClaims);
    expect(result?.firstName).toBe("Jane");
    expect(result?.lastName).toBe("Doe");
    expect(result?.workEmail).toBe("jane.doe@wso2.com");
  });

  it("falls back to the claim when the directory field is blank", () => {
    const result = toBusinessCardData(
      { ...baseUserInfo, firstName: "   " },
      baseClaims
    );
    expect(result?.firstName).toBe("Jane");
  });

  it("prefers a directory job title and mobile over the token's", () => {
    const result = toBusinessCardData(
      { ...baseUserInfo, jobTitle: "Staff Engineer", mobile: "+94111111111" },
      baseClaims
    );
    expect(result?.jobTitle).toBe("Staff Engineer");
    expect(result?.mobile).toBe("+94111111111");
  });

  it("prefers the directory thumbnail over the token's profile photo", () => {
    const result = toBusinessCardData(
      { ...baseUserInfo, employeeThumbnail: "https://hr.example/jane.jpg" },
      baseClaims
    );
    expect(result?.photoUri).toBe("https://hr.example/jane.jpg");
  });
});

describe("toBusinessCardData — constants", () => {
  it("fills organization and website from constants/BusinessCard", () => {
    const result = toBusinessCardData(baseUserInfo, null);
    expect(result?.organization).toBe(CARD_ORGANIZATION);
    expect(result?.website).toBe(CARD_WEBSITE);
  });

  // The wallet service never defaults an office address, so neither does this.
  // A card that showed one would be showing a row the installed pass has not
  // got — and it would ride into the QR payload as an ADR line too.
  it("leaves the address unset, matching the pass", () => {
    const result = toBusinessCardData(baseUserInfo, baseClaims);
    expect(result?.address).toBeUndefined();
  });
});

describe("toBusinessCardData — trimming", () => {
  it("trims whitespace on string fields from either source", () => {
    const result = toBusinessCardData(
      {
        firstName: "  Jane  ",
        lastName: "  Doe  ",
        workEmail: "  jane.doe@wso2.com  ",
        employeeThumbnail: null,
      },
      { jobtitle: "  Software Engineer  " }
    );
    expect(result?.firstName).toBe("Jane");
    expect(result?.lastName).toBe("Doe");
    expect(result?.workEmail).toBe("jane.doe@wso2.com");
    expect(result?.jobTitle).toBe("Software Engineer");
  });
});

describe("fullResolutionPhotoUri", () => {
  // The same regex the wallet pass service uses on the pass side
  // (googleSizeHint), so the app and the pass ask the directory for the same
  // image.
  it("strips a Google =s<size> suffix", () => {
    expect(
      fullResolutionPhotoUri("https://lh3.googleusercontent.com/a-/abc=s100")
    ).toBe("https://lh3.googleusercontent.com/a-/abc");
  });

  it("strips a =s<size>-c centre-cropped suffix", () => {
    expect(
      fullResolutionPhotoUri("https://lh3.googleusercontent.com/a-/abc=s64-c")
    ).toBe("https://lh3.googleusercontent.com/a-/abc");
  });

  it("leaves a URL with no size suffix alone", () => {
    expect(fullResolutionPhotoUri("https://hr.example/jane.jpg")).toBe(
      "https://hr.example/jane.jpg"
    );
  });

  it("maps blank and nullish input to undefined", () => {
    expect(fullResolutionPhotoUri(null)).toBeUndefined();
    expect(fullResolutionPhotoUri(undefined)).toBeUndefined();
    expect(fullResolutionPhotoUri("   ")).toBeUndefined();
  });
});
