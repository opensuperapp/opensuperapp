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
  PASS_BACKGROUND_COLOR,
  PASS_FOREGROUND_COLOR,
} from "@/constants/BusinessCard";
import { GOOGLE_PASS } from "@/constants/GooglePass";
import { StyleSheet } from "react-native";

// Google exposes only `hexBackgroundColor` and derives the text colour from it
// for contrast, so the label tint here is the foreground at reduced opacity
// rather than a second colour the pass could set.
const LABEL_COLOR = "rgba(255, 255, 255, 0.75)";

export const googlePassStyles = StyleSheet.create({
  pass: {
    // No aspectRatio: a Google pass is as tall as its content.
    backgroundColor: PASS_BACKGROUND_COLOR,
    borderRadius: GOOGLE_PASS.cornerRadius,
    padding: GOOGLE_PASS.contentPadding,
    overflow: "hidden",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: GOOGLE_PASS.logoSize,
    height: GOOGLE_PASS.logoSize,
    // Wallet masks the logo into a circle.
    borderRadius: GOOGLE_PASS.logoSize / 2,
    marginRight: 12,
  },
  cardTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: PASS_FOREGROUND_COLOR,
  },
  subheader: {
    marginTop: GOOGLE_PASS.rowGap,
    fontSize: 13,
    color: LABEL_COLOR,
  },
  header: {
    marginTop: 2,
    fontSize: 26,
    lineHeight: 32,
    color: PASS_FOREGROUND_COLOR,
  },
  fieldRow: {
    flexDirection: "row",
    marginTop: GOOGLE_PASS.rowGap,
  },
  field: {
    flex: 1,
    paddingRight: 8,
  },
  fieldLabel: {
    fontSize: 12,
    color: LABEL_COLOR,
  },
  fieldValue: {
    marginTop: 2,
    fontSize: 15,
    color: PASS_FOREGROUND_COLOR,
  },
  hero: {
    width: "100%",
    // "Include 20dp padding on the top and bottom for visual breathing room."
    marginTop: 20,
    marginBottom: 20,
    // The documented hero aspect ratio, 1032:812.
    aspectRatio: 1032 / 812,
  },
  barcode: {
    alignSelf: "center",
    marginTop: GOOGLE_PASS.rowGap,
    padding: GOOGLE_PASS.barcodePadding,
    borderRadius: GOOGLE_PASS.barcodeCornerRadius,
    backgroundColor: "#FFFFFF",
  },
  barcodeAlternateText: {
    marginTop: 8,
    alignSelf: "center",
    fontSize: 12,
    color: LABEL_COLOR,
  },
});
