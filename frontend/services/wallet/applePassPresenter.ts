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
import * as Sharing from "expo-sharing";
import { Alert } from "react-native";

type WalletManager = {
  canAddPasses: () => Promise<boolean>;
  showAddPassControllerFromFile: (filePath: string) => Promise<boolean>;
};

// A guarded require rather than a top-level import: the module calls
// TurboModuleRegistry.getEnforcing while it is evaluated, so on a dev client
// built before this dependency landed the import itself throws.
const loadWalletManager = (): WalletManager | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("react-native-wallet-manager").default as WalletManager;
  } catch (error) {
    console.warn(
      "Native Wallet module unavailable; falling back to the share sheet.",
      error
    );
    return null;
  }
};

// PKAddPassesViewController wants a filesystem path, not a URL: its
// URL(fileURLWithPath:) call reads a "file://" prefix as part of the path.
const toFilePath = (fileUri: string): string =>
  decodeURIComponent(fileUri.replace(/^file:\/\//, ""));

const shareApplePass = async (fileUri: string): Promise<boolean> => {
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    Alert.alert(
      "Sharing unavailable",
      "Sharing is not available on this device."
    );
    return false;
  }

  await Sharing.shareAsync(fileUri, { UTI: "com.apple.pkpass" });
  return true;
};

export const presentApplePass = async (fileUri: string): Promise<boolean> => {
  const walletManager = loadWalletManager();

  if (walletManager) {
    try {
      if (await walletManager.canAddPasses()) {
        return await walletManager.showAddPassControllerFromFile(
          toFilePath(fileUri)
        );
      }
      // The share sheet cannot add a pass either, so don't offer one.
      Alert.alert(
        "Wallet unavailable",
        "This device can't add passes to Apple Wallet."
      );
      return false;
    } catch (error) {
      console.error(
        "Native add-to-Wallet failed; falling back to the share sheet.",
        error
      );
    }
  }

  return shareApplePass(fileUri);
};
