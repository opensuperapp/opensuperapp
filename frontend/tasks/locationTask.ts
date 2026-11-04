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
import { LOCATION_TASK_NAME } from "@/constants/Constants";
import { LocationFix } from "@/types/microApp.types";
import { appendLocationFixes } from "@/utils/locationBuffer";
import { LocationObject } from "expo-location";
import * as TaskManager from "expo-task-manager";
import { AppState } from "react-native";

/**
 * Background location task.
 *
 * The WebView's JS is suspended while the super app is backgrounded, so a micro app
 * cannot receive fixes directly. This task keeps the sensor running and parks each
 * fix in a bounded buffer; the micro app host flushes the buffer when the app
 * returns to the foreground.
 *
 * IMPORTANT: this module is imported from `app/_layout.tsx` so the task is defined
 * on every JS start. The OS can relaunch the app headlessly to deliver a fix, and in
 * that launch no screen is mounted - registering the task from `micro-app.tsx` would
 * mean the task is undefined exactly when it is needed.
 */
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error("Background location task error:", error.message);
    return;
  }

  // The task also fires while the app is in the foreground, where the watch already
  // delivers each fix live. Buffering those too would replay them on the next resume,
  // and the timestamp dedup misses any whose reading differs from the watch's by a few
  // milliseconds. A headless launch is never "active", so it still buffers.
  if (AppState.currentState === "active") return;

  const locations = (data as { locations?: LocationObject[] })?.locations;
  if (!locations?.length) return;

  const fixes: LocationFix[] = locations.map((location) => ({
    lat: location.coords.latitude,
    lng: location.coords.longitude,
    accuracy: location.coords.accuracy ?? -1,
    ts: new Date(location.timestamp).toISOString(),
  }));

  await appendLocationFixes(fixes);
});
