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
import BrandIcon from "@/components/brand/BrandIcon";
import WheelLoader from "@/components/brand/WheelLoader";
import ContentEmptyView from "@/components/ContentEmptyView";
import AuthorAvatar from "@/components/feed/AuthorAvatar";
import { CardMeta, cardText, PressableCard } from "@/components/feed/Card";
import RemoteFallbackImage from "@/components/RemoteFallbackImage";
import { radius, size, textStyle, type } from "@/constants/brand";
import {
  ARTICLE_BASE_URL,
  LIBRARY_ARTICLE_FETCH_LIMIT,
} from "@/constants/Constants";
import { ScreenPaths } from "@/constants/ScreenPaths";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import useDebounce from "@/hooks/useDebounce";
import { useTrackActiveScreen } from "@/hooks/useTrackActiveScreen";
import { fetchLibraryArticles } from "@/services/libraryService";
import { LibraryArticle } from "@/types/library.types";
import { capitalizeName } from "@/utils/capitalizeName";
import { Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  FlatList,
  Linking,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import LibrarySkelton from "@/components/LibrarySkeleton";

const screenWidth = Dimensions.get("window").width;
const WEBINAR = "Webinar";

const Library = () => {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchingMore, setFetchingMore] = useState<boolean>(false);
  const [start, setStart] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const debouncedQuery = useDebounce(searchQuery, 500);
  const { colors } = useBrandTheme();

  useTrackActiveScreen(ScreenPaths.LIBRARY);

  const fetchArticles = async (
    isInitial: boolean = false,
    debouncedQuery: string = ""
  ) => {
    if (!hasMore && !isInitial) return;

    if (isInitial) {
      setLoading(true);
      setStart(0);
      setHasMore(true);
    } else {
      setFetchingMore(true);
    }

    try {
      const data = await fetchLibraryArticles(isInitial, start, debouncedQuery);
      const newArticles: LibraryArticle[] = data;
      if (isInitial) {
        setArticles(newArticles);
      } else {
        setArticles((prev) => [...prev, ...newArticles]);
      }

      if (newArticles.length < LIBRARY_ARTICLE_FETCH_LIMIT) {
        setHasMore(false);
      } else {
        setStart((prev) => prev + LIBRARY_ARTICLE_FETCH_LIMIT);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (isInitial) {
        setLoading(false);
      } else {
        setFetchingMore(false);
      }
    }
  };

  useEffect(() => {
    const handleQuery = async () => {
      const trimmedQuery = debouncedQuery.trim();

      if (trimmedQuery.length === 0) {
        fetchArticles(true);
        return;
      }

      if (trimmedQuery.length < 3) return;

      fetchArticles(true, trimmedQuery);
    };

    handleQuery();
  }, [debouncedQuery]);

  /** Pull to refresh: reload the first page for the query currently applied. */
  const handleRefresh = async () => {
    const trimmedQuery = debouncedQuery.trim();
    setRefreshing(true);
    await fetchArticles(true, trimmedQuery.length >= 3 ? trimmedQuery : "");
    setRefreshing(false);
  };

  const renderArticle = ({
    item: article,
    index,
  }: {
    item: LibraryArticle;
    index: number;
  }) => {
    const isWebinar = article.content_name === WEBINAR;
    const label = isWebinar
      ? `ON-DEMAND ${article.content_name}`
      : article.content_name;
    const tags = [article.productAreaNames, article.industriesNames]
      .flatMap((names) => names?.split(",") ?? [])
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    return (
      <PressableCard
        onPress={() => Linking.openURL(ARTICLE_BASE_URL + article.url)}
        style={styles.card}
        accessibilityLabel={`library_article_${index}`}
      >
        <CardMeta icon="doc" label={label} date={article.date} />

        {/* Featured Image */}
        {article.featured_image ? (
          <RemoteFallbackImage
            source={article.featured_image}
            style={[styles.featuredImage, { backgroundColor: colors.card2 }]}
            resizeMode="cover"
          />
        ) : null}

        <Text style={[cardText.title, { color: colors.text }]}>
          {article.title}
        </Text>

        {/* Author */}
        <View style={styles.authorContainer}>
          <AuthorAvatar
            name={article.author}
            photoUri={
              article.author_img
                ? `${ARTICLE_BASE_URL}files/pictures/${article.author_img}`
                : undefined
            }
          />
          <View style={styles.authorTextContainer}>
            <Text style={[styles.author, { color: colors.text }]}>
              {capitalizeName(article.author)}
            </Text>
            <Text style={[styles.designation, { color: colors.text2 }]}>
              {`${article.author_designation} - ${article.author_company}` ||
                ""}
            </Text>
          </View>
        </View>

        {/* Tags */}
        {tags.length > 0 && (
          <View style={[styles.tagContainer, { borderTopColor: colors.line }]}>
            {tags.map((tag, idx) => (
              <View
                key={`tag-${idx}`}
                style={[styles.tag, { backgroundColor: colors.card2 }]}
              >
                <Text style={[styles.tagText, { color: colors.text }]}>
                  {tag}
                </Text>
              </View>
            ))}
          </View>
        )}
      </PressableCard>
    );
  };

  // The list is the screen's root so the native large title collapses as it scrolls, and
  // "automatic" insets it under the transparent bar and the search field and above the tab bar.
  return (
    <>
      <Stack.Screen
        options={{
          headerSearchBarOptions: {
            placeholder: "Search by keywords",
            onChangeText: (event) => setSearchQuery(event.nativeEvent.text),
            onCancelButtonPress: () => setSearchQuery(""),
            hideWhenScrolling: false,
            autoCapitalize: "none",
            tintColor: colors.accent,
            textColor: colors.text,
            hintTextColor: colors.text3,
            headerIconColor: colors.accent,
          },
        }}
      />
      <FlatList
        accessibilityLabel="library_flat_list"
        style={{ backgroundColor: colors.bg }}
        contentContainerStyle={styles.flatListContent}
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        data={loading && !refreshing ? [] : articles}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item, index }) => renderArticle({ item, index })}
        onEndReached={() => {
          if (!loading) fetchArticles(false);
        }}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.text2}
            colors={[colors.accent]}
            progressBackgroundColor={colors.card}
          />
        }
        ListFooterComponent={
          fetchingMore ? (
            <View style={styles.footerLoader}>
              <WheelLoader size={28} color={colors.text2} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          loading && !refreshing ? (
            <LibrarySkelton />
          ) : (
            <ContentEmptyView
              header={<BrandIcon name="search" size={28} color={colors.text} />}
              title="No search results found"
              titleAccessibilityLabel="library_empty_text"
              description="Try different keywords, or clear the search to see everything."
            />
          )
        }
      />
    </>
  );
};

export default Library;

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  featuredImage: {
    width: "100%",
    height: (screenWidth - 70) * (20 / 35),
    borderRadius: 14,
    marginTop: 14,
  },
  authorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 6,
    marginTop: 14,
  },
  authorTextContainer: {
    flex: 1,
  },
  author: {
    ...textStyle({ ...type.authorName, tracking: -0.01 }),
    marginBottom: 2,
  },
  designation: {
    ...textStyle({ ...type.authorRole, lineHeight: 1.4 }),
  },
  tagContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    borderTopWidth: 1,
    marginTop: 16,
    paddingTop: 14,
  },
  tag: {
    height: size.tagHeight,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    justifyContent: "center",
  },
  tagText: {
    ...textStyle({ size: 13, weight: 500 }),
  },
  flatListContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 24,
  },
  footerLoader: {
    alignItems: "center",
    marginVertical: 16,
  },
});
