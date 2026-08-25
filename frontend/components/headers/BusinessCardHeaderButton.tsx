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
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, TouchableOpacity } from "react-native";

type BusinessCardHeaderButtonProps = {
  onPress: () => void;
};

const BusinessCardHeaderButton = ({
  onPress,
}: BusinessCardHeaderButtonProps) => (
  <TouchableOpacity
    activeOpacity={0.5}
    onPress={onPress}
    hitSlop={12}
    style={styles.button}
    accessibilityRole="button"
    accessibilityLabel="open_business_card"
  >
    <Ionicons name="card-outline" size={24} color={Colors.companyOrange} />
  </TouchableOpacity>
);

export default BusinessCardHeaderButton;

const styles = StyleSheet.create({
  button: {
    marginRight: 16,
  },
});
