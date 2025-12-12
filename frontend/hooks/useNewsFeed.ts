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
import { useEffect, useState } from "react";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { XMLParser } from "fast-xml-parser";
import {
  NEWS_STORAGE_KEY,
  NEWS_TIMESTAMP_KEY,
  NEWS_URL,
} from "@/constants/Constants";

const ONE_DAY = 24 * 60 * 60 * 1000;

export type NewsItem = {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  guid?: { "#text": string };
};

const useNewsFeed = () => {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const cachedTimestamp = await AsyncStorage.getItem(NEWS_TIMESTAMP_KEY);
        const cachedData = await AsyncStorage.getItem(NEWS_STORAGE_KEY);

        const now = Date.now();

        if (
          cachedTimestamp &&
          cachedData &&
          now - parseInt(cachedTimestamp, 10) < ONE_DAY
        ) {
          // Use cached data
          setNewsItems(JSON.parse(cachedData));
        } else {
          // Fetch fresh data
          const response = await axios.get(NEWS_URL);
          const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_",
          });
          const json = parser.parse(response.data);

          const items = json.rss.channel.item;
          const formattedItems: NewsItem[] = Array.isArray(items)
            ? items
            : [items];

          setNewsItems(formattedItems);

          // Save to AsyncStorage
          await AsyncStorage.setItem(
            NEWS_STORAGE_KEY,
            JSON.stringify(formattedItems)
          );
          await AsyncStorage.setItem(NEWS_TIMESTAMP_KEY, now.toString());
        }
      } catch (error) {
        console.error("Failed to fetch News feed:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  return { newsItems, loading };
};

export default useNewsFeed;
