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
import {
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import { NewsItem } from "@/hooks/useNewsFeed";
import { formatPubDate } from "@/utils/formatPubDate";

const stripHtml = (htmlString: string) => {
  if (!htmlString) return "";

  return (
    htmlString
      // Replace <br>, <p>, <div>, etc. with line breaks
      .replace(/<(br|\/p|\/div)>/gi, "\n")
      .replace(/<\/?[^>]+(>|$)/g, "") // Strip all remaining HTML tags
      .replace(/&nbsp;/gi, " ")
      .replace(/&[^;]+;/g, "") // Remove other HTML entities
      .replace(/\n{3,}/g, "\n\n") // Collapse 3+ newlines into 2
      .trim()
  );
};

const News = ({ item }: { item: NewsItem }) => {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme ?? "light");

  return (
    <>
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="newspaper-outline" size={16} color="#919191" />
            <Text style={styles.type}>NEWS</Text>
          </View>
          <Text style={styles.date}>{formatPubDate(item.pubDate)}</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>{item.title}</Text>

        {/* Description */}
        <View style={styles.descriptionContainer}>
          <Text numberOfLines={3} style={styles.description}>
            {stripHtml(item.description)}
          </Text>
        </View>
        {item.link && (
          <TouchableOpacity
            onPress={() => Linking.openURL(item.link)}
            style={{
              flexDirection: "row",
              gap: 4,
              alignItems: "center",
              justifyContent: "flex-end",
              marginTop: 6,
            }}
          >
            <Text style={{ fontSize: 14, color: Colors.companyOrange }}>
              Read More
            </Text>
            <Ionicons
              name="arrow-forward"
              size={15}
              color={Colors.companyOrange}
            />
          </TouchableOpacity>
        )}
      </View>
    </>
  );
};

export default News;

const createStyles = (colorScheme: "light" | "dark") =>
  StyleSheet.create({
    card: {
      backgroundColor: Colors[colorScheme].libraryCardBackgroundColor,
      borderRadius: 14,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor:
        colorScheme === "light"
          ? Colors.light.secondaryBackgroundColor
          : "transparent",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
    },
    type: {
      color: "#919191",
      fontSize: 12,
      fontWeight: "500",
      marginLeft: 4,
    },
    date: {
      color: Colors[colorScheme ?? "light"].mutedTextColor,
      fontSize: 12,
    },
    title: {
      color: Colors[colorScheme].text,
      fontSize: 16,
      fontWeight: "600",
      marginBottom: 15,
      marginTop: 5,
    },
    descriptionContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 10,
    },
    description: {
      color: Colors[colorScheme ?? "light"].mutedTextColor,
      fontSize: 14,
    },
  });
