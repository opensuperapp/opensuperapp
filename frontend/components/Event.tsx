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
import { CardMeta, CardMore, cardText, PressableCard } from "@/components/feed/Card";
import { EventItem } from "@/hooks/useEventsFeed";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import {
  differenceInCalendarDays,
  format,
  isBefore,
  isTomorrow,
  isWithinInterval,
  parseISO,
} from "date-fns";
import React from "react";
import { Linking, StyleSheet, Text } from "react-native";
import RemoteFallbackImage from "./RemoteFallbackImage";

const CARD_WIDTH = 300;
const CARD_PADDING = 18;
const IMAGE_WIDTH = CARD_WIDTH - CARD_PADDING * 2 - 2; // minus the 1px border

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
  const { colors } = useBrandTheme();

  return (
    <PressableCard onPress={() => Linking.openURL(item.url)} style={styles.card}>
      <CardMeta
        icon="calendar"
        label={getEventStatus(item.date, item.end_date)}
        date={getRelativeDateLabel(item.date, item.end_date)}
      />

      {item.image ? (
        <RemoteFallbackImage
          source={item.image}
          style={[styles.featuredImage, { backgroundColor: colors.card2 }]}
          resizeMode="cover"
        />
      ) : null}

      <Text style={[cardText.title, { color: colors.text }]} numberOfLines={1}>
        {item.title}
      </Text>

      <Text numberOfLines={2} style={[cardText.excerpt, { color: colors.text2 }]}>
        {stripHtml(item.teaser)}
      </Text>

      <CardMore label="More Info" />
    </PressableCard>
  );
};

export default Event;

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
  },
  featuredImage: {
    width: IMAGE_WIDTH,
    height: IMAGE_WIDTH * (9 / 16),
    borderRadius: 14,
    marginTop: 14,
  },
});
