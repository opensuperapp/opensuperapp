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
import { textStyle } from "@/constants/brand";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import { StyleSheet, Text, View } from "react-native";

interface ContentEmptyViewProps {
  title: string;
  description: string;
  header: React.ReactNode;
  footer?: React.ReactNode;
  titleAccessibilityLabel?: string;
}

/** Empty state: icon in a card2 circle, title and a supporting line. */
const ContentEmptyView = ({
  title,
  description,
  header,
  footer,
  titleAccessibilityLabel,
}: ContentEmptyViewProps) => {
  const { colors } = useBrandTheme();

  return (
    <View style={styles.container}>
      {header && (
        <View style={[styles.header, { backgroundColor: colors.card2 }]}>
          {header}
        </View>
      )}
      <Text
        style={[styles.title, { color: colors.text }]}
        accessibilityLabel={titleAccessibilityLabel}
      >
        {title}
      </Text>
      <Text style={[styles.description, { color: colors.text2 }]}>
        {description}
      </Text>
      {footer && <View style={styles.footer}>{footer}</View>}
    </View>
  );
};

export default ContentEmptyView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  header: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  footer: {
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...textStyle({ size: 16, weight: 600 }),
    textAlign: "center",
  },
  description: {
    ...textStyle({ size: 14, weight: 400, lineHeight: 1.5 }),
    textAlign: "center",
  },
});
