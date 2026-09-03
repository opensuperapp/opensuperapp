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

// Every number here comes from a vendor guideline or from the vendor's own
// control, not from this layout. Both vendors forbid recolouring, relabelling
// and free-scaling their wallet affordance, so treat these as fixed and change
// them only against the guideline or the measurement they cite.

// Apple: the Add to Apple Wallet badge guidelines,
// https://developer.apple.com/wallet/add-to-apple-wallet-guidelines/. That page
// is about the *badge*, which Apple restricts to "web pages and emails, or
// printed materials"; for apps it says "use the PKAddPassButton class to create
// an Add to Apple Wallet button", so the app draws no Apple artwork of its own
// and there is no clear-space rule to honour — the control draws its own
// padding. What is left are PKAddPassButton's own sizing constraints, which
// Apple documents nowhere. These were measured by instantiating the control on
// an iOS 18.5 simulator (en-LK) and reading its layout back. Treat them as
// observations of one OS version, not a contract.
export const APPLE_ADD_PASS_BUTTON = {
  // `intrinsicContentSize`, which is the control's *two-line* layout: at 20pt
  // tall it had already scaled its 28x20pt wallet glyph down to 14x10pt, and at
  // 40pt and above it stopped growing and centred the content vertically
  // instead. So 40 is the floor below which the system shrinks its own artwork.
  intrinsicWidth: 122,
  intrinsicHeight: 40,
  // `sizeThatFits` with an unbounded width. Below this the control lays out as
  // "Add to" / "Apple Wallet" on two lines; at or above it, on one line. It is
  // not a maximum: the background fills any width it is given and the glyph and
  // label stay centred in it.
  oneLineWidth: 236,
  // What the app draws at. Clears the 40pt floor, so the content renders
  // unscaled, and clears the 44pt iOS tap target. 50 rather than 44 because the
  // control's one-line label is a fixed 20pt semibold in a 24pt box that never
  // scales with the frame (measured on the same simulator): at 44 it fills
  // 55% of the height and reads as oversized, at 50 it fills 48%. 50 is also
  // GOOGLE_WALLET_BUTTON.intrinsicHeight, so both platforms' buttons match.
  // The width is deliberately not here: the button spans the footer, because
  // the control supports it.
  height: 50,
} as const;

// Google: the Add to Google Wallet button guidelines,
// https://developers.google.com/wallet/generic/resources/brand-guidelines
export const GOOGLE_WALLET_BUTTON = {
  // Size of Google's own enGB primary button artboard, and so the viewBox of
  // components/wallet/AddToGoogleWalletButton.tsx, which reproduces that
  // artboard unmodified (see NOTICE). The artwork is vector, so
  // this is not a resolution ceiling — it is the one size at which the button's
  // 24.5 radius, 8 dp icon inset and label weight land exactly as Google drew
  // them, which is why the button is rendered 1:1.
  intrinsicWidth: 283,
  intrinsicHeight: 50,
  // "All Add to Google Wallet buttons need to have a minimum height of 48 dp."
  // 50 is the intrinsic height and clears that, so the button is drawn 1:1.
  minHeight: 48,
  // "Always maintain the minimum clear space of 8 dp on all sides."
  clearSpace: 8,
} as const;

export const GOOGLE_WALLET_BUTTON_ASPECT_RATIO =
  GOOGLE_WALLET_BUTTON.intrinsicWidth / GOOGLE_WALLET_BUTTON.intrinsicHeight;
