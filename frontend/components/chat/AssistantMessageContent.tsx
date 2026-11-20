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
import BrandIcon from "@/components/brand/BrandIcon";
import { soraFamily, textStyle, type } from "@/constants/brand";
import { ChatThemePalette } from "@/constants/ChatTheme";
import React, { ReactNode } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Markdown from "react-native-markdown-display";

export interface AssistantMessageContentProps {
  content: string;
  theme: ChatThemePalette;
  onCopy: (value: string, label: string) => void;
}

/**
 * Renders assistant markdown and copyable value chips from agent responses.
 *
 * @param {AssistantMessageContentProps} props - Content and theme.
 * @returns {JSX.Element} Formatted assistant message body.
 */
const AssistantMessageContent = ({
  content,
  theme,
  onCopy,
}: AssistantMessageContentProps): JSX.Element => {
  const codeSurface = {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    color: theme.assistantText,
  };
  const markdownStyles = {
    body: {
      ...textStyle({ ...type.body, lineHeight: 1.6 }),
      color: theme.assistantText,
    },
    paragraph: { marginTop: 0, marginBottom: 8 },
    strong: { fontFamily: soraFamily[600], fontWeight: "normal" as const },
    heading1: {
      ...textStyle({ size: 20, weight: 600, tracking: -0.03, lineHeight: 1.3 }),
      color: theme.assistantText,
      marginBottom: 8,
    },
    heading2: {
      ...textStyle({ size: 17, weight: 600, tracking: -0.025, lineHeight: 1.35 }),
      color: theme.assistantText,
      marginBottom: 6,
    },
    heading3: {
      ...textStyle({ size: 15, weight: 600, lineHeight: 1.4 }),
      color: theme.assistantText,
      marginBottom: 4,
    },
    link: { color: theme.accent, textDecorationLine: "none" as const },
    bullet_list: { marginVertical: 6 },
    ordered_list: { marginVertical: 6 },
    list_item: { marginVertical: 3 },
    bullet_list_icon: { color: theme.muted, marginLeft: 4, marginRight: 10 },
    ordered_list_icon: { color: theme.muted, marginLeft: 4, marginRight: 10 },
    code_inline: {
      ...codeSurface,
      borderWidth: 0,
      paddingHorizontal: 4,
      paddingVertical: 0,
      borderRadius: 6,
    },
    code_block: { ...codeSurface, borderRadius: 12, padding: 12 },
    fence: { ...codeSurface, borderRadius: 12, padding: 12 },
    blockquote: {
      backgroundColor: theme.surface,
      borderColor: theme.inputBorder,
      borderLeftWidth: 3,
      marginLeft: 0,
      paddingHorizontal: 12,
      borderRadius: 4,
    },
    hr: { backgroundColor: theme.border },
    table: { borderColor: theme.border, borderRadius: 12 },
    tr: { borderColor: theme.border },
  };

  const COPYABLE_PATTERN = /#\(([^)]+)\)/g;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let partKey = 0;

  while ((match = COPYABLE_PATTERN.exec(content)) !== null) {
    const precedingRaw = content.slice(lastIndex, match.index);
    const preceding = precedingRaw.toLowerCase();
    if (match.index > lastIndex) {
      const stripped = precedingRaw.replace(/\n-[^\n]*$/, "").trimEnd();
      if (stripped) {
        parts.push(
          <Markdown key={partKey++} style={markdownStyles}>
            {stripped}
          </Markdown>
        );
      }
    }
    const value = match[1];
    const label = preceding.includes("password")
      ? "Password"
      : preceding.includes("username") || preceding.includes("user")
        ? "Username"
        : "Value";
    parts.push(
      <View key={partKey++} style={styles.chipBlock}>
        <Text style={[styles.chipLabel, { color: theme.subtle }]}>{label}</Text>
        <View
          style={[
            styles.chip,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
        >
          <Text
            style={[styles.chipValue, { color: theme.assistantText }]}
            numberOfLines={1}
          >
            {value}
          </Text>
          <TouchableOpacity
            style={styles.copyBtn}
            onPress={() => onCopy(value, label)}
            accessibilityLabel={`Copy ${label}`}
            accessibilityRole="button"
          >
            <BrandIcon name="copy" size={18} color={theme.accent} />
          </TouchableOpacity>
        </View>
      </View>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push(
      <Markdown key={partKey++} style={markdownStyles}>
        {content.slice(lastIndex)}
      </Markdown>
    );
  }

  if (parts.length === 0) {
    return (
      <Markdown style={markdownStyles}>
        {content}
      </Markdown>
    );
  }

  return <>{parts}</>;
};

export default AssistantMessageContent;

const styles = StyleSheet.create({
  chipBlock: {
    marginVertical: 8,
  },
  chipLabel: {
    ...textStyle({ size: 12, weight: 400 }),
    marginBottom: 6,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  chipValue: {
    flex: 1,
    fontSize: 14,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  copyBtn: {
    minWidth: 44,
    alignSelf: "stretch",
    paddingHorizontal: 12,
    justifyContent: "center",
    alignItems: "center",
  },
});
