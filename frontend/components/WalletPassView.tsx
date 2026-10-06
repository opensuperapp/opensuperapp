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
import PassField from "@/components/businessCard/PassField";
import { walletPassStyles as styles } from "@/components/businessCard/walletPassStyles";
import { PASS } from "@/constants/BusinessCard";
import { BusinessCardData } from "@/types/businessCard.types";
import { buildVCard } from "@/utils/vcard";
import React, { forwardRef } from "react";
import {
  Image,
  ImageSourcePropType,
  Pressable,
  Text,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";

// The same artwork the pass bundle ships as icon.png and logo.png.
const PASS_LOGO: ImageSourcePropType = require("@/assets/images/wso2-pulse-white.png");

type Props = {
  data: BusinessCardData;
  onBarcodePress?: () => void;
};

const WalletPassView = forwardRef<View, Props>(
  ({ data, onBarcodePress }, ref) => {
    const fullName = `${data.firstName} ${data.lastName}`.trim();
    // Same precedence as pass.go's frontPhone: work number, then mobile.
    const frontPhone = data.workPhone ?? data.mobile;

    return (
      <View ref={ref} style={styles.pass} collapsable={false}>
        <Image
          source={PASS_LOGO}
          style={styles.logo}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />

        <View style={styles.primaryRow}>
          <View style={styles.primaryColumn}>
            <Text
              style={styles.primaryValue}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              {fullName}
            </Text>
          </View>

          {data.photoUri && (
            <Image
              source={{ uri: data.photoUri }}
              style={styles.thumbnail}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
          )}
        </View>

        {data.jobTitle && (
          <View style={styles.secondaryRow}>
            <PassField label="Title" value={data.jobTitle} size="secondary" />
          </View>
        )}

        <View style={styles.auxiliaryRow}>
          <PassField
            label="Email"
            value={data.workEmail}
            size="auxiliary"
            style={styles.auxiliaryColumn}
          />
          {frontPhone && (
            <PassField
              label="Phone"
              value={frontPhone}
              size="auxiliary"
              style={styles.auxiliaryColumn}
            />
          )}
        </View>

        <View style={styles.spacer} />

        <Pressable
          onPress={onBarcodePress}
          disabled={!onBarcodePress}
          style={styles.barcode}
          accessibilityRole="button"
          accessibilityLabel="pass_barcode"
        >
          <QRCode
            value={buildVCard(data)}
            size={PASS.barcodeSize}
            backgroundColor="#FFFFFF"
            color="#000000"
            ecl="M"
          />
        </Pressable>
      </View>
    );
  },
);

WalletPassView.displayName = "WalletPassView";

export default WalletPassView;
