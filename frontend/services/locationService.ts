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
  DEFAULT_LOCATION_DISTANCE_INTERVAL_M,
  DEFAULT_LOCATION_TIME_INTERVAL_MS,
  LOCATION_TASK_NAME,
} from "@/constants/Constants";
import {
  LocationAccuracy,
  LocationFix,
  LocationRejectReason,
  LocationRequestOptions,
} from "@/types/microApp.types";
import {
  Accuracy,
  hasServicesEnabledAsync,
  hasStartedLocationUpdatesAsync,
  LocationObject,
  LocationSubscription,
  requestBackgroundPermissionsAsync,
  requestForegroundPermissionsAsync,
  startLocationUpdatesAsync,
  stopLocationUpdatesAsync,
  watchPositionAsync,
} from "expo-location";

const GRANTED = "granted";

/** Maps the bridge's coarse accuracy vocabulary onto expo-location's enum. */
const resolveAccuracy = (accuracy?: LocationAccuracy): Accuracy =>
  accuracy === "high" ? Accuracy.High : Accuracy.Balanced;

/** Normalises a raw expo-location reading into the shape the bridge promises micro apps. */
export const toLocationFix = (location: LocationObject): LocationFix => ({
  lat: location.coords.latitude,
  lng: location.coords.longitude,
  accuracy: location.coords.accuracy ?? -1,
  ts: new Date(location.timestamp).toISOString(),
});

/**
 * Acquires the OS permissions a stream needs.
 * @param needsBackground Whether the caller asked for background updates.
 * @returns A rejection reason, or `null` when the stream may proceed.
 */
export const ensureLocationPermissions = async (
  needsBackground: boolean
): Promise<LocationRejectReason | null> => {
  try {
    const { status } = await requestForegroundPermissionsAsync();
    if (status !== GRANTED) return "permission_denied";

    if (!(await hasServicesEnabledAsync())) return "services_disabled";

    if (needsBackground) {
      const background = await requestBackgroundPermissionsAsync();
      if (background.status !== GRANTED) return "permission_denied";
    }

    return null;
  } catch (error) {
    console.error("Failed to acquire location permissions:", error);
    return "unavailable";
  }
};

/**
 * Opens a foreground position stream.
 * @param options Options supplied by the micro app.
 * @param onFix Called for every fix while the app is in the foreground.
 * @returns The subscription, which the caller must remove when it stops.
 */
export const startForegroundLocationStream = async (
  options: LocationRequestOptions,
  onFix: (fix: LocationFix) => void
): Promise<LocationSubscription> =>
  watchPositionAsync(
    {
      accuracy: resolveAccuracy(options.accuracy),
      distanceInterval:
        options.distanceIntervalM ?? DEFAULT_LOCATION_DISTANCE_INTERVAL_M,
      timeInterval: options.timeIntervalMs ?? DEFAULT_LOCATION_TIME_INTERVAL_MS,
    },
    (location) => onFix(toLocationFix(location))
  );

/**
 * Starts the background task that keeps recording while the app is not in the foreground.
 * @param options Options supplied by the micro app.
 * @param appName Name of the micro app, shown in the Android foreground service notification.
 */
export const startBackgroundLocationUpdates = async (
  options: LocationRequestOptions,
  appName: string
) => {
  if (await hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)) return;

  await startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: resolveAccuracy(options.accuracy),
    distanceInterval:
      options.distanceIntervalM ?? DEFAULT_LOCATION_DISTANCE_INTERVAL_M,
    timeInterval: options.timeIntervalMs ?? DEFAULT_LOCATION_TIME_INTERVAL_MS,
    // iOS pauses updates when it decides the device is stationary. For a route that
    // includes long stops that reads as a dead phone, so opt out.
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    // Android only. Without it the OS kills location delivery shortly after the app
    // leaves the foreground.
    foregroundService: {
      notificationTitle: `${appName} is using your location`,
      notificationBody: "Tracking your position in the background.",
    },
  });
};

/** Stops the background task if it is running. Safe to call when it is not. */
export const stopBackgroundLocationUpdates = async () => {
  try {
    if (await hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)) {
      await stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }
  } catch (error) {
    console.error("Failed to stop background location updates:", error);
  }
};
