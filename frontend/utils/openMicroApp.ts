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
import { DOWNLOADED } from "@/constants/Constants";
import { ScreenPaths } from "@/constants/ScreenPaths";
import type { MicroApp } from "@/context/slices/appSlice";
import type { MicroAppParams } from "@/types/navigation";

/** The micro-app screen's route for an installed app. */
// Values are passed exactly as the app record holds them (the bridge always did), so
// an optional field the record lacks is simply absent from the route.
export type MicroAppRoute = {
  pathname: ScreenPaths.MICRO_APP;
  params: Partial<MicroAppParams>;
};

/** What openMicroApp needs from expo-router's router. */
export type MicroAppRouter = {
  push: (route: MicroAppRoute) => void;
  dismissAll?: () => void;
};

/**
 * The app with this id, if it is downloaded on this device; undefined when it is
 * unknown or not (yet) downloaded.
 */
export const findDownloadedMicroApp = (
  apps: MicroApp[],
  appId: string
): MicroApp | undefined => {
  const app = apps.find((candidate) => candidate.appId === appId);
  return app?.status === DOWNLOADED ? app : undefined;
};

/**
 * The route that opens `app`, handing it `launchData` (already a string: the micro
 * app reads it back with getLaunchData, which JSON-parses it when it can).
 */
export const microAppRoute = (
  app: MicroApp,
  launchData?: string
): MicroAppRoute => ({
  pathname: ScreenPaths.MICRO_APP,
  params: {
    webViewUri: app.webViewUri,
    appName: app.name,
    clientId: app.clientId,
    exchangedToken: app.exchangedToken,
    exchangedIdToken: app.exchangedIdToken,
    appId: app.appId,
    displayMode: app.displayMode,
    launchData,
  },
});

/**
 * Opens a downloaded micro app, the one way both the bridge (OPEN_MICRO_APP) and a
 * notification tap do it.
 *
 * @param dismissAll - Close the screens above the root first (the bridge does, so
 *   one micro app replaces another instead of stacking on it).
 * @returns Whether it was opened; false when the app is unknown or not downloaded,
 *   leaving what to do then (offer the store, fall back) to the caller.
 */
export const openMicroApp = ({
  router,
  apps,
  appId,
  launchData,
  dismissAll = false,
}: {
  router: MicroAppRouter;
  apps: MicroApp[];
  appId: string;
  launchData?: string;
  dismissAll?: boolean;
}): boolean => {
  const app = findDownloadedMicroApp(apps, appId);
  if (!app) return false;
  if (dismissAll) router.dismissAll?.();
  router.push(microAppRoute(app, launchData));
  return true;
};
