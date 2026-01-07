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
import { Styles } from "@/constants/Styles";
import { Notification } from "@/hooks/useNotifications";
import { formatNotificationDate } from "@/utils/date";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, useColorScheme, View } from "react-native";

interface Props {
  item: Notification;
  isNew: boolean;
}

export function NotificationItem({ item, isNew }: Props) {
  const colorScheme = useColorScheme() ?? "light";
  const styles = createStyles(colorScheme);

  return (
    <View
      style={[
        {
          backgroundColor: isNew
            ? Colors.companyOrange15
            : Colors[colorScheme].primaryBackgroundColor,
        },
        styles.container,
      ]}
    >
      <View style={styles.iconContainer}>
        <Ionicons name="notifications" size={20} color={Colors.companyOrange} />
      </View>

      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.message}>{item.message}</Text>
        <Text style={[styles.date, isNew && styles.newDate]}>
          {formatNotificationDate(item.createdAt)}
        </Text>
      </View>
    </View>
  );
}

const createStyles = (colorScheme: "light" | "dark") =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      padding: Styles.Padding.default,
      gap: 12,
      alignItems: "flex-start",
      borderBottomWidth: 1,
      borderBottomColor: Colors[colorScheme].borderColor,
    },
    iconContainer: {
      backgroundColor: Colors.companyOrange20,
      width: 36,
      height: 36,
      borderRadius: Styles.BorderRadius.medium,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      fontSize: 16,
      fontWeight: "600",
      color: Colors[colorScheme].text,
      flex: 1,
    },
    message: {
      fontSize: 14,
      color: Colors[colorScheme].primaryTextColor,
      lineHeight: 20,
    },
    date: {
      fontSize: 10,
      color: Colors[colorScheme].text,
    },
    newDate: {
      fontSize: 12,
      fontWeight: "600",
    },
  });
