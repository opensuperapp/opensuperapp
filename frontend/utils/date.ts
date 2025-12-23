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

/**
 * Formats a notification date string to a human readable format.
 * @param dateString - The date string to format.
 * @returns The formatted date string.
 */
export const formatNotificationDate = (dateString: string): string => {
  const date = convertToUtc(dateString);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  const time = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  if (isToday) return `Today at ${time}`;
  if (isYesterday) return `Yesterday at ${time}`;

  const day = String(date.getDate()).padStart(2, "0");
  const month = date.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const year = date.getFullYear();

  return `${day} ${month} ${year} at ${time}`;
};

/**
 * Converts a date string to a UTC date.
 * @param dateString - The date string to convert.
 * @returns The UTC date.
 */
export const convertToUtc = (dateString: string): Date => {
  return new Date(dateString.replace(" ", "T") + "Z");
};
