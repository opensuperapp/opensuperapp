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
import { BusinessCardData } from "@/types/businessCard.types";
import { buildVCard, vCardFileName } from "@/utils/vcard";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Alert } from "react-native";

const shareFile = async (
  uri: string,
  options: { mimeType: string; UTI: string; dialogTitle: string },
  unavailableMessage: string,
  failureMessage: string
): Promise<boolean> => {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert("Sharing unavailable", unavailableMessage);
      return false;
    }

    await Sharing.shareAsync(uri, options);
    return true;
  } catch (error) {
    console.error(failureMessage, error);
    Alert.alert("Share failed", failureMessage);
    return false;
  }
};

export const shareVCard = async (data: BusinessCardData): Promise<boolean> => {
  try {
    const file = new File(Paths.cache, vCardFileName(data));
    file.create({ overwrite: true });
    file.write(buildVCard(data));

    return await shareFile(
      file.uri,
      { mimeType: "text/vcard", UTI: "public.vcard", dialogTitle: "Share contact" },
      "Sharing is not available on this device.",
      "Could not share the contact card."
    );
  } catch (error) {
    console.error("Could not share the contact card.", error);
    Alert.alert("Share failed", "Could not share the contact card.");
    return false;
  }
};

export const shareCardImage = async (fileUri: string): Promise<boolean> =>
  shareFile(
    fileUri,
    { mimeType: "image/png", UTI: "public.png", dialogTitle: "Share business card" },
    "Sharing is not available on this device.",
    "Could not share the business card image."
  );
