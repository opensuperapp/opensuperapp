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
import { APPLE_PASS_TYPE_ID } from "@/constants/Constants";
import { loadWalletManager } from "@/services/wallet/walletManager";

/**
 * Whether the employee's card is already installed in Apple Wallet.
 *
 * PassKit answers this directly, so the app never has to remember anything: a
 * card the employee deleted from Wallet reports as absent on the next check,
 * and one added on another device that shares the same iCloud account reports
 * as present. That is why `markPassAdded` below is a no-op on iOS — a
 * remembered flag could only ever disagree with the wallet itself.
 *
 * Answers false rather than throwing whenever it cannot know: no pass type
 * identifier configured, no serial number, or a dev client built without the
 * native module. Claiming a card is installed when it is not would hide the
 * only button that can install it.
 *
 * @param {string} serialNumber - The pass serial number, the JWT `userid`.
 * @returns {Promise<boolean>} True when Wallet holds the card.
 */
export const isPassInWallet = async (
  serialNumber: string,
): Promise<boolean> => {
  if (!APPLE_PASS_TYPE_ID || !serialNumber) {
    return false;
  }

  const walletManager = loadWalletManager();
  if (!walletManager) {
    return false;
  }

  try {
    return await walletManager.hasPass(APPLE_PASS_TYPE_ID, serialNumber);
  } catch (error) {
    console.warn("Could not check Apple Wallet for the business card.", error);
    return false;
  }
};

/**
 * Records nothing. `isPassInWallet` asks PassKit, and a remembered flag could
 * only ever go stale against it. It exists so both platforms present the same
 * contract to the hook that drives the card footer.
 *
 * @param {string} serialNumber - The pass serial number, the JWT `userid`.
 * @returns {Promise<void>} Resolves immediately.
 */
export const markPassAdded = async (serialNumber: string): Promise<void> => {
  if (!serialNumber) {
    return;
  }
};

/**
 * Opens the employee's card in Apple Wallet.
 *
 * @param {string} serialNumber - The pass serial number, the JWT `userid`.
 * @returns {Promise<boolean>} True when Wallet was opened on the card.
 */
export const openPassInWallet = async (
  serialNumber: string,
): Promise<boolean> => {
  const walletManager = loadWalletManager();
  if (!walletManager || !APPLE_PASS_TYPE_ID || !serialNumber) {
    return false;
  }

  try {
    return await walletManager.viewInWallet(APPLE_PASS_TYPE_ID, serialNumber);
  } catch (error) {
    console.error("Could not open the business card in Apple Wallet.", error);
    return false;
  }
};
