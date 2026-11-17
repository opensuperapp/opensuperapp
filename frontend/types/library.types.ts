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
 * Represents a single article in the Choreo Labs Library.
 */
export type LibraryArticle = {
  nid: string;
  title: string;
  url: string;
  date: string;
  featured_image: string;
  teaser: string;
  content_name: string;
  productNames: string | null;
  productAreaNames: string | null;
  industriesNames: string | null;
  regionNames: string | null;
  choreo_tag: string;
  product_cls: string[];
  productArea_cls: string[];
  industry_cls: string[];
  region_cls: string[];
  content_cls: string;
  author: string;
  author_img: string;
  author_profile: string | null;
  author_designation: string;
  author_company: string;
};
