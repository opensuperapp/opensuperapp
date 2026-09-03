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

/**
 * Copy for the consent step shown before a business card is written to a
 * wallet.
 *
 * The two platforms get two texts because they are two different disclosures,
 * not one disclosure with the vendor's name swapped. An Apple pass is signed by
 * WSO2 and lives on the device; the only thing Apple handles is a contentless
 * push telling the device to re-fetch. A Google pass is the opposite: the card
 * fields are sent to Google, which stores and renders the object on its own
 * servers and pulls the employee photo from us. Saying "your details are shared
 * with Google" on the Apple sheet would be false, and omitting it on the Google
 * sheet would be the omission that matters most.
 *
 * Field lists are kept in step with the pass field set in
 * wallet-pass-service/internal/card/card.go. If a field is added there it has to
 * be named here too, otherwise this screen is quietly consenting to something it
 * does not describe.
 */

/** WSO2's public, external-facing privacy policy. */
export const WSO2_PRIVACY_POLICY_URL = "https://wso2.com/privacy-policy";

/**
 * The internal People Operations Data Protection Policy — the document that
 * actually governs employee data. It is not on the public web, so the location
 * is configuration rather than a constant: an intranet URL differs per
 * deployment and a broken link on a consent screen is worse than none. Falls
 * back to the public policy so the link is never dead.
 */
export const EMPLOYEE_PRIVACY_POLICY_URL =
  process.env.EXPO_PUBLIC_EMPLOYEE_PRIVACY_POLICY_URL ||
  WSO2_PRIVACY_POLICY_URL;

/** Data Protection Officer, per §8.0 of the People Operations policy. */
export const DPO_EMAIL = "dpo@wso2.com";

/**
 * The part both platforms share: what leaves your profile and goes onto the
 * pass. Written as the fields an employee recognises from their own profile,
 * not as the JSON keys the service uses.
 */
const WHAT_IS_USED = `## What goes on the card

Your **name**, **job title**, **department**, **work email**, **office phone**, **office address** and your **directory photo**. Your personal mobile number is included **only if you turned that on** in your profile.

The card also carries a QR code holding the same details as a contact file, so anyone you show it to can scan and keep them.`;

/**
 * The part both platforms share: rights and where to ask. Deliberately short —
 * §10.1 of the policy lists five rights and reciting all of them here would bury
 * the one sentence that matters, which is that this is governed and reversible.
 */
const YOUR_RIGHTS = `## Your data

These are employee details, and WSO2 processes them under the [People Operations Data Protection Policy](${EMPLOYEE_PRIVACY_POLICY_URL}). You can ask to see, correct or erase them at any time, and you can delete the card from your wallet whenever you like.

[WSO2 Privacy Policy](${WSO2_PRIVACY_POLICY_URL}) · [${DPO_EMAIL}](mailto:${DPO_EMAIL})`;

/** Consent copy for Apple Wallet. */
export const APPLE_WALLET_DISCLAIMER_MD = `${WHAT_IS_USED}

## How it works

WSO2 builds and signs the card, then hands it to **Apple Wallet on this device**. It is stored on your phone, not with Apple.

To keep it current, Wallet registers the card with WSO2 and Apple's push service tells your device when something has changed. That message carries no content, so **Apple never receives your card details**.

${YOUR_RIGHTS}`;

/** Consent copy for Google Wallet. */
export const GOOGLE_WALLET_DISCLAIMER_MD = `${WHAT_IS_USED}

## How it works

WSO2 builds the card and saves it to **Google Wallet**. Unlike a card held only on your phone, Google stores and renders this one on **Google's servers** — so saving it **shares the details above with Google**, and Google fetches your directory photo from WSO2. Google's own privacy policy covers what it does with them from there.

${YOUR_RIGHTS}`;
