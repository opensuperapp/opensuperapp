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
import { radius, soraFamily } from "@/constants/brand";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface EmptyStateProps {
  icon: BrandIconName;
  title: string;
  description?: string;
  action?: { label: string; onPress: () => void };
}

/** Icon in a card2 disc, a title, a supporting line and an optional small primary button. */
export default function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  const { colors } = useBrandTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.icon, { backgroundColor: colors.card2 }]}>
        <BrandIcon name={icon} size={28} color={colors.text} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {description ? (
        <Text style={[styles.description, { color: colors.text2 }]}>
          {description}
        </Text>
      ) : null}
      {action && (
        <Pressable
          onPress={action.onPress}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.primaryFill },
            pressed && { transform: [{ scale: 0.98 }] },
          ]}
        >
          <Text style={[styles.buttonText, { color: colors.primaryText }]}>
            {action.label}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  title: {
    fontFamily: soraFamily[600],
    fontSize: 16,
    textAlign: "center",
  },
  description: {
    fontFamily: soraFamily[400],
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  button: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: radius.buttonSmall,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  buttonText: {
    fontFamily: soraFamily[600],
    fontSize: 14,
  },
});
