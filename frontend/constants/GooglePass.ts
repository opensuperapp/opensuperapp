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

// Geometry for the Android preview of the Google Wallet pass. Google's brand
// guidelines fix the content rules quoted below but publish no card geometry,
// so the sizes here follow Material 3 and are marked as this app's choice
// rather than a Google requirement.
// https://developers.google.com/wallet/generic/resources/brand-guidelines
export const GOOGLE_PASS = {
  // Google's own choice, not ours: Wallet masks the logo into a circle, and the
  // artwork "needs to have a 15% margin so that it isn't cut off when masked".
  logoSize: 32,
  logoInsetFraction: 0.15,

  // Material 3 "extra large" shape, matching how Wallet draws a pass card.
  // Unlike an Apple pass, a Google pass has no fixed aspect ratio: it is as
  // tall as its content.
  cornerRadius: 28,
  contentPadding: 16,
  rowGap: 16,

  // "limit data to two fields per row, and up to 3 rows if possible."
  fieldsPerRow: 2,
  maxRows: 3,

  // Barcode block. Wallet centres the barcode on a white plate below the data
  // fields and prints `barcode.alternateText` under it.
  barcodeSize: 160,
  barcodePadding: 12,
  barcodeCornerRadius: 12,
} as const;

// Recommended character limits, quoted from GPASS.md. Exceeding them is what
// makes Wallet truncate on small screens or at large font scales.
export const GOOGLE_PASS_LIMITS = {
  title: 47,
  subtitle: 88,
  fieldLabel: 20,
  fieldValue: 15,
} as const;
