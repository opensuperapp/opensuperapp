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
import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { EventItem } from "@/hooks/useEventsFeed";
import RemoteFallbackImage from "./RemoteFallbackImage";
import {
  format,
  differenceInCalendarDays,
  parseISO,
  isTomorrow,
  isBefore,
  isWithinInterval,
} from "date-fns";

const getRelativeDateLabel = (
  startDateStr: string,
  endDateStr: string
): string => {
  const today = new Date();
  const startDate = parseISO(startDateStr);
  const endDate = parseISO(endDateStr);

  // If today is during the event
  if (
    isWithinInterval(today, {
      start: startDate,
      end: endDate,
    })
  ) {
    return "Today";
  }

  // If the event starts tomorrow
  if (isTomorrow(startDate)) {
    return "Tomorrow";
  }

  const diffDays = differenceInCalendarDays(startDate, today);

  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? "s" : ""} left`;
  }

  // If the event has already ended
  return format(startDate, "MMM d, yyyy");
};

const getEventStatus = (startDateStr: string, endDateStr: string): string => {
  const today = new Date();
  const startDate = parseISO(startDateStr);
  const endDate = parseISO(endDateStr);

  if (isWithinInterval(today, { start: startDate, end: endDate })) {
    return "HAPPENING NOW";
  }

  if (isBefore(today, startDate)) {
    return "UPCOMING";
  }

  return "ENDED";
};

const stripHtml = (htmlString: string) => {
  return htmlString
    .replace(/<[^>]*>?/gm, "")
    .replace(/&[^;]+;/g, " ")
    .trim();
};

const Event = ({ item }: { item: EventItem }) => {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme ?? "light");

  return (
    <TouchableOpacity
      onPress={() => Linking.openURL(item.url)}
      style={styles.card}
      activeOpacity={0.6}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="calendar-outline" size={16} color="#919191" />
          <Text style={styles.type}>
            {getEventStatus(item.date, item.end_date)}
          </Text>
        </View>
        <Text style={styles.date}>
          {getRelativeDateLabel(item.date, item.end_date)}
        </Text>
      </View>

      {/* Featured Image */}
      {item.image ? (
        <View style={{ alignItems: "center" }}>
          <RemoteFallbackImage
            source={item.image}
            style={styles.featuredImage}
            resizeMode="cover"
          />
        </View>
      ) : null}

      {/* Title */}
      <Text style={styles.title} numberOfLines={1}>
        {item.title}
      </Text>

      <View style={styles.descriptionContainer}>
        <Text numberOfLines={4} style={styles.description}>
          {stripHtml(item.teaser)}
        </Text>
      </View>

      {/* More info button */}
      <TouchableOpacity
        onPress={() => Linking.openURL(item.url)}
        style={{
          flexDirection: "row",
          gap: 4,
          alignItems: "center",
          justifyContent: "flex-end",
          marginTop: 4,
        }}
      >
        <Text style={{ fontSize: 14, color: Colors.companyOrange }}>
          More Info
        </Text>
        <Ionicons name="arrow-forward" size={15} color={Colors.companyOrange} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

export default Event;

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
      marginInlineEnd: 12,
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
    featuredImage: {
      width: 272,
      height: 153,
      borderRadius: 12,
      marginBottom: 14,
    },
    title: {
      color: Colors[colorScheme].text,
      fontSize: 16,
      fontWeight: "600",
      marginBottom: 10,
      maxWidth: 275,
    },

    descriptionContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 10,
      maxWidth: 275,
    },
    description: {
      color: Colors[colorScheme ?? "light"].mutedTextColor,
      fontSize: 14,
    },
    venue: {
      color: Colors[colorScheme ?? "light"].mutedTextColor,
      fontSize: 14,
    },
  });
