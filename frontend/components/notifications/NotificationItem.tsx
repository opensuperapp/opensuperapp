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
import BrandIcon from "@/components/brand/BrandIcon";
import { radius, soraFamily, type ThemeColors } from "@/constants/brand";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import { Notification } from "@/hooks/useNotifications";
import { formatNotificationDate } from "@/utils/date";
import { StyleSheet, Text, View } from "react-native";

interface Props {
  item: Notification;
  isNew: boolean;
}

export function NotificationItem({ item, isNew }: Props) {
  const { colors } = useBrandTheme();
  const styles = createStyles(colors);

  return (
    <View style={[styles.container, isNew && styles.containerNew]}>
      <View style={styles.iconContainer}>
        <BrandIcon name="bell" size={20} color={colors.text} />
      </View>

      <View style={{ flex: 1, gap: 4 }}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{item.title}</Text>
          {isNew && <View style={styles.newDot} />}
        </View>
        <Text style={styles.message}>{item.message}</Text>
        <Text style={[styles.date, isNew && styles.newDate]}>
          {formatNotificationDate(item.createdAt)}
        </Text>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      padding: 16,
      gap: 12,
      alignItems: "flex-start",
      backgroundColor: colors.card,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: colors.line,
    },
    containerNew: {
      borderColor: colors.line2,
    },
    iconContainer: {
      backgroundColor: colors.card2,
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    title: {
      fontFamily: soraFamily[600],
      fontSize: 16,
      letterSpacing: -0.32,
      color: colors.text,
      flex: 1,
    },
    newDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.cobalt,
    },
    message: {
      fontFamily: soraFamily[400],
      fontSize: 14,
      lineHeight: 20,
      color: colors.text2,
    },
    date: {
      fontFamily: soraFamily[400],
      fontSize: 12,
      color: colors.text3,
    },
    newDate: {
      fontFamily: soraFamily[500],
      color: colors.cobalt,
    },
  });
