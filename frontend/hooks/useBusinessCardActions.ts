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
import { isIos } from "@/constants/Constants";
import { RootState } from "@/context/store";
import { useTokenClaims } from "@/hooks/useTokenClaims";
import { useWalletPassEnabled } from "@/hooks/useWalletPassEnabled";
import { logout } from "@/services/authService";
import { shareCardImage, shareVCard } from "@/services/businessCardService";
import { saveBusinessCardPass } from "@/services/walletPassService";
import { toBusinessCardData } from "@/utils/businessCard";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, View } from "react-native";
import { captureRef } from "react-native-view-shot";
import { useSelector } from "react-redux";

// TODO: swap this console.log placeholder for the real analytics client once
// one is wired into the app.
const logAnalyticsEvent = (event: string) => {
  console.log("[analytics]", event);
};

export const useBusinessCardActions = (visible: boolean) => {
  const { userInfo } = useSelector((state: RootState) => state.userInfo);
  // Job title, phone number and avatar live in the token claims, not in
  // /user-info.
  const claims = useTokenClaims();
  const passRef = useRef<View>(null);
  const [qrVisible, setQrVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const walletPassEnabled = useWalletPassEnabled();

  const data = useMemo(
    () => toBusinessCardData(userInfo, claims),
    [userInfo, claims]
  );

  useEffect(() => {
    if (visible) {
      logAnalyticsEvent("card_viewed");
    }
  }, [visible]);

  const openQr = () => {
    setQrVisible(true);
    logAnalyticsEvent("qr_displayed");
  };

  const closeQr = () => setQrVisible(false);

  const shareContactFile = async () => {
    if (!data) {
      return;
    }
    await shareVCard(data);
    logAnalyticsEvent("vcf_shared");
  };

  const saveAsImage = async () => {
    try {
      const uri = await captureRef(passRef, { format: "png", quality: 1 });
      await shareCardImage(uri);
      logAnalyticsEvent("image_exported");
    } catch (error) {
      Alert.alert(
        "Couldn't save image",
        "Something went wrong while exporting your card."
      );
      console.error("Failed to save business card as image", error);
    }
  };

  const savePass = async () => {
    // The .vcf is a real answer to "I want this contact somewhere" while the
    // pass path is still gated behind the env flag and remote config.
    if (!walletPassEnabled) {
      Alert.alert(
        "Not available yet",
        `Saving to ${isIos ? "Apple" : "Google"} Wallet is still being rolled out. You can share your contact file instead.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Share contact file", onPress: shareContactFile },
        ]
      );
      return;
    }

    setSaving(true);
    try {
      const added = await saveBusinessCardPass(walletPassEnabled, logout);
      if (added) {
        logAnalyticsEvent("wallet_pass_added");
      }
    } finally {
      setSaving(false);
    }
  };

  return {
    data,
    passRef,
    qrVisible,
    saving,
    openQr,
    closeQr,
    shareContactFile,
    saveAsImage,
    savePass,
  };
};
