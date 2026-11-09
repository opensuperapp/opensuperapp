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
import Event from "@/components/Event";
import FeedSkeleton from "@/components/FeedSkeleton";
import FeedHero from "@/components/feed/FeedHero";
import News from "@/components/News";
import { textStyle, type } from "@/constants/brand";
import { ScreenPaths } from "@/constants/ScreenPaths";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import useEventsFeed from "@/hooks/useEventsFeed";
import useNewsFeed from "@/hooks/useNewsFeed";
import { useTrackActiveScreen } from "@/hooks/useTrackActiveScreen";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

const Discovery = () => {
  const { colors } = useBrandTheme();
  const [isMinTimeElapsed, setIsMinTimeElapsed] = useState(false);

  useTrackActiveScreen(ScreenPaths.FEED);
  const { newsItems, loading } = useNewsFeed();
  const { eventItems } = useEventsFeed();

  useEffect(() => {
    /**
     * Delays rendering of the main content for a minimum of 1 second to ensure that
     * the skeleton UI is displayed briefly. This helps prevent the issue where the
     * index page content flashes too quickly and causes a poor visual experience
     * (especially when the app initially loads on the default screen).
     */
    const timer = setTimeout(() => {
      setIsMinTimeElapsed(true);
    }, 1000); // 1 second

    return () => clearTimeout(timer);
  }, []);

  // The scroll view is the screen's root so the native large title collapses as it scrolls,
  // and "automatic" insets it under the transparent bar and above the native tab bar.
  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      scrollEnabled={isMinTimeElapsed && !loading}
    >
      {!isMinTimeElapsed || loading ? (
        <FeedSkeleton />
      ) : (
        <>
          <FeedHero />

          {/* Events section */}
          {eventItems && eventItems.length > 0 && (
            <View>
              <Text style={[styles.header, { color: colors.text }]}>
                Events
              </Text>

              <ScrollView
                horizontal={true}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.stack}
              >
                {eventItems.map((item, index) => (
                  <Event key={index} item={item} />
                ))}
              </ScrollView>
            </View>
          )}

          {/* News section */}
          {newsItems && newsItems.length > 0 && (
            <View>
              <Text style={[styles.header, { color: colors.text }]}>News</Text>

              <View style={styles.stack}>
                {newsItems.map((news, index) => (
                  <News
                    item={news}
                    key={`${news.guid?.["#text"] || news.link}-${index}`}
                  />
                ))}
              </View>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
};

export default Discovery;

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  header: {
    ...textStyle(type.sectionHeading),
    marginTop: 24,
    marginBottom: 12,
    marginHorizontal: 4,
  },
  stack: {
    gap: 12,
  },
});
