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
import { BusinessCardData } from "@/types/businessCard.types";
import { DecodedAccessToken } from "@/types/decodeAccessToken.types";

// Optional because /user-info only returns the four `UserInfo` fields; the
// richer HR shape reaches the wallet service by its own route.
type DirectoryUserInfo = UserInfo &
  Partial<{
    jobTitle: string;
    department: string;
    workPhone: string;
    mobile: string;
  }>;

const hasText = (value: string | undefined | null): value is string =>
  value !== undefined && value !== null && value.trim().length > 0;

const trimmedOrUndefined = (
  value: string | undefined | null
): string | undefined => (hasText(value) ? value.trim() : undefined);

// The precedence rule the module runs on: the directory answer wins where
// there is one, the token claim fills the gap.
const firstPresent = (
  ...values: (string | undefined | null)[]
): string | undefined => {
  for (const value of values) {
    const trimmed = trimmedOrUndefined(value);
    if (trimmed !== undefined) {
      return trimmed;
    }
  }
  return undefined;
};

// Dropping the size suffix Google avatar URLs carry yields the full-resolution
// image, which the pass needs for its 90pt thumbnail.
const GOOGLE_PHOTO_SIZE_SUFFIX = /=s\d+(-c)?$/;

export const fullResolutionPhotoUri = (
  url: string | undefined | null
): string | undefined => {
  const trimmed = trimmedOrUndefined(url);
  return trimmed?.replace(GOOGLE_PHOTO_SIZE_SUFFIX, "");
};

// Either source alone is enough: the claims are what make the card work on a
// cold start before /user-info answers, and the only source of `jobtitle` and
// `phone_number` today.
//
// `mobile` is deliberately not gated behind an opt-in. The wallet service puts
// the number on the pass unconditionally, so hiding it here would make the
// preview a lie about what is being installed. If that gate lands in the
// service, add it in both places at once.
export const toBusinessCardData = (
  userInfo: DirectoryUserInfo | null | undefined,
  claims?: DecodedAccessToken | null
): BusinessCardData | null => {
  const firstName = firstPresent(userInfo?.firstName, claims?.given_name) ?? "";
  const lastName = firstPresent(userInfo?.lastName, claims?.family_name) ?? "";
  const workEmail = firstPresent(userInfo?.workEmail, claims?.email) ?? "";

  // The screen renders its own empty state rather than a blank card.
  if (!firstName && !lastName && !workEmail) {
    return null;
  }

  return {
    firstName,
    lastName,
    jobTitle: firstPresent(userInfo?.jobTitle, claims?.jobtitle),
    department: trimmedOrUndefined(userInfo?.department),
    workEmail,
    // backend/utils.bal hardcodes workPhone to nil, so `mobile` is the number
    // that actually renders today.
    workPhone: trimmedOrUndefined(userInfo?.workPhone),
    mobile: firstPresent(userInfo?.mobile, claims?.phone_number),
    organization: CARD_ORGANIZATION,
    website: CARD_WEBSITE,
    // No address: nothing on the client supplies one and the pass has no
    // OFFICE row, though the vCard builder still writes ADR when given one.
    photoUri: fullResolutionPhotoUri(
      firstPresent(userInfo?.employeeThumbnail, claims?.profile)
    ),
  };
};
