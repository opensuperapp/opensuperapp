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
import React, { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  View,
  Dimensions,
  FlatList,
  Image,
  ImageSourcePropType,
} from "react-native";

const screenWidth = Dimensions.get("window").width;
const HORIZONTAL_PADDING = 16; // Padding on each side of the screen
const IMAGE_GAP = 16; // Gap between images

const ITEM_WIDTH = screenWidth - HORIZONTAL_PADDING * 2; // Actual width of each image
const SNAP_INTERVAL = ITEM_WIDTH + IMAGE_GAP; // Width of item + gap for snapping
const AUTO_PLAY_INTERVAL = 5000; // 5 seconds

interface BannerSliderProps {
  images: ImageSourcePropType[];
}

export default function BannerSlider({ images }: BannerSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList | null>(null);
  const autoPlayTimer = useRef<NodeJS.Timeout | null>(null);

  // Auto-play logic
  useEffect(() => {
    startAutoPlay();
    return () => stopAutoPlay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, images.length]);

  const startAutoPlay = () => {
    stopAutoPlay();
    if (images.length > 1) {
      autoPlayTimer.current = setTimeout(() => {
        goToNext();
      }, AUTO_PLAY_INTERVAL);
    }
  };

  const stopAutoPlay = () => {
    if (autoPlayTimer.current) {
      clearTimeout(autoPlayTimer.current);
      autoPlayTimer.current = null;
    }
  };

  const goToNext = () => {
    const nextIndex = (currentIndex + 1) % images.length;
    goToIndex(nextIndex);
  };

  const goToIndex = (index: number) => {
    if (flatListRef.current) {
      flatListRef.current.scrollToIndex({ index, animated: true });
    }
  };

  // Update indicator based on scroll position
  const onScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SNAP_INTERVAL);
    if (index >= 0 && index < images.length && index !== currentIndex) {
      setCurrentIndex(index);
    }
  };

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: any[] }) => {
      if (viewableItems.length > 0) {
        const newIndex = viewableItems[0].index;
        if (newIndex !== null && newIndex !== currentIndex) {
          setCurrentIndex(newIndex);
        }
      }
    }
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 51,
  }).current;

  const getItemLayout = (_: any, index: number) => ({
    length: ITEM_WIDTH,
    offset: index * SNAP_INTERVAL,
    index,
  });

  const onScrollToIndexFailed = (info: {
    index: number;
    highestMeasuredFrameIndex: number;
    averageItemLength: number;
  }) => {
    console.error("Failed to scroll to index:", info.index);
  };

  if (!images || images.length === 0) {
    return null;
  }

  const ItemSeparator = () => <View style={{ width: IMAGE_GAP }} />;

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={images}
        renderItem={({ item }) => (
          <View style={styles.imageContainer}>
            <Image source={item} style={styles.image} resizeMode="cover" />
          </View>
        )}
        keyExtractor={(_, index) => index.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onScrollBeginDrag={stopAutoPlay}
        onScrollEndDrag={startAutoPlay}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        style={styles.slider}
        contentContainerStyle={styles.sliderContent}
        snapToInterval={SNAP_INTERVAL}
        decelerationRate="fast"
        ItemSeparatorComponent={ItemSeparator}
        getItemLayout={getItemLayout}
        onScrollToIndexFailed={onScrollToIndexFailed}
      />

      {/* Dots indicator */}
      <View style={styles.dotsContainer}>
        {images.map((_, index) => (
          <View
            key={index}
            style={[styles.dot, currentIndex === index && styles.activeDot]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    overflow: "hidden",
  },
  slider: {
    width: screenWidth,
    marginLeft: -HORIZONTAL_PADDING, // Center the FlatList
  },
  sliderContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  imageContainer: {
    width: ITEM_WIDTH,
  },
  image: {
    width: "100%",
    height: ITEM_WIDTH * (22 / 35),
    borderRadius: 12,
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D1D5DB",
  },
  activeDot: {
    backgroundColor: "#F97316",
    width: 24,
  },
});
