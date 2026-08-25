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
  PASS_FOREGROUND_COLOR,
  PASS_LABEL_COLOR,
} from "@/constants/BusinessCard";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  label: string;
  value: string;
  size: "secondary" | "auxiliary";
  style?: object;
};

// Wallet uppercases labels itself, so callers pass the strings pass.go writes.
const PassField = ({ label, value, size, style }: Props) => (
  <View style={style}>
    <Text style={styles.label} numberOfLines={1}>
      {label.toUpperCase()}
    </Text>
    <Text
      style={
        size === "secondary" ? styles.secondaryValue : styles.auxiliaryValue
      }
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.7}
    >
      {value}
    </Text>
  </View>
);

export default PassField;

const styles = StyleSheet.create({
  label: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.6,
    color: PASS_LABEL_COLOR,
  },
  secondaryValue: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: "600",
    color: PASS_FOREGROUND_COLOR,
  },
  auxiliaryValue: {
    marginTop: 2,
    fontSize: 15,
    fontWeight: "600",
    color: PASS_FOREGROUND_COLOR,
  },
});
