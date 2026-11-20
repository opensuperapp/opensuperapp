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
import BusinessCardActions from "@/components/businessCard/BusinessCardActions";
import BusinessCardEmptyState from "@/components/businessCard/BusinessCardEmptyState";
import BusinessCardHeader from "@/components/businessCard/BusinessCardHeader";
import BusinessCardPreview from "@/components/businessCard/BusinessCardPreview";
import BusinessCardQrModal from "@/components/businessCard/BusinessCardQrModal";
import WalletDisclaimerSheet from "@/components/businessCard/WalletDisclaimerSheet";
import { isIos } from "@/constants/Constants";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import { useBusinessCardActions } from "@/hooks/useBusinessCardActions";
import React from "react";
import { Modal, StyleSheet, View } from "react-native";

type Props = {
  visible: boolean;
  onClose: () => void;
};

const BusinessCardSheet = ({ visible, onClose }: Props) => {
  const { colors } = useBrandTheme();
  const {
    data,
    passRef,
    qrVisible,
    disclaimerVisible,
    saving,
    walletDownloadEnabled,
    passInWallet,
    openQr,
    closeQr,
    showDisclaimer,
    hideDisclaimer,
    shareContactFile,
    saveAsImage,
    savePass,
    openWallet,
  } = useBusinessCardActions(visible);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={isIos ? "pageSheet" : "fullScreen"}
      onRequestClose={onClose}
    >
      <View style={[styles.sheet, { backgroundColor: colors.sheet }]}>
        <BusinessCardHeader onClose={onClose} />

        {!data ? (
          <BusinessCardEmptyState />
        ) : (
          <>
            <BusinessCardPreview
              data={data}
              passRef={passRef}
              onBarcodePress={openQr}
            />
            <BusinessCardActions
              saving={saving}
              walletDownloadEnabled={walletDownloadEnabled}
              passInWallet={passInWallet}
              onSavePass={savePass}
              onOpenWallet={openWallet}
              onShareVCard={shareContactFile}
              onSaveAsImage={saveAsImage}
              onShowDisclaimer={showDisclaimer}
            />
            <BusinessCardQrModal
              visible={qrVisible}
              data={data}
              onClose={closeQr}
            />
            <WalletDisclaimerSheet
              visible={disclaimerVisible}
              onClose={hideDisclaimer}
            />
          </>
        )}
      </View>
    </Modal>
  );
};

export default BusinessCardSheet;

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
  },
});
