// Copyright (c) 2025 WSO2 LLC. (https://www.wso2.com).
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
import BrandIcon, { type BrandIconName } from "@/components/brand/BrandIcon";
import { soraFamily, textStyle, type } from "@/constants/brand";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Skeleton } from "./Skeleton";

/**
 * Props for ProfileListItem component.
 */
type ProfileListItemProps = {
  icon: BrandIconName;
  title: string;
  value?: string | null;
};

/** One row of the profile list card: icon, small label, value. */
const ProfileListItem = React.memo(
  ({ icon, title, value }: ProfileListItemProps) => {
    const { colors } = useBrandTheme();

    return (
      <View style={styles.row}>
        <BrandIcon name={icon} size={24} color={colors.text2} />
        <View style={styles.text}>
          <Text style={[styles.titleText, { color: colors.text3 }]}>
            {title}
          </Text>
          {value && value.trim() ? (
            <Text
              style={[styles.valueText, { color: colors.text }]}
              numberOfLines={1}
            >
              {value}
            </Text>
          ) : (
            <Skeleton width={220} height={10} style={{ marginTop: 6 }} />
          )}
        </View>
      </View>
    );
  }
);

export default ProfileListItem;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 16,
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  titleText: {
    ...textStyle({ ...type.profileFieldLabel, tracking: 0.02 }),
  },
  valueText: {
    ...textStyle(type.profileFieldValue),
    fontFamily: soraFamily[500],
    marginTop: 2,
  },
});
