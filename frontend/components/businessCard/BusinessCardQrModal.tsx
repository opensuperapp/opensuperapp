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
import { Colors } from "@/constants/Colors";
import { BusinessCardData } from "@/types/businessCard.types";
import { buildVCard } from "@/utils/vcard";
import * as Brightness from "expo-brightness";
import React, { useEffect } from "react";
import {
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";

type Props = {
  visible: boolean;
  data: BusinessCardData;
  onClose: () => void;
};

const BusinessCardQrModal = ({ visible, data, onClose }: Props) => {
  useEffect(() => {
    if (!visible) {
      return;
    }

    // setBrightnessAsync only overrides brightness for this activity/window, so
    // it needs no permission. Do NOT switch to setSystemBrightnessAsync — that
    // one requires WRITE_SETTINGS on Android and bounces the user out to a
    // system settings screen mid-demo.
    const raiseBrightness = async () => {
      try {
        await Brightness.setBrightnessAsync(1);
      } catch (error) {
        console.error("Failed to raise screen brightness", error);
      }
    };

    raiseBrightness();

    return () => {
      Brightness.restoreSystemBrightnessAsync().catch((error) => {
        console.error("Failed to restore screen brightness", error);
      });
    };
  }, [visible]);

  const qrSize = Dimensions.get("window").width * 0.8;
  const fullName = `${data.firstName} ${data.lastName}`.trim();

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.container}>
        <QRCode
          value={buildVCard(data)}
          size={qrSize}
          backgroundColor="#FFFFFF"
          color="#000000"
          ecl="M"
        />
        <Text style={styles.name}>{fullName}</Text>
        <TouchableOpacity
          activeOpacity={0.5}
          style={styles.close}
          onPress={onClose}
        >
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

export default BusinessCardQrModal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    marginTop: 24,
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
  },
  close: {
    marginTop: 32,
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: Colors.companyOrange,
    borderRadius: 12,
  },
  closeText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
