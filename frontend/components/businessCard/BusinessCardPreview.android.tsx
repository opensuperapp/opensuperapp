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
import WalletPassDetails from "@/components/WalletPassDetails";
import WalletPassView from "@/components/WalletPassView";
import { textStyle, type } from "@/constants/brand";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import { BusinessCardData } from "@/types/businessCard.types";
import React, { RefObject } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

const CONTENT_PADDING_H = 16;

type Props = {
  data: BusinessCardData;
  passRef: RefObject<View | null>;
  onBarcodePress: () => void;
};

const BusinessCardPreview = ({ data, passRef, onBarcodePress }: Props) => {
  const { colors, scheme } = useBrandTheme();

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.passSlot}>
        <WalletPassView
          ref={passRef}
          data={data}
          onBarcodePress={onBarcodePress}
        />
      </View>

      {/* Google Wallet has no card back: tapping the pass opens an expanded
          view below it, which is what these rows stand in for. */}
      <Text style={[styles.sectionHeading, { color: colors.text3 }]}>In the expanded pass view</Text>
      <View style={styles.passSlot}>
        <WalletPassDetails data={data} colorScheme={scheme} />
      </View>
    </ScrollView>
  );
};

export default BusinessCardPreview;

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: CONTENT_PADDING_H,
    paddingTop: 8,
    paddingBottom: 20,
  },
  passSlot: {
    width: "100%",
  },
  sectionHeading: {
    ...textStyle(type.metaLabel),
    textAlign: "center",
    marginTop: 18,
    marginBottom: 12,
  },
});
