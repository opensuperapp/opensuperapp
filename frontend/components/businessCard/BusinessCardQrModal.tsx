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
import { isIos } from "@/constants/Constants";
import { BusinessCardData } from "@/types/businessCard.types";
import { buildVCard } from "@/utils/vcard";
import * as Brightness from "expo-brightness";
import React, { useEffect, useRef } from "react";
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
  // What the screen was at before we took it over, kept in a ref so the effect
  // cleanup can read a value captured by the effect body.
  const previousBrightness = useRef<number | null>(null);
  // Raising and restoring are both async, and the cleanup can fire while the
  // raise is still in flight. Chaining every call keeps them in order, so a
  // close can never be overtaken by the setBrightnessAsync(1) it cancels.
  const brightnessQueue = useRef<Promise<void>>(Promise.resolve());

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
        // Read before writing: once we have set 1 the user's own level is gone,
        // and iOS gives us nothing to restore it from.
        previousBrightness.current = await Brightness.getBrightnessAsync();
        await Brightness.setBrightnessAsync(1);
      } catch (error) {
        console.error("Failed to raise screen brightness", error);
      }
    };

    const restoreBrightness = async () => {
      try {
        // restoreSystemBrightnessAsync is Android-only. On iOS the override
        // outlives the modal — it holds until the device is locked — so the
        // captured level has to be written back by hand.
        if (isIos) {
          const previous = previousBrightness.current;
          if (previous === null) {
            return;
          }

          previousBrightness.current = null;
          await Brightness.setBrightnessAsync(previous);
          return;
        }

        await Brightness.restoreSystemBrightnessAsync();
      } catch (error) {
        console.error("Failed to restore screen brightness", error);
      }
    };

    const enqueue = (task: () => Promise<void>) => {
      brightnessQueue.current = brightnessQueue.current.then(task);
    };

    enqueue(raiseBrightness);

    return () => {
      enqueue(restoreBrightness);
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
