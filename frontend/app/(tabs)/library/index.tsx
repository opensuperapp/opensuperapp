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
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { useTrackActiveScreen } from "@/hooks/useTrackActiveScreen";
import { fetchLibraryArticles } from "@/services/libraryService";
import { LibraryArticle } from "@/types/library.types";
import { capitalizeName } from "@/utils/capitalizeName";
import { Stack } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import LibrarySkelton from "@/components/LibrarySkeleton";

const WEBINAR = "Webinar";
const LIST_PADDING = 16;
const GRID_GAP = 12;
// Wider cap for the two-column grid on expanded windows.
const GRID_MAX_CONTENT_WIDTH = 1080;

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
  const { width, maxContentWidth, columns } = useResponsiveLayout();
  const numColumns = columns({ compact: 1, medium: 1, expanded: 2 });
  const listMaxWidth =
    numColumns > 1 ? GRID_MAX_CONTENT_WIDTH : maxContentWidth;
  // Measured list width wins over the window: a side rail/sidebar (unfolded
  // Duo, iPad) narrows the list below the window width.
  const [listWidth, setListWidth] = useState<number | null>(null);
  const availableWidth = Math.min(listWidth ?? width, listMaxWidth);
  const gridItemWidth =
    numColumns > 1
      ? (availableWidth - 2 * LIST_PADDING - GRID_GAP) / numColumns
      : undefined;

  useTrackActiveScreen(ScreenPaths.LIBRARY);

  // Bumped by every first-page load (search or refresh). A response from an
  // older generation is dropped, so a pending page can't move the new cursor.
  const requestGeneration = useRef(0);
  // The query whose first page is on screen. Refresh and paging reuse it, so a
  // short edit the search ignores doesn't swap in unfiltered articles.
  const appliedQuery = useRef("");
  // Held by the next-page request in flight. onEndReached can fire again before
  // it settles; a second request would fetch and append the same page.
  const pageRequest = useRef<object | null>(null);

  const fetchArticles = async (
    isInitial: boolean = false,
    debouncedQuery: string = ""
  ) => {
    if (!hasMore && !isInitial) return;
    if (!isInitial && pageRequest.current) return;

    const generation = isInitial
      ? ++requestGeneration.current
      : requestGeneration.current;
    const pageToken = isInitial ? null : {};

    if (isInitial) {
      // The pending page belongs to the old generation and will be dropped.
      pageRequest.current = null;
      setFetchingMore(false);
      setLoading(true);
    } else {
      pageRequest.current = pageToken;
      setFetchingMore(true);
    }

    try {
      const data = await fetchLibraryArticles(isInitial, start, debouncedQuery);
      if (generation !== requestGeneration.current) return;

      const newArticles: LibraryArticle[] = data;
      if (isInitial) {
        appliedQuery.current = debouncedQuery;
        setArticles(newArticles);
      } else {
        setArticles((prev) => [...prev, ...newArticles]);
      }

      // Commit the cursor with the accepted data; a failed reload keeps the
      // cursor that belongs to the articles still on screen.
      const fullPage = newArticles.length >= LIBRARY_ARTICLE_FETCH_LIMIT;
      setStart(
        (prev) =>
          (isInitial ? 0 : prev) + (fullPage ? LIBRARY_ARTICLE_FETCH_LIMIT : 0)
      );
      setHasMore(fullPage);
    } catch (err) {
      console.error(err);
    } finally {
      if (!isInitial) {
        if (pageRequest.current === pageToken) {
          pageRequest.current = null;
          setFetchingMore(false);
        }
      } else if (generation === requestGeneration.current) {
        setLoading(false);
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
    const query =
      trimmedQuery.length === 0
        ? ""
        : trimmedQuery.length >= 3
          ? trimmedQuery
          : appliedQuery.current;
    setRefreshing(true);
    await fetchArticles(true, query);
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
        style={[styles.card, gridItemWidth ? { width: gridItemWidth } : null]}
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
        // numColumns cannot change on the fly; remount when it does.
        key={`library-columns-${numColumns}`}
        accessibilityLabel="library_flat_list"
        style={{ backgroundColor: colors.bg }}
        onLayout={(e) => setListWidth(e.nativeEvent.layout.width)}
        contentContainerStyle={[
          styles.flatListContent,
          { maxWidth: listMaxWidth },
        ]}
        numColumns={numColumns}
        columnWrapperStyle={numColumns > 1 ? styles.gridRow : undefined}
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        data={loading && !refreshing ? [] : articles}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item, index }) => renderArticle({ item, index })}
        onEndReached={() => {
          if (!loading) fetchArticles(false, appliedQuery.current);
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
              <ActivityIndicator size="small" color={colors.text2} />
            </View>
          ) : undefined
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
    // Same height as before on a phone, and scales with the card in the grid.
    aspectRatio: 35 / 20,
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
    paddingHorizontal: LIST_PADDING,
    paddingTop: 4,
    paddingBottom: 24,
    width: "100%",
    alignSelf: "center",
  },
  gridRow: {
    gap: GRID_GAP,
  },
  footerLoader: {
    alignItems: "center",
    marginVertical: 16,
  },
});
