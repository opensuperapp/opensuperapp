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
import RemoteFallbackImage from "@/components/RemoteFallbackImage";
import SearchBar from "@/components/SearchBar";
import { Colors } from "@/constants/Colors";
import {
  ARTICLE_BASE_URL,
  LIBRARY_ARTICLE_FETCH_LIMIT,
} from "@/constants/Constants";
import { ScreenPaths } from "@/constants/ScreenPaths";
import useDebounce from "@/hooks/useDebounce";
import useNetworkQuality from "@/hooks/useNetworkQuality";
import { useTrackActiveScreen } from "@/hooks/useTrackActiveScreen";
import { fetchLibraryArticles } from "@/services/libraryService";
import { LibraryArticle } from "@/types/library.types";
import { capitalizeName } from "@/utils/capitalizeName";
import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import LibrarySkelton from "../../components/LibrarySkeleton";

const screenWidth = Dimensions.get("window").width;
const WEBINAR = "Webinar";

const Library = () => {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchingMore, setFetchingMore] = useState<boolean>(false);
  const [start, setStart] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const debouncedQuery = useDebounce(searchQuery, 500);
  const networkQuality = useNetworkQuality();
  const tabBarHeight: number = useBottomTabBarHeight();
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme ?? "light", tabBarHeight);

  useTrackActiveScreen(ScreenPaths.LIBRARY);

  const fetchArticles = async (
    isInitial: boolean = false,
    debouncedQuery: string = ""
  ) => {
    if (!hasMore && !isInitial) return;

    if (isInitial) {
      setLoading(true);
      setStart(0);
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

  const renderArticle = ({
    item: article,
    index,
  }: {
    item: LibraryArticle;
    index: number;
  }) => {
    const isWebinar = article.content_name === WEBINAR;
    const iconName = isWebinar ? "videocam-outline" : "reader-outline";
    const label = isWebinar
      ? `ON-DEMAND ${article.content_name?.toUpperCase()}`
      : article.content_name?.toUpperCase();

    return (
      <TouchableOpacity
        onPress={() => Linking.openURL(ARTICLE_BASE_URL + article.url)}
        style={styles.card}
        activeOpacity={0.8}
        accessibilityLabel={`library_article_${index}`}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name={iconName} size={16} color="#919191" />
            <Text style={styles.type}>{label}</Text>
          </View>
          <Text style={styles.date}>{article.date?.toUpperCase()}</Text>
        </View>

        {/* Featured Image */}
        {article.featured_image ? (
          <RemoteFallbackImage
            source={article.featured_image}
            style={styles.featuredImage}
            resizeMode="cover"
          />
        ) : null}

        {/* Title */}
        <Text style={styles.title}>{article.title}</Text>

        {/* Author */}
        <View style={styles.authorContainer}>
          {article.author_img && (
            <Image
              source={{
                uri: `${ARTICLE_BASE_URL}files/pictures/${article.author_img}`,
              }}
              style={styles.authorImage}
              resizeMode="cover"
            />
          )}
          <View style={styles.authorTextContainer}>
            <Text style={styles.author}>{capitalizeName(article.author)}</Text>
            <Text style={styles.designation}>
              {`${article.author_designation} - ${article.author_company}` ||
                ""}
            </Text>
          </View>
        </View>

        {/* Tags */}
        <View style={styles.tagContainer}>
          {article.productAreaNames
            ?.split(",")
            .map((tag: string) => tag.trim())
            .filter((tag: string) => tag.length > 0)
            .map((tag: string, idx: number) => (
              <View key={`product-${idx}`} style={styles.tagProductAreaNames}>
                <Text style={styles.tagTextProductAreaNames}>{tag}</Text>
              </View>
            ))}

          {article.industriesNames
            ?.split(",")
            .map((tag: string) => tag.trim())
            .filter((tag: string) => tag.length > 0)
            .map((tag: string, idx: number) => (
              <View key={`industry-${idx}`} style={styles.tagIndustriesNames}>
                <Text style={styles.tagTextIndustriesNames}>{tag}</Text>
              </View>
            ))}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <SearchBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        placeholder="Search by keywords"
      />

      {!loading && networkQuality === "offline" && (
        <View style={styles.offlineMessage}>
          <Text style={styles.offlineText}>
            You're offline. Showing cached content.
          </Text>
        </View>
      )}

      {loading ? (
        <LibrarySkelton />
      ) : (
        <FlatList
          accessibilityLabel="library_flat_list"
          contentContainerStyle={styles.flatListContent}
          data={articles}
          keyExtractor={(_, index) => index.toString()}
          renderItem={({ item, index }) => renderArticle({ item, index })}
          onEndReached={() => fetchArticles(false)}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            fetchingMore ? (
              <ActivityIndicator
                size="small"
                color={Colors[colorScheme ?? "light"].text}
                style={styles.footerLoader}
              />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text
                style={styles.emptyText}
                accessibilityLabel="library_empty_text"
              >
                No search results found
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

export default Library;

const createStyles = (colorScheme: "light" | "dark", tabBarHeight: number) =>
  StyleSheet.create({
    card: {
      backgroundColor: Colors[colorScheme].libraryCardBackgroundColor,
      borderRadius: 14,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor:
        colorScheme === "light"
          ? Colors.light.secondaryBackgroundColor
          : "transparent",
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
    type: {
      color: "#919191",
      fontSize: 12,
      fontWeight: "500",
      marginLeft: 4,
    },
    date: {
      color: Colors[colorScheme ?? "light"].mutedTextColor,
      fontSize: 12,
    },
    featuredImage: {
      width: "100%",
      height: (screenWidth - 96) * (20 / 35),
      borderRadius: 12,
      marginBottom: 14,
    },
    title: {
      color: Colors[colorScheme].text,
      fontSize: 18,
      fontWeight: "600",
      marginBottom: 18,
    },
    authorContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 18,
    },
    authorImage: {
      width: 40,
      height: 40,
      borderRadius: 30,
      borderWidth: 0.5,
      borderColor:
        colorScheme === "light"
          ? Colors.light.secondaryBackgroundColor
          : "transparent",
    },
    authorTextContainer: {
      width: "80%",
    },
    author: {
      color: Colors[colorScheme ?? "light"].mutedTextColor,
      fontSize: 14,
      fontWeight: "600",
      marginBottom: 2,
    },
    designation: {
      color: Colors[colorScheme ?? "light"].mutedTextColor,
      fontSize: 12,
    },
    tagContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      borderTopColor: Colors[colorScheme].primaryTextColor,
      borderTopWidth: 0.25,
      paddingTop: 12,
    },
    tagProductAreaNames: {
      backgroundColor: "#DDD",
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      marginRight: 2,
      marginBottom: 4,
    },
    tagIndustriesNames: {
      backgroundColor: "#333",
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      marginRight: 2,
      marginBottom: 4,
    },
    tagTextProductAreaNames: {
      color: "#333",
      fontSize: 12,
    },
    tagTextIndustriesNames: {
      color: "#DDD",
      fontSize: 12,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: Colors[colorScheme].primaryBackgroundColor,
    },
    loader: {
      width: "20%",
      height: 100,
    },
    container: {
      backgroundColor: Colors[colorScheme].primaryBackgroundColor,
      paddingBottom: tabBarHeight,
    },
    flatListContent: {
      padding: 16,
      paddingBottom: tabBarHeight,
    },
    footerLoader: {
      marginVertical: 16,
    },
    emptyContainer: {
      flex: 1,
      alignItems: "center",
      paddingHorizontal: 40,
      marginTop: 24,
    },
    emptyText: {
      color: Colors[colorScheme].secondaryTextColor,
      fontSize: 16,
      textAlign: "center",
    },
    offlineMessage: {
      backgroundColor: Colors[colorScheme].ternaryBackgroundColor,
      padding: 12,
      borderRadius: 8,
      marginHorizontal: 16,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: Colors.companyOrange,
    },
    offlineText: {
      color: Colors[colorScheme].primaryTextColor,
      fontSize: 14,
      textAlign: "center",
    },
  });
