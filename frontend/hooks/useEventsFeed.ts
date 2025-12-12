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
import {
  EVENTS_STORAGE_KEY,
  EVENTS_TIMESTAMP_KEY,
  EVENTS_URL,
} from "@/constants/Constants";

const ONE_DAY = 24 * 60 * 60 * 1000;

export interface EventItem {
  type: string;
  date: string;
  title: string;
  teaser: string;
  url: string;
  location: string;
  end_date: string;
  image: string;
}

interface EventResponse {
  [timestamp: string]: EventItem;
}

const useEventsFeed = () => {
  const [eventItems, setEventItems] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const cachedTimestamp = await AsyncStorage.getItem(
          EVENTS_TIMESTAMP_KEY
        );
        const cachedData = await AsyncStorage.getItem(EVENTS_STORAGE_KEY);

        const now = Date.now();

        if (
          cachedTimestamp &&
          cachedData &&
          now - parseInt(cachedTimestamp, 10) < ONE_DAY
        ) {
          const parsed: EventResponse = JSON.parse(cachedData);
          const values = Object.values(parsed);
          setEventItems(values);
        } else {
          const { data } = await axios.get<EventResponse>(EVENTS_URL);
          const values = Object.values(data);
          setEventItems(values);

          await AsyncStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(data));
          await AsyncStorage.setItem(EVENTS_TIMESTAMP_KEY, now.toString());
        }
      } catch (error) {
        console.error("Failed to fetch Events feed:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  return { eventItems, loading };
};

export default useEventsFeed;
