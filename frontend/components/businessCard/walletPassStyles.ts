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
import {
  CARD_ASPECT_RATIO,
  PASS,
  PASS_BACKGROUND_COLOR,
  PASS_FOREGROUND_COLOR,
} from "@/constants/BusinessCard";
import { StyleSheet } from "react-native";

export const walletPassStyles = StyleSheet.create({
  pass: {
    aspectRatio: CARD_ASPECT_RATIO,
    backgroundColor: PASS_BACKGROUND_COLOR,
    borderRadius: PASS.cornerRadius,
    paddingHorizontal: PASS.contentPaddingH,
    paddingTop: PASS.contentPaddingTop,
    paddingBottom: PASS.contentPaddingBottom,
    overflow: "hidden",
  },
  logo: {
    width: PASS.logoSize,
    height: PASS.logoSize,
    alignSelf: "flex-start",
  },
  primaryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: PASS.rowGap,
  },
  primaryColumn: {
    flex: 1,
    marginRight: 12,
  },
  primaryValue: {
    fontSize: 28,
    lineHeight: 33,
    fontWeight: "700",
    color: PASS_FOREGROUND_COLOR,
  },
  thumbnail: {
    width: PASS.thumbnailSize,
    height: PASS.thumbnailSize,
    borderRadius: PASS.thumbnailSize / 2,
    borderWidth: PASS.thumbnailSize * PASS.thumbnailRingFraction,
    borderColor: PASS_FOREGROUND_COLOR,
  },
  secondaryRow: {
    marginTop: PASS.rowGap,
  },
  auxiliaryRow: {
    flexDirection: "row",
    marginTop: PASS.rowGap,
  },
  auxiliaryColumn: {
    flex: 1,
    paddingRight: 8,
  },
  spacer: {
    flex: 1,
    minHeight: PASS.rowGap,
  },
  barcode: {
    alignSelf: "center",
    padding: PASS.barcodePadding,
    borderRadius: PASS.barcodeCornerRadius,
    backgroundColor: "#FFFFFF",
  },
});
