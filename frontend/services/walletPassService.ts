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
import { BASE_URL, isIos } from "@/constants/Constants";
import { presentApplePass } from "@/services/wallet/applePassPresenter";
import { apiRequest, getAccessToken } from "@/utils/requestHandler";
import { File, Paths } from "expo-file-system";
import { Alert, Linking } from "react-native";

// The wallet service is not called directly: the backend proxies both endpoints,
// so it can build the card from the caller's own JWT claims and keep the wallet
// service's credentials off the device.
const PKPASS_URL = `${BASE_URL}/business-card/pkpass`;
const GOOGLE_SAVE_URL_ENDPOINT = `${BASE_URL}/business-card/google-save-url`;

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

// Both pass endpoints call the wallet service with the caller's own token, so
// they are the only backend calls that need `x-user-assertion`: a gateway in
// front of the backend overwrites `x-jwt-assertion` with a JWT it mints itself
// and passes this header through untouched. It is set here rather than in the
// shared request handler so the raw token is not copied onto every /micro-apps,
// /user-info and notification poll as well — the chat agent sets it the same
// way, per call.
const userAssertionHeader = async (): Promise<Record<string, string>> => ({
  "x-user-assertion": await getAccessToken(),
});

export const addToAppleWallet = async (enabled: boolean): Promise<boolean> => {
  if (!enabled) {
    return false;
  }

  try {
    const response = await apiRequest({
      url: PKPASS_URL,
      method: "GET",
      responseType: "arraybuffer",
      headers: await userAssertionHeader(),
    });

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
    const file = new File(Paths.cache, "choreo-labs-business-card.pkpass");
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

export const addToGoogleWallet = async (enabled: boolean): Promise<boolean> => {
  if (!enabled) {
    return false;
  }

  try {
    const response = await apiRequest({
      url: GOOGLE_SAVE_URL_ENDPOINT,
      method: "GET",
      headers: await userAssertionHeader(),
    });

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
  enabled: boolean
): Promise<boolean> =>
  isIos ? addToAppleWallet(enabled) : addToGoogleWallet(enabled);
