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
 * The parts of `react-native-wallet-manager` this app uses.
 *
 * `hasPass` and `viewInWallet` are iOS-only: the Android implementation
 * rejects both with UNSUPPORTED_PLATFORM, because Google Wallet gives a
 * third-party app no way to ask what is in someone's wallet. Anything reaching
 * for them has to be in an `.ios` file.
 */
export type WalletManager = {
  canAddPasses: () => Promise<boolean>;
  showAddPassControllerFromFile: (filePath: string) => Promise<boolean>;
  hasPass: (cardIdentifier: string, serialNumber?: string) => Promise<boolean>;
  viewInWallet: (
    cardIdentifier: string,
    serialNumber?: string,
  ) => Promise<boolean>;
};

/**
 * Loads the native Wallet module, or returns null when it is not in the build.
 *
 * A guarded require rather than a top-level import: the module calls
 * TurboModuleRegistry.getEnforcing while it is evaluated, so on a dev client
 * built before this dependency landed the import itself throws.
 *
 * @returns {WalletManager | null} The native module, or null when unavailable.
 */
export const loadWalletManager = (): WalletManager | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("react-native-wallet-manager").default as WalletManager;
  } catch (error) {
    console.warn("Native Wallet module unavailable.", error);
    return null;
  }
};
