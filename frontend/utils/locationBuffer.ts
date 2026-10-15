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
  LOCATION_BUFFER_KEY,
  LOCATION_BUFFER_MAX_FIXES,
} from "@/constants/Constants";
import { LocationFix } from "@/types/microApp.types";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * A bounded ring buffer of position fixes recorded while the super app was
 * backgrounded and the WebView's JS was suspended.
 *
 * Written by the TaskManager background task, read by the micro app host when the
 * app returns to the foreground. AsyncStorage is used rather than memory because a
 * background task may run in a headless JS instance that does not share memory with
 * the UI instance.
 */

/** Reads the buffer, tolerating a corrupt or absent value. */
const readBuffer = async (): Promise<LocationFix[]> => {
  try {
    const raw = await AsyncStorage.getItem(LOCATION_BUFFER_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LocationFix[]) : [];
  } catch (error) {
    console.error("Failed to read the location buffer:", error);
    return [];
  }
};

/**
 * Appends fixes to the buffer, dropping the oldest once the cap is reached.
 * @param fixes Fixes to append, oldest first.
 */
export const appendLocationFixes = async (fixes: LocationFix[]) => {
  if (fixes.length === 0) return;

  try {
    const buffered = [...(await readBuffer()), ...fixes];
    // Drop from the head: on a long drive the newest fixes matter most, and the
    // consumer can still reconstruct the recent track.
    const bounded = buffered.slice(-LOCATION_BUFFER_MAX_FIXES);
    await AsyncStorage.setItem(LOCATION_BUFFER_KEY, JSON.stringify(bounded));
  } catch (error) {
    console.error("Failed to append to the location buffer:", error);
  }
};

/**
 * Removes and returns every buffered fix, oldest first.
 *
 * Only the fixes actually returned are removed; anything the background task appends
 * while the drain is in flight survives for the next drain.
 * @returns The drained fixes, oldest first.
 */
export const drainLocationBuffer = async (): Promise<LocationFix[]> => {
  try {
    const drained = await readBuffer();
    if (drained.length === 0) return [];

    const drainedKeys = new Set(drained.map((fix) => fix.ts));
    const remaining = (await readBuffer()).filter(
      (fix) => !drainedKeys.has(fix.ts)
    );
    await AsyncStorage.setItem(LOCATION_BUFFER_KEY, JSON.stringify(remaining));

    return drained;
  } catch (error) {
    console.error("Failed to drain the location buffer:", error);
    return [];
  }
};

/** Discards the buffer. Called when a stream stops so a later stream cannot replay a stale track. */
export const clearLocationBuffer = async () => {
  try {
    await AsyncStorage.removeItem(LOCATION_BUFFER_KEY);
  } catch (error) {
    console.error("Failed to clear the location buffer:", error);
  }
};
