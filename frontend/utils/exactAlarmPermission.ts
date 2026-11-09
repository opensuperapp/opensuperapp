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
import { ALARM_PERMISSION_PROMPTED_KEY, isAndroid } from "@/constants/Constants";
import {
  canScheduleExactAlarms,
  openExactAlarmSettings,
} from "@/modules/exact-alarm";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Sends the user to this app's "Alarms & reminders" screen the first time
 * exact alarms turn out to be off, so scheduled sessions fire on time.
 * Never asks twice: the user's answer on that screen stands.
 */
export const promptForExactAlarmOnce = async (): Promise<void> => {
  if (!isAndroid) return;
  try {
    if (await AsyncStorage.getItem(ALARM_PERMISSION_PROMPTED_KEY)) return;
    if (!canScheduleExactAlarms()) {
      await AsyncStorage.setItem(ALARM_PERMISSION_PROMPTED_KEY, "true");
      openExactAlarmSettings();
    }
  } catch (error) {
    console.error("Error prompting for the exact-alarm permission:", error);
  }
};
