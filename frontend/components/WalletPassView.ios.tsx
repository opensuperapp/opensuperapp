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
import ChoreoLabsLogo from "@/components/brand/ChoreoLabsLogo";
import ApplePassField from "@/components/businessCard/ApplePassField";
import { applePassStyles as styles } from "@/components/businessCard/applePassStyles";
import {
  CARD_ASPECT_RATIO,
  PASS,
  PASS_FOREGROUND_COLOR,
} from "@/constants/BusinessCard";
import { BusinessCardData } from "@/types/businessCard.types";
import { buildVCard } from "@/utils/vcard";
import React, { ComponentRef, forwardRef, useState } from "react";
import {
  Image,
  LayoutChangeEvent,
  Pressable,
  Text,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";

// The compact Choreo Labs lockup, 26pt tall as on the brand card. The pass
// bundle's logo.png has to carry the same artwork.
const LOGO_WIDTH = 79;

type Props = {
  data: BusinessCardData;
  onBarcodePress?: () => void;
};

const WalletPassView = forwardRef<ComponentRef<typeof View>, Props>(
  ({ data, onBarcodePress }, ref) => {
    const fullName = `${data.firstName} ${data.lastName}`.trim();
    // Same precedence as pass.go's frontPhone: work number, then mobile.
    const frontPhone = data.workPhone ?? data.mobile;

    // 3:4 is a floor, not a fixed height: on a narrow screen or at a large text
    // size the content is taller than that, and the card grows rather than
    // clipping the barcode. Until the width is known the ratio sets the height,
    // so a card whose content fits never changes size once it is measured.
    const [width, setWidth] = useState<number | null>(null);
    const onLayout = (event: LayoutChangeEvent) => {
      const next = event.nativeEvent.layout.width;
      if (next !== width) setWidth(next);
    };
    const height =
      width === null
        ? { aspectRatio: CARD_ASPECT_RATIO }
        : { minHeight: width / CARD_ASPECT_RATIO };

    return (
      <View
        ref={ref}
        style={[styles.pass, height]}
        onLayout={onLayout}
        collapsable={false}
      >
        <View style={styles.logo}>
          <ChoreoLabsLogo width={LOGO_WIDTH} color={PASS_FOREGROUND_COLOR} />
        </View>

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
            <ApplePassField label="Title" value={data.jobTitle} size="secondary" />
          </View>
        )}

        <View style={styles.auxiliaryRow}>
          <ApplePassField
            label="Email"
            value={data.workEmail}
            size="auxiliary"
            style={styles.auxiliaryColumn}
          />
          {frontPhone && (
            <ApplePassField
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
