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
  LIBRARY_ARTICLE_FETCH_LIMIT,
  LIBRARY_URL,
} from "@/constants/Constants";
import { LibraryArticle } from "@/types/library.types";
import axios from "axios";

/**
 * Fetches articles from the Choreo Labs Library.
 *
 * @param {Object} params - Parameters for fetching articles.
 * @param {boolean} params.isInitial - Indicates if it's the initial fetch.
 * @param {number} params.start - Pagination start index.
 * @param {string} params.debouncedQuery - Search keywords.
 * @returns {Promise<LibraryArticle[]>} - Promise resolving to articles data.
 * @throws {Error} - Throws error if fetching fails.
 */
export const fetchLibraryArticles = async (
  isInitial: boolean,
  start: number,
  debouncedQuery: string
): Promise<LibraryArticle[]> => {
  try {
    const response = await axios.post(
      `${LIBRARY_URL}`,
      new URLSearchParams({
        search: debouncedQuery,
        start: isInitial ? "0" : start.toString(),
        limit: LIBRARY_ARTICLE_FETCH_LIMIT.toString(),
      }),
      {
        timeout: 10000, // 10 seconds timeout
      }
    );

    if (response.status !== 200) {
      throw new Error(`Unexpected response status: ${response.status}`);
    }

    const { data } = response;

    if (!data || !data.success) {
      throw new Error("Invalid response structure or unsuccessful response.");
    }

    return data.data;
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response
          ? `Server responded with status ${error.response.status}: ${error.response.statusText}`
          : `Network error or request was aborted: ${error.message}`
      );
    } else {
      throw new Error(`An unexpected error occurred: ${error.message}`);
    }
  }
};
