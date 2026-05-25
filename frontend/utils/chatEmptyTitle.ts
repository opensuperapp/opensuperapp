// Copyright (c) 2026 WSO2 LLC. (https://www.wso2.com).
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

import { CHAT_EMPTY_DEFAULT_MESSAGE } from "@/constants/Constants";

export interface ChatEmptyTitleContent {
  greeting?: string;
  message: string;
}

/**
 * Headline for the empty state: orange greeting + message below.
 *
 * @param {string} [firstName] - User's first name from profile.
 * @returns {ChatEmptyTitleContent} Greeting and message parts.
 */
export const getChatEmptyTitleContent = (
  firstName?: string
): ChatEmptyTitleContent => {
  const name = firstName?.trim();
  if (name) {
    return {
      greeting: `Hi ${name}!`,
      message: CHAT_EMPTY_DEFAULT_MESSAGE,
    };
  }
  return {
    message: CHAT_EMPTY_DEFAULT_MESSAGE,
  };
};
