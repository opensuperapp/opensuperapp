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
import { Colors } from "@/constants/Colors";
import { StyleSheet } from "react-native";

/**
 * Typography for the wallet consent copy.
 *
 * The two platform sheets disclose different things and are laid out
 * differently — a page sheet on iOS, a bottom sheet on Android — but the prose
 * between the header and the button is the same document in both, so the
 * reading experience is defined once here rather than drifting apart in two
 * component files.
 *
 * This is consent text, so it is sized to actually be read: body copy at the
 * size of body copy, generous line height, and headings that separate "what
 * goes on the card" from "how it works" clearly enough that someone skimming
 * still lands on the right section. Links take the app's action colour so they
 * read as tappable — the policy links and the DPO address are the escape
 * hatches this screen promises.
 *
 * @param colorScheme - The active colour scheme.
 * @returns The style object for `<Markdown style={...}>`.
 */
export const createMarkdownStyles = (colorScheme: "light" | "dark") =>
  StyleSheet.create({
    body: {
      fontSize: 15,
      lineHeight: 22,
      color: Colors[colorScheme].primaryTextColor,
    },
    paragraph: {
      marginTop: 0,
      marginBottom: 12,
    },
    heading2: {
      fontSize: 16,
      fontWeight: "600",
      color: Colors[colorScheme].text,
      // Headings carry the separation between sections; the body paragraphs
      // above them already have their own bottom margin.
      marginTop: 16,
      marginBottom: 6,
    },
    strong: {
      fontWeight: "600",
      color: Colors[colorScheme].text,
    },
    link: {
      color: Colors.actionButtonTextColor,
    },
    bullet_list: {
      marginBottom: 12,
    },
    list_item: {
      marginBottom: 4,
    },
  });
