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
import { googlePassStyles as styles } from "@/components/businessCard/googlePassStyles";
import React from "react";
import { Text, View } from "react-native";

type Props = {
  label: string;
  value: string;
};

// One `textModulesData` entry. Google renders the label in Title Case as it is
// given — unlike Wallet on iOS it does not uppercase it — so the caller passes
// the exact string the pass carries.
const GooglePassField = ({ label, value }: Props) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel} numberOfLines={1}>
      {label}
    </Text>
    <Text style={styles.fieldValue} numberOfLines={1} ellipsizeMode="tail">
      {value}
    </Text>
  </View>
);

export default GooglePassField;
