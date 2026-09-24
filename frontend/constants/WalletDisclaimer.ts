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
 * WSO2 and lives on the device; the only thing Apple handles is a contentless
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
 * emphasis and the mailto: link below are load-bearing rather than decorative.
 */

/** Data Protection Officer, per §8.0 of the People Operations policy. */
export const DPO_EMAIL = "dpo@wso2.com";

/** Sheet titles, which are the `#` heading of each document. */
export const APPLE_WALLET_DISCLAIMER_TITLE = "Apple Wallet Disclaimer";
export const GOOGLE_WALLET_DISCLAIMER_TITLE = "Google Wallet Disclaimer";

/**
 * The part both platforms share: what leaves your profile and goes onto the
 * pass. Written as the fields an employee recognises from their own profile,
 * not as the JSON keys the service uses.
 */
const WHAT_IS_USED = `## What goes on the card

Your **name**, **job title**, **department**, **work email**, **office phone**, **office address** and your **directory photo**. Your personal mobile number is included **only if you turned that on** in your profile.

The card also carries a QR code holding the same details as a contact file, so anyone you show it to can scan and keep them.`;

/**
 * The part both platforms share, bar the vendor's name: rights, where to ask,
 * and what the add button means. Deliberately short — §10.1 of the policy lists
 * five rights and reciting all of them here would bury the sentence that
 * matters, which is that this is governed and reversible.
 *
 * @param wallet - The vendor wallet's name, as it appears on its add button.
 * @returns The closing section of the disclaimer.
 */
const yourRights = (wallet: string) => `## Your data

These are employee details, and WSO2 processes them as explained here. You can ask to see, correct or erase them at any time, and you can delete the card from your wallet whenever you like.

Any questions related to the data processing can be directed to [${DPO_EMAIL}](mailto:${DPO_EMAIL}).

By clicking “Continue with the ${wallet}” to access or use the ${wallet}, you acknowledge and agree to these Terms. If you do not agree to these Terms, please do not click “Continue with the ${wallet}” or proceed with accessing or using the ${wallet}.`;

/** Disclaimer copy for Apple Wallet. */
export const APPLE_WALLET_DISCLAIMER_MD = `${WHAT_IS_USED}

## How it works

WSO2 builds and signs the card, then hands it to **Apple Wallet on this device**. It is stored on your phone, not with Apple.

To keep it current, Wallet registers the card with WSO2 and Apple's push service tells your device when something has changed. That message carries no content, so **Apple never receives your card details**.

${yourRights("Apple Wallet")}`;

/** Disclaimer copy for Google Wallet. */
export const GOOGLE_WALLET_DISCLAIMER_MD = `${WHAT_IS_USED}

## How it works

WSO2 builds the card and saves it to **Google Wallet**. Unlike a card held only on your phone, Google stores and renders this one on **Google's servers** — so saving it **shares the details above with Google**, and Google fetches your directory photo from WSO2. Google's own privacy policy covers what it does with them from there.

${yourRights("Google Wallet")}`;
