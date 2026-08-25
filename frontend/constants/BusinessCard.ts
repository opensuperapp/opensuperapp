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

// No office address: the wallet service never defaults one either, so
// hardcoding it here would show a row the installed pass does not have.
export const CARD_ORGANIZATION = "WSO2 LLC";
export const CARD_WEBSITE = "https://wso2.com";

// Copied from the wallet service's pass.go. Not Colors.companyOrange
// (#FF7300) — the signed pass ships this orange, and the Go constant is the
// source of truth.
export const PASS_BACKGROUND_COLOR = "#F14E23";
export const PASS_FOREGROUND_COLOR = "#FFFFFF";
export const PASS_LABEL_COLOR = "#FFFFFF";

// The card fills the width it is given, so this alone sets its height.
export const CARD_ASPECT_RATIO = 2 / 3;

// Pass geometry in points, reproduced from the wallet service rather than
// chosen: the thumbnail ring is 4% of the diameter, as internal/photo draws it.
export const PASS = {
  cornerRadius: 16,
  contentPaddingH: 14,
  contentPaddingTop: 12,
  contentPaddingBottom: 14,
  logoSize: 40,
  thumbnailSize: 70,
  thumbnailRingFraction: 0.04,
  rowGap: 12,
  barcodeSize: 140,
  barcodePadding: 10,
  barcodeCornerRadius: 10,
} as const;
