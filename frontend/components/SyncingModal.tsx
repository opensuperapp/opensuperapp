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
import {
  Modal,
  View,
  Text,
  ActivityIndicator,
  useColorScheme,
  StyleSheet,
} from "react-native";
import { Colors } from "@/constants/Colors";
import { ProgressBar } from "react-native-paper";

const SyncingModal = ({
  syncing,
  currentAction,
  progress,
}: {
  syncing: boolean;
  currentAction: string | null;
  progress: { done: number; total: number };
}) => {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme ?? "light");

  return (
    <Modal visible={syncing} transparent animationType="none">
      <View style={styles.container}>
        <Text style={styles.title}>Syncing Apps...</Text>

        {currentAction && (
          <Text style={styles.actionText}>{currentAction}</Text>
        )}

        <View style={styles.progress}>
          <ProgressBar
            progress={progress.done / progress.total}
            color={Colors.companyOrange}
            style={{
              borderRadius: 12,
              backgroundColor:
                Colors[colorScheme ?? "light"].secondaryBackgroundColor,
            }}
          />
        </View>

        <Text style={styles.waitText}>Please wait while we sync your apps</Text>

        <ActivityIndicator size="large" color={Colors.companyOrange} />
      </View>
    </Modal>
  );
};

export default SyncingModal;

const createStyles = (colorScheme: "light" | "dark") =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: Colors[colorScheme].primaryBackgroundColor,
    },
    title: {
      fontSize: 18,
      lineHeight: 28,
      fontWeight: "600",
      marginBottom: 16,
      color: Colors[colorScheme].text,
    },
    actionText: {
      fontSize: 14,
      lineHeight: 20,
      textAlign: "center",
      color: Colors[colorScheme].primaryTextColor,
    },
    progress: {
      width: "70%",
      marginVertical: 12,
    },
    waitText: {
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 24,
      textAlign: "center",
      color: Colors[colorScheme].primaryTextColor,
    },
  });
