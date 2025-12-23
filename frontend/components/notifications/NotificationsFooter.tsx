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
import { Colors } from "@/constants/Colors";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";

interface NotificationsFooterProps {
  isFetchingNextPage: boolean;
  hasMore: boolean;
}

export function NotificationsFooter({
  isFetchingNextPage,
  hasMore,
}: NotificationsFooterProps) {
  const colorScheme = useColorScheme() ?? "light";
  const styles = createStyles(colorScheme);

  return (
    <View style={styles.footerContainer}>
      {isFetchingNextPage ? (
        <ActivityIndicator size="small" />
      ) : hasMore ? null : (
        <Text style={styles.footerText}>You're all caught up! 🎉</Text>
      )}
    </View>
  );
}

const createStyles = (colorScheme: "light" | "dark") =>
  StyleSheet.create({
    footerContainer: {
      height: 50,
      alignItems: "center",
      justifyContent: "center",
    },
    footerText: {
      fontSize: 12,
      color: Colors[colorScheme].text,
    },
  });
