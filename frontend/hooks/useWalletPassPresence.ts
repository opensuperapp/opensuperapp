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
import {
  isPassInWallet,
  markPassAdded,
  openPassInWallet,
} from "@/services/wallet/passPresence";
import { useCallback, useEffect, useState } from "react";

export type WalletPassPresence = {
  /** Whether the card is already in the wallet, so the add action is done. */
  inWallet: boolean;
  /** Records a completed add and flips `inWallet` without a round trip. */
  markAdded: () => Promise<void>;
  /** Opens the wallet on the card. */
  openInWallet: () => Promise<void>;
  /** Puts the add action back, for a card the wallet no longer has. */
  addAgain: () => void;
};

/**
 * Tracks whether the employee's business card is already in their wallet.
 *
 * Checked when the card sheet opens rather than once at mount: the sheet stays
 * mounted while hidden, and the employee can delete the card from the wallet
 * while the app is backgrounded, so an answer from the last time it was shown
 * is not one to trust. What "already in the wallet" means differs per platform
 * — see `services/wallet/passPresence.ios.ts` and `.android.ts`.
 *
 * @param {boolean} visible - Whether the business card sheet is showing.
 * @param {string | undefined} serialNumber - Pass serial number, the JWT `userid`.
 * @returns {WalletPassPresence} Presence state and the actions that change it.
 */
export const useWalletPassPresence = (
  visible: boolean,
  serialNumber: string | undefined,
): WalletPassPresence => {
  const [inWallet, setInWallet] = useState(false);

  useEffect(() => {
    if (!visible || !serialNumber) {
      return;
    }

    // The sheet can close, or the employee can sign out, before the wallet
    // answers. Setting state on that stale answer would flip the footer of a
    // card that is no longer the one being shown.
    let active = true;
    isPassInWallet(serialNumber).then((present) => {
      if (active) {
        setInWallet(present);
      }
    });

    return () => {
      active = false;
    };
  }, [visible, serialNumber]);

  const markAdded = useCallback(async () => {
    if (!serialNumber) {
      return;
    }
    await markPassAdded(serialNumber);
    setInWallet(true);
  }, [serialNumber]);

  const openInWallet = useCallback(async () => {
    if (!serialNumber) {
      return;
    }
    await openPassInWallet(serialNumber);
  }, [serialNumber]);

  // Android cannot ask Google Wallet what it holds, so its answer is only what
  // this device last did. This is the way back for an employee who deleted the
  // card and is now looking at an "Open" button for something that is gone.
  const addAgain = useCallback(() => setInWallet(false), []);

  return { inWallet, markAdded, openInWallet, addAgain };
};
