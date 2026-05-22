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
import useNewsFeed from "./useNewsFeed";
import useEventsFeed from "./useEventsFeed";

/**
 * Hook for managing Feed/Discovery screen content
 */
export const useFeed = () => {
  const [isMinTimeElapsed, setIsMinTimeElapsed] = useState(false);
  const { newsItems, loading: newsLoading } = useNewsFeed();
  const { eventItems, loading: eventsLoading } = useEventsFeed();

  const loading = newsLoading || eventsLoading;
  const isEmpty = (!eventItems || eventItems.length === 0) && 
                  (!newsItems || newsItems.length === 0);

  useEffect(() => {
    /**
     * Delays rendering of the main content for a minimum of 1 second to ensure that
     * the skeleton UI is displayed briefly. This helps prevent the issue where the
     * index page content flashes too quickly and causes a poor visual experience
     * (especially when the app initially loads on the default screen).
     */
    const timer = setTimeout(() => {
      setIsMinTimeElapsed(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return {
    newsItems,
    eventItems,
    loading,
    isMinTimeElapsed,
    isEmpty,
    shouldShowSkeleton: !isMinTimeElapsed || loading,
  };
};
