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
import { Colors } from "@/constants/Colors";
import { BusinessCardData } from "@/types/businessCard.types";
import React, { RefObject } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";

const CONTENT_PADDING_H = 16;

type Props = {
  data: BusinessCardData;
  passRef: RefObject<View | null>;
  onBarcodePress: () => void;
};

const BusinessCardPreview = ({ data, passRef, onBarcodePress }: Props) => {
  const colorScheme = useColorScheme() ?? "light";
  const styles = createStyles(colorScheme);
  const passWidth = Dimensions.get("window").width - CONTENT_PADDING_H * 2;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ width: "100%" }}>
        <WalletPassView
          ref={passRef}
          data={data}
          onBarcodePress={onBarcodePress}
        />
      </View>

      <Text style={styles.sectionHeading}>On the back of the pass</Text>
      <View style={{ width: passWidth }}>
        <WalletPassDetails data={data} colorScheme={colorScheme} />
      </View>
    </ScrollView>
  );
};

export default BusinessCardPreview;

const createStyles = (colorScheme: "light" | "dark") =>
  StyleSheet.create({
    content: {
      alignItems: "center",
      paddingHorizontal: CONTENT_PADDING_H,
      paddingTop: 4,
      paddingBottom: 20,
    },
    sectionHeading: {
      alignSelf: "flex-start",
      marginTop: 20,
      marginBottom: 8,
      fontSize: 12,
      fontWeight: "600",
      letterSpacing: 0.6,
      textTransform: "uppercase",
      color: Colors[colorScheme].secondaryTextColor,
    },
  });
