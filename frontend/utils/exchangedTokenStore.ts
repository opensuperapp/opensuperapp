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
import { APPS } from "@/constants/Constants";
import { MicroApp } from "@/context/slices/appSlice";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { deleteItemAsync, getItemAsync, setItemAsync } from "expo-secure-store";

const KEY = (appId: string) => `exchangedToken_${appId}`;

export async function saveExchangedToken(appId: string, token: string) {
  await setItemAsync(KEY(appId), token);
}

export async function loadExchangedToken(appId: string) {
  return await getItemAsync(KEY(appId));
}

export async function deleteExchangedToken(appId: string) {
  await deleteItemAsync(KEY(appId));
}

export async function clearAllExchangedTokens(appIds: string[]) {
  await Promise.all(appIds.map((id) => deleteItemAsync(KEY(id))));
}

/** Save apps to AsyncStorage with exchangedToken stripped */
export async function persistAppsWithoutTokens(apps: MicroApp[]) {
  const sanitized = apps.map((a) => ({ ...a, exchangedToken: "" }));
  await AsyncStorage.setItem(APPS, JSON.stringify(sanitized));
}
