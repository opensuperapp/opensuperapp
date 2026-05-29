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
import { ChatThemePalette } from "@/constants/ChatTheme";
import { Ionicons } from "@expo/vector-icons";
import React, { ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
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
  const markdownStyles = {
    body: {
      color: theme.assistantText,
      fontSize: 16,
      lineHeight: 24,
    },
    strong: { fontWeight: "700" as const },
    heading1: {
      fontSize: 22,
      fontWeight: "600" as const,
      color: theme.assistantText,
      marginBottom: 8,
    },
    heading2: {
      fontSize: 18,
      fontWeight: "600" as const,
      color: theme.assistantText,
      marginBottom: 6,
    },
    bullet_list: { marginVertical: 6 },
    list_item: { marginVertical: 3 },
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
        <Text style={[styles.chipLabel, { color: theme.muted }]}>{label}</Text>
        <View
          style={[
            styles.chip,
            {
              backgroundColor: theme.surface,
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
            style={[styles.copyBtn, { backgroundColor: theme.accentMuted }]}
            onPress={() => onCopy(value, label)}
          >
            <Ionicons name="copy-outline" size={16} color="#fff" />
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
    fontSize: 13,
    marginBottom: 6,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  chipValue: {
    flex: 1,
    fontSize: 14,
    fontFamily: "monospace",
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  copyBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "center",
  },
});
