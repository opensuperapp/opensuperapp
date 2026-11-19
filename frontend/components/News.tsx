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
import { NewsItem } from "@/hooks/useNewsFeed";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import { formatPubDate } from "@/utils/formatPubDate";
import React from "react";
import { Linking, Text } from "react-native";

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
  const { colors } = useBrandTheme();

  return (
    <PressableCard onPress={() => Linking.openURL(item.link)}>
      <CardMeta icon="news" label="News" date={formatPubDate(item.pubDate)} />

      <Text style={[cardText.title, { color: colors.text }]}>{item.title}</Text>

      <Text numberOfLines={2} style={[cardText.excerpt, { color: colors.text2 }]}>
        {stripHtml(item.description)}
      </Text>

      <CardMore label="Read More" />
    </PressableCard>
  );
};

export default News;
