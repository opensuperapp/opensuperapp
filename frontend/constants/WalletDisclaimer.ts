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
 * The wallet disclaimer, as the employee reads it.
 *
 * This is not a gate. It sits behind a link in the business card's action row,
 * so the disclosure is available on demand rather than standing between the
 * wallet button and the save. The text still speaks in the language of terms
 * being agreed to, because it is the same disclosure Legal wrote — tapping the
 * vendor's add button is the acceptance it refers to.
 *
 * The two platforms get two texts because they are two different disclosures,
 * not one disclosure with the vendor's name swapped. An Apple pass is signed by
 * Choreo Labs and lives on the device; the only thing Apple handles is a contentless
 * push telling the device to re-fetch. A Google pass is the opposite: the card
 * fields are sent to Google, which stores and renders the object on its own
 * servers and pulls the employee photo from us. Saying "your details are shared
 * with Google" on the Apple sheet would be false, and omitting it on the Google
 * sheet would be the omission that matters most.
 *
 * Field lists are kept in step with the pass field set in
 * wallet-pass-service/internal/card/card.go. If a field is added there it has to
 * be named here too, otherwise this screen is quietly describing a card that no
 * longer exists.
 *
 * The copy is markdown and is rendered by react-native-markdown-display, so the
 * emphasis and the links below are load-bearing rather than decorative.
 */

/**
 * Choreo Labs' public, external-facing privacy policy — the document the disclosure
 * points at for what governs this processing. Public and the same everywhere,
 * so it is a constant rather than configuration: the deployment-specific
 * internal People Operations URL is what this file deliberately does not carry.
 */
export const PRIVACY_POLICY_URL = "https://choreolabs.com/privacy-policy";

/**
 * Google's privacy policy, named by the Google disclosure as covering what
 * Google does with the card once it holds one. Naming a document without
 * linking it is the one thing a disclosure screen cannot afford.
 */
export const GOOGLE_PRIVACY_POLICY_URL = "https://policies.google.com/privacy";

/** Data Protection Officer, per §8.0 of the People Operations policy. */
export const DPO_EMAIL = "dpo@choreolabs.com";

/** Sheet titles, which are the `#` heading of each document. */
export const APPLE_WALLET_DISCLAIMER_TITLE = "Apple Wallet Disclaimer";
export const GOOGLE_WALLET_DISCLAIMER_TITLE = "Google Wallet Disclaimer";

/**
 * The part both platforms share: what leaves your profile and goes onto the
 * pass. Written as the fields an employee recognises from their own profile,
 * not as the JSON keys the service uses.
 *
 * The personal mobile number is stated as unconditional because it is: there is
 * no opt-in anywhere in the app or the backend, and the pass carries the number
 * whenever the profile has one (see the note in utils/businessCard.ts and
 * backend/utils.bal). If a gate ever lands, this sentence changes with it.
 */
const WHAT_IS_USED = `## What goes on the card

Your **name**, **job title**, **department**, **work email**, **office phone**, **office address** and your **directory photo**. Your **personal mobile number** is included whenever your profile has one.

The card also carries a QR code holding the same details as a contact file, so anyone you show it to can scan and keep them.`;

/**
 * The part both platforms share, bar the vendor's name: rights, where to ask,
 * and what the add button means. Deliberately short — §10.1 of the policy lists
 * five rights and reciting all of them here would bury the sentence that
 * matters, which is that this is governed and reversible.
 *
 * The closing sentence names the control the employee actually taps. Apple's
 * PKAddPassButton and Google's add artwork both read "Add to <wallet>", so that
 * is the phrase the terms have to use: an acceptance clause pointing at a
 * button the app does not have is not an acceptance clause.
 *
 * @param wallet - The vendor wallet's name, as it appears on its add button.
 * @returns The closing section of the disclaimer.
 */
const yourRights = (wallet: string) => `## Your data

These are employee details, and Choreo Labs processes them under the [Choreo Labs Privacy Policy](${PRIVACY_POLICY_URL}). You can ask to see, correct or erase them at any time, and you can delete the card from your wallet whenever you like.

Any questions related to the data processing can be directed to [${DPO_EMAIL}](mailto:${DPO_EMAIL}).

By tapping **Add to ${wallet}** you acknowledge and agree to these Terms. If you do not agree to them, do not add the card.`;

/** Disclaimer copy for Apple Wallet. */
export const APPLE_WALLET_DISCLAIMER_MD = `${WHAT_IS_USED}

## How it works

Choreo Labs builds and signs the card, then hands it to **Apple Wallet on this device**. It is stored on your phone, not with Apple.

To keep it current, Wallet registers the card with Choreo Labs and Apple's push service tells your device when something has changed. That message carries no content, so **Apple never receives your card details**.

${yourRights("Apple Wallet")}`;

/** Disclaimer copy for Google Wallet. */
export const GOOGLE_WALLET_DISCLAIMER_MD = `${WHAT_IS_USED}

## How it works

Choreo Labs builds the card and saves it to **Google Wallet**. Unlike a card held only on your phone, Google stores and renders this one on **Google's servers** — so saving it **shares the details above with Google**, and Google fetches your directory photo from Choreo Labs. [Google's own privacy policy](${GOOGLE_PRIVACY_POLICY_URL}) covers what it does with them from there.

${yourRights("Google Wallet")}`;
