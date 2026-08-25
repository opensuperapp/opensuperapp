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
  IS_WALLET_SERVICE_CONFIGURED,
  isIos,
  WALLET_SERVICE_BASE_URL,
} from "@/constants/Constants";
import { presentApplePass } from "@/services/wallet/applePassPresenter";
import { apiRequest } from "@/utils/requestHandler";
import { File, Paths } from "expo-file-system";
import { Alert, Linking } from "react-native";

const PKPASS_URL = `${WALLET_SERVICE_BASE_URL}/api/v1/business-card/pkpass`;
const GOOGLE_SAVE_URL_ENDPOINT = `${WALLET_SERVICE_BASE_URL}/api/v1/business-card/google-save-url`;

type GoogleSaveUrlResponse = {
  saveUrl: string;
};

const isSuccessStatus = (status: number | undefined): boolean =>
  status !== undefined && status >= 200 && status < 300;

// `responseType: "arraybuffer"` means the body should be an ArrayBuffer, but an
// empty one is still truthy, and a zero-byte .pkpass is a file Apple Wallet
// cannot install. Reading byteLength covers both an ArrayBuffer and a view over
// one, and is undefined for every other shape — none of which is a pass either.
const hasPassBytes = (data: unknown): boolean =>
  ((data as ArrayBuffer | undefined)?.byteLength ?? 0) > 0;

// Repeated at the call site so no caller can fire a request that axios cannot
// resolve, independent of the button-level gate in useWalletPassEnabled.
const isWalletServiceConfigured = (): boolean => {
  if (!IS_WALLET_SERVICE_CONFIGURED) {
    console.warn(
      "EXPO_PUBLIC_WALLET_SERVICE_BASE_URL is not set; skipping the wallet pass request."
    );
    return false;
  }

  return true;
};

export const addToAppleWallet = async (
  enabled: boolean,
  onLogout: () => Promise<void>
): Promise<boolean> => {
  if (!enabled || !isWalletServiceConfigured()) {
    return false;
  }

  try {
    const response = await apiRequest(
      { url: PKPASS_URL, method: "GET", responseType: "arraybuffer" },
      onLogout
    );

    if (
      !response ||
      !isSuccessStatus(response.status) ||
      !hasPassBytes(response.data)
    ) {
      Alert.alert(
        "Couldn't add to Apple Wallet",
        "Something went wrong while fetching your pass."
      );
      return false;
    }

    // Write only once the response is a confirmed 2xx carrying at least one
    // byte, so the pass handed to iOS is never empty.
    const file = new File(Paths.cache, "wso2-business-card.pkpass");
    file.create({ overwrite: true });
    file.write(new Uint8Array(response.data));

    return await presentApplePass(file.uri);
  } catch (error) {
    console.error("Could not add the pass to Apple Wallet.", error);
    Alert.alert(
      "Couldn't add to Apple Wallet",
      "Something went wrong while fetching your pass."
    );
    return false;
  }
};

export const addToGoogleWallet = async (
  enabled: boolean,
  onLogout: () => Promise<void>
): Promise<boolean> => {
  if (!enabled || !isWalletServiceConfigured()) {
    return false;
  }

  try {
    const response = await apiRequest(
      { url: GOOGLE_SAVE_URL_ENDPOINT, method: "GET" },
      onLogout
    );

    const saveUrl = (response?.data as GoogleSaveUrlResponse | undefined)
      ?.saveUrl;

    if (!isSuccessStatus(response?.status) || !saveUrl) {
      Alert.alert(
        "Couldn't add to Google Wallet",
        "Something went wrong while fetching your pass."
      );
      return false;
    }

    await Linking.openURL(saveUrl);
    return true;
  } catch (error) {
    console.error("Could not add the pass to Google Wallet.", error);
    Alert.alert(
      "Couldn't add to Google Wallet",
      "Something went wrong while opening Google Wallet."
    );
    return false;
  }
};

export const saveBusinessCardPass = async (
  enabled: boolean,
  onLogout: () => Promise<void>
): Promise<boolean> =>
  isIos
    ? addToAppleWallet(enabled, onLogout)
    : addToGoogleWallet(enabled, onLogout);
