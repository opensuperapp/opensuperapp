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
import GooglePassField from "@/components/businessCard/GooglePassField";
import { googlePassStyles as styles } from "@/components/businessCard/googlePassStyles";
import { GOOGLE_PASS } from "@/constants/GooglePass";
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

// The same artwork the pass class ships as its logo.
const PASS_LOGO: ImageSourcePropType = require("@/assets/images/wso2-pulse-white.png");

type Props = {
  data: BusinessCardData;
  onBarcodePress?: () => void;
};

// The Google Wallet pass, laid out as Wallet renders a Generic pass rather than
// as a copy of the Apple card: the logo and card title share the top row, the
// subheader sits above the header, the text modules follow, and the card is as
// tall as its content instead of a fixed 2:3.
const WalletPassView = forwardRef<View, Props>(
  ({ data, onBarcodePress }, ref) => {
    const fullName = `${data.firstName} ${data.lastName}`.trim();
    const frontPhone = data.workPhone ?? data.mobile;

    return (
      <View ref={ref} style={styles.pass} collapsable={false}>
        <View style={styles.titleRow}>
          <Image
            source={PASS_LOGO}
            style={styles.logo}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
          <Text style={styles.cardTitle} numberOfLines={1}>
            {data.organization}
          </Text>
        </View>

        {data.jobTitle && (
          <Text style={styles.subheader} numberOfLines={1}>
            {data.jobTitle}
          </Text>
        )}

        <Text style={styles.header} numberOfLines={2}>
          {fullName}
        </Text>

        {/* Two fields per row, which is the most Wallet lays out in one row. */}
        <View style={styles.fieldRow}>
          <GooglePassField label="Email" value={data.workEmail} />
          {frontPhone && <GooglePassField label="Phone" value={frontPhone} />}
        </View>

        <Pressable
          onPress={onBarcodePress}
          disabled={!onBarcodePress}
          style={styles.barcode}
          accessibilityRole="button"
          accessibilityLabel="pass_barcode"
        >
          <QRCode
            value={buildVCard(data)}
            size={GOOGLE_PASS.barcodeSize}
            backgroundColor="#FFFFFF"
            color="#000000"
            ecl="M"
          />
        </Pressable>

        {/* Wallet prints `barcode.alternateText` under the barcode, falling
            back to `barcode.value`. The value here is the whole vCard, so the
            pass overrides the caption with "a human readable equivalent". */}
        <Text style={styles.barcodeAlternateText} numberOfLines={1}>
          {data.workEmail}
        </Text>

        {/* Wallet draws the hero image full width at the foot of the pass,
            not as a thumbnail beside the name the way an Apple pass does. */}
        {data.photoUri && (
          <Image
            source={{ uri: data.photoUri }}
            style={styles.hero}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
        )}
      </View>
    );
  }
);

WalletPassView.displayName = "WalletPassView";

export default WalletPassView;
