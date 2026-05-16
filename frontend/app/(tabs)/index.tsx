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
import BannerSlider from "@/components/BannerSlider";
import Event from "@/components/Event";
import FeedSkeleton from "@/components/FeedSkeleton";
import News from "@/components/News";
import { Colors } from "@/constants/Colors";
import { ScreenPaths } from "@/constants/ScreenPaths";
import useEventsFeed from "@/hooks/useEventsFeed";
import useNewsFeed from "@/hooks/useNewsFeed";
import useNetworkQuality from "@/hooks/useNetworkQuality";
import { useTrackActiveScreen } from "@/hooks/useTrackActiveScreen";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";

const screenWidth = Dimensions.get("window").width;
const bannerImages = [
  require("../../assets/images/banner1.png"),
  require("../../assets/images/banner2.png"),
  require("../../assets/images/banner3.png"),
];

const Discovery = () => {
  const tabBarHeight: number = useBottomTabBarHeight();
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme ?? "light", tabBarHeight);
  const [isMinTimeElapsed, setIsMinTimeElapsed] = useState(false);
  const networkQuality = useNetworkQuality();

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

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % bannerImages.length);
    }, 10000); // 10 seconds

    return () => clearInterval(intervalId); // Clean up on unmount
  }, []);

  return (
    <View style={styles.background}>
      {!isMinTimeElapsed || loading ? (
        <FeedSkeleton />
      ) : (
        <ScrollView style={{ padding: 16, marginTop: 5 }}>
          {/* Offline message */}
          {networkQuality === "offline" && (
            <View style={styles.offlineMessage}>
              <Text style={styles.offlineText}>
                You're offline. Showing cached content.
              </Text>
            </View>
          )}

          {/* Banner image slider */}
          <BannerSlider />

          {/* Events section */}
          {eventItems && eventItems.length > 0 && (
            <View style={{ marginTop: 10 }}>
              <Text style={styles.header}>Events</Text>

              <ScrollView horizontal={true}>
                {eventItems.map((item, index) => (
                  <Event key={index} item={item} />
                ))}
              </ScrollView>
            </View>
          )}

          {/* News section */}
          {newsItems && newsItems.length > 0 && (
            <View style={{ paddingBottom: tabBarHeight }}>
              <Text style={styles.header}>News</Text>

              {newsItems.map((news, index) => (
                <News
                  item={news}
                  key={`${news.guid?.["#text"] || news.link}-${index}`}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

export default Discovery;

const createStyles = (colorScheme: "light" | "dark", tabBarHeight: number) =>
  StyleSheet.create({
    background: {
      backgroundColor: Colors[colorScheme].primaryBackgroundColor,
    },
    image: {
      width: "100%",
      height: (screenWidth - 32) * (22 / 35),
      borderRadius: 12,
    },
    header: {
      color: Colors[colorScheme ?? "light"].ternaryTextColor,
      fontSize: 24,
      fontWeight: "700",
      marginVertical: 10,
    },
    offlineMessage: {
      backgroundColor: Colors[colorScheme].ternaryBackgroundColor,
      padding: 12,
      borderRadius: 8,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: Colors.companyOrange,
    },
    offlineText: {
      color: Colors[colorScheme].primaryTextColor,
      fontSize: 14,
      textAlign: "center",
    },
  });
