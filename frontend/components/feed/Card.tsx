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
import BrandIcon, { type BrandIconName } from "@/components/brand/BrandIcon";
import { press, radius, textStyle, type } from "@/constants/brand";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

/** Content card (`card` bg, radius 20) that scales to 0.985 while pressed. */
export const PressableCard = ({
  onPress,
  accessibilityLabel,
  style,
  children,
}: {
  onPress: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) => {
  const { colors } = useBrandTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.line },
        pressed && { transform: [{ scale: press.card }] },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
};

/** Icon, uppercase meta label and a right-aligned date. */
export const CardMeta = ({
  icon,
  label,
  date,
}: {
  icon: BrandIconName;
  label?: string;
  date?: string;
}) => {
  const { colors } = useBrandTheme();

  return (
    <View style={styles.meta}>
      <BrandIcon name={icon} size={18} color={colors.text3} />
      <Text style={[styles.metaLabel, { color: colors.text3 }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.metaDate, { color: colors.text3 }]}>{date}</Text>
    </View>
  );
};

/** "Read More →" style link row at the foot of a card. */
export const CardMore = ({ label }: { label: string }) => {
  const { colors } = useBrandTheme();

  return (
    <View style={styles.more}>
      <Text style={[styles.moreText, { color: colors.accent }]}>{label}</Text>
      <BrandIcon name="arrow" size={18} strokeWidth={1.8} color={colors.accent} />
    </View>
  );
};

export const cardText = StyleSheet.create({
  title: {
    ...textStyle(type.cardTitle),
    marginTop: 12,
    marginBottom: 8,
  },
  excerpt: {
    ...textStyle(type.excerpt),
  },
});

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    padding: 18,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metaLabel: {
    ...textStyle(type.metaLabel),
    flexShrink: 1,
  },
  metaDate: {
    ...textStyle({ ...type.metaLabel, tracking: 0.04 }),
    marginLeft: "auto",
  },
  more: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
  },
  moreText: {
    ...textStyle({ size: 14, weight: 600 }),
  },
});
