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
import { ScrollView, StyleSheet, View } from "react-native";
import { Skeleton } from "./Skeleton";

const FeedSkeleton = () => {
  const skeletonData: number[] = [1, 2, 3];
  const { colors } = useBrandTheme();
  const card = [styles.card, { backgroundColor: colors.card, borderColor: colors.line }];

  return (
    <View style={{ padding: 16 }}>
      <Skeleton
        style={{ width: "100%", aspectRatio: size.heroAspect }}
        borderRadius={radius.hero}
      />
      <View style={{ marginTop: 24 }}>
        <Skeleton width={100} height={24} style={{ marginHorizontal: 4 }} />
        <ScrollView
          style={{ marginTop: 12 }}
          horizontal={true}
          scrollEnabled={false}
        >
          {skeletonData.map((index) => (
            <View style={[card, styles.eventCard]} key={index}>
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <Skeleton width={20} height={20} />
                  <Skeleton width={80} height={12} style={{ marginLeft: 4 }} />
                </View>
                <Skeleton width={60} height={12} />
              </View>
              <Skeleton
                style={{ width: "100%" }}
                height={148}
                borderRadius={14}
              />
              <Skeleton
                height={18}
                style={{ width: "100%", marginBottom: 18, marginTop: 10 }}
              />
              <View style={styles.descriptionContainer}>
                <Skeleton width={250} height={10} style={{ marginTop: 4 }} />
                <Skeleton width={250} height={10} style={{ marginTop: 1 }} />
                <Skeleton width={150} height={10} style={{ marginTop: 1 }} />
              </View>
              <View
                style={{
                  flexDirection: "row",
                  gap: 4,
                  alignItems: "center",
                  justifyContent: "flex-end",
                  marginTop: 4,
                }}
              >
                <Skeleton width={80} height={12} />
                <Skeleton width={15} height={15} />
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
      <View style={{ marginTop: 24 }}>
        <Skeleton width={100} height={24} style={{ marginHorizontal: 4 }} />
        {skeletonData.map((index) => (
          <View style={card} key={`feed-skelton-${index}`}>
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Skeleton width={20} height={20} />
                <Skeleton width={80} height={12} style={{ marginLeft: 4 }} />
              </View>
              <Skeleton width={60} height={12} />
            </View>
            <Skeleton
              height={18}
              style={{ width: "100%", marginBottom: 6, marginTop: 10 }}
            />
            <Skeleton
              height={18}
              style={{ width: "60%", marginBottom: 18, marginTop: 1 }}
            />
            <View style={styles.descriptionContainer}>
              <Skeleton width={320} height={10} style={{ marginTop: 4 }} />
              <Skeleton width={320} height={10} />
              <Skeleton width={150} height={10} />
            </View>
            <View
              style={{
                flexDirection: "row",
                gap: 4,
                alignItems: "center",
                justifyContent: "flex-end",
                marginTop: 4,
              }}
            >
              <Skeleton width={80} height={12} />
              <Skeleton width={15} height={15} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

export default FeedSkeleton;

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    padding: 18,
    marginTop: 12,
  },
  eventCard: {
    width: 300,
    marginTop: 0,
    marginInlineEnd: 12,
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
  descriptionContainer: {
    flexDirection: "column",
    gap: 10,
    marginBottom: 10,
    maxWidth: 275,
  },
});
