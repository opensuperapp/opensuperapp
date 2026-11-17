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
import { brand, radius } from "@/constants/brand";

// No office address: the wallet service never defaults one either, so
// hardcoding it here would show a row the installed pass does not have.
export const CARD_ORGANIZATION = "Choreo Labs LLC";
export const CARD_WEBSITE = "https://choreolabs.com";

// Brand Cobalt. Neither wallet allows a background image on this pass, so the
// in-app preview is flat Cobalt too, to show what gets installed. Must match the wallet
// service's pass.go, which still ships the old orange (#F14E23) until it is
// rebranded too.
export const PASS_BACKGROUND_COLOR = brand.cobalt;
export const PASS_FOREGROUND_COLOR = "#FFFFFF";
export const PASS_LABEL_COLOR = "#FFFFFF";

// The card fills the width it is given and is at least this tall for it. Shorter than an
// installed pass (about 2:3) by choice, so the sheet has less to scroll. A minimum, not a
// fixed height: on a 320pt-wide screen, or at large text sizes, the content needs
// more, and the card grows to fit it instead of clipping the barcode.
export const CARD_ASPECT_RATIO = 3 / 4;

// Pass geometry in points, reproduced from the wallet service rather than
// chosen: the thumbnail ring is 4% of the diameter, as internal/photo draws it.
export const PASS = {
  cornerRadius: 16,
  contentPaddingH: 14,
  contentPaddingTop: 12,
  contentPaddingBottom: 14,
  thumbnailSize: 70,
  thumbnailRingFraction: 0.04,
  rowGap: 12,
  barcodeSize: 140,
  barcodePadding: 10,
  barcodeCornerRadius: radius.qr,
} as const;
