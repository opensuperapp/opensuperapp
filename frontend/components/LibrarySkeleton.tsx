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
import { radius, size } from "@/constants/brand";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Skeleton } from "./Skeleton";

const LibrarySkelton = () => {
  const skeletonData = [1, 2];
  const { colors } = useBrandTheme();

  return skeletonData.map((_, index) => (
    <View
      key={`library-skeleton-${index}`}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.line }]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Skeleton width={20} height={20} />
          <Skeleton width={80} height={12} style={{ marginLeft: 4 }} />
        </View>
        <Skeleton width={60} height={12} />
      </View>
      <Skeleton style={{ width: "100%" }} height={180} borderRadius={14} />
      <Skeleton
        height={18}
        style={{ width: "100%", marginBottom: 18, marginTop: 10 }}
      />
      <View style={styles.authorContainer}>
        <Skeleton width={size.avatar.author} height={size.avatar.author} circle />
        <View style={styles.authorTextContainer}>
          <Skeleton width={120} height={12} />
          <Skeleton width={150} height={10} style={{ marginTop: 4 }} />
        </View>
      </View>
      <View style={[styles.tagContainer, { borderTopColor: colors.line }]}>
        <Skeleton width={72} height={size.tagHeight} borderRadius={radius.pill} />
        <Skeleton width={96} height={size.tagHeight} borderRadius={radius.pill} />
      </View>
    </View>
  ));
};

export default LibrarySkelton;

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    padding: 18,
    marginTop: 12,
    marginHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  authorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  authorTextContainer: {
    width: "80%",
  },
  tagContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    borderTopWidth: 1,
    paddingTop: 14,
  },
});
