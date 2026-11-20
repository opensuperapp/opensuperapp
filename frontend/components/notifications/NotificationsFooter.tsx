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
import WheelLoader from "@/components/brand/WheelLoader";
import { soraFamily, type ThemeColors } from "@/constants/brand";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import { StyleSheet, Text, View } from "react-native";

interface NotificationsFooterProps {
  isFetchingNextPage: boolean;
  hasMore: boolean;
}

export function NotificationsFooter({
  isFetchingNextPage,
  hasMore,
}: NotificationsFooterProps) {
  const { colors } = useBrandTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.footerContainer}>
      {isFetchingNextPage ? (
        <WheelLoader size={24} color={colors.text2} />
      ) : hasMore ? null : (
        <Text style={styles.footerText}>You're all caught up</Text>
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    footerContainer: {
      height: 50,
      alignItems: "center",
      justifyContent: "center",
    },
    footerText: {
      fontFamily: soraFamily[400],
      fontSize: 12,
      color: colors.text3,
    },
  });
