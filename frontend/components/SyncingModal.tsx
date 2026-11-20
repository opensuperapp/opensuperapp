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
import { soraFamily, type ThemeColors } from "@/constants/brand";
import { Colors } from "@/constants/Colors";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import { ActivityIndicator, Modal, StyleSheet, Text, View } from "react-native";
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
  const { colors } = useBrandTheme();
  const styles = createStyles(colors);

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
              backgroundColor: colors.card2,
            }}
          />
        </View>

        <Text style={styles.waitText}>Please wait while we sync your apps</Text>

        <ActivityIndicator size="large" color={colors.text2} />
      </View>
    </Modal>
  );
};

export default SyncingModal;

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.bg,
    },
    title: {
      fontFamily: soraFamily[600],
      fontSize: 18,
      lineHeight: 28,
      marginBottom: 16,
      color: colors.text,
    },
    actionText: {
      fontFamily: soraFamily[400],
      fontSize: 14,
      lineHeight: 20,
      textAlign: "center",
      color: colors.text2,
    },
    progress: {
      width: "70%",
      marginVertical: 12,
    },
    waitText: {
      fontFamily: soraFamily[400],
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 24,
      textAlign: "center",
      color: colors.text2,
    },
  });
