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

import { useSyncExternalStore } from "react";

/**
 * Whether the app has put the user on their first screen after launch: the tab bar
 * restores the last tab once the session and visibility rules are known. Anything
 * that navigates on launch (a notification tap) waits for this, or that restore
 * would replace the screen it opened.
 */
let settled = false;
const listeners = new Set<() => void>();

export const isStartupRouteSettled = (): boolean => settled;

export const markStartupRouteSettled = (): void => {
  if (settled) return;
  settled = true;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const useIsStartupRouteSettled = (): boolean =>
  useSyncExternalStore(subscribe, isStartupRouteSettled);

export const resetStartupRouteForTests = (): void => {
  settled = false;
};
