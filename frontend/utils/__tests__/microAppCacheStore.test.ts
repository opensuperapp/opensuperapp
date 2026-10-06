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
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
// Mocked to avoid pulling in @reduxjs/toolkit's ESM `immer` dependency, which
// this project's Jest transform isn't configured for (untested territory —
// no prior test imported a Redux slice). setApps is a plain action creator;
// this stub mirrors its shape exactly.
jest.mock("@/context/slices/appSlice", () => ({
  setApps: (apps: unknown) => ({ type: "apps/setApps", payload: apps }),
}));
// jest-expo's default expo-file-system mock only covers the legacy
// functional API (deleteAsync, documentDirectory, ...); this project's code
// uses the newer Directory/Paths class API, so it's stubbed here instead.
const mockDirectoryDelete = jest.fn();
const mockDirectoryExists = jest.fn(() => true);
jest.mock("expo-file-system", () => {
  class Directory {
    constructor(..._parts: unknown[]) {}
    get exists() {
      return mockDirectoryExists();
    }
    delete() {
      mockDirectoryDelete();
    }
  }
  return { Directory, Paths: { document: "file:///doc/" } };
});

import { APPS, LAST_LOGGED_IN_USER_ID_KEY } from "@/constants/Constants";
import { setApps } from "@/context/slices/appSlice";
import { syncMicroAppCacheForUser } from "@/utils/microAppCacheStore";
import AsyncStorage from "@react-native-async-storage/async-storage";

describe("syncMicroAppCacheForUser", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockDirectoryDelete.mockClear();
    mockDirectoryExists.mockClear().mockReturnValue(true);
  });

  it("first login on this device (no stored userId): saves the userId, clears nothing", async () => {
    const dispatch = jest.fn();

    await syncMicroAppCacheForUser(dispatch, "user-alice");

    expect(await AsyncStorage.getItem(LAST_LOGGED_IN_USER_ID_KEY)).toBe(
      "user-alice"
    );
    expect(mockDirectoryDelete).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("same user re-logging in: keeps the cache, doesn't clear downloaded apps", async () => {
    await AsyncStorage.setItem(LAST_LOGGED_IN_USER_ID_KEY, "user-alice");
    await AsyncStorage.setItem(APPS, JSON.stringify([{ appId: "app-1" }]));
    const dispatch = jest.fn();

    await syncMicroAppCacheForUser(dispatch, "user-alice");

    expect(await AsyncStorage.getItem(LAST_LOGGED_IN_USER_ID_KEY)).toBe(
      "user-alice"
    );
    expect(await AsyncStorage.getItem(APPS)).not.toBeNull();
    expect(mockDirectoryDelete).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("different user logging in: clears the previous user's downloaded apps", async () => {
    await AsyncStorage.setItem(LAST_LOGGED_IN_USER_ID_KEY, "user-alice");
    await AsyncStorage.setItem(APPS, JSON.stringify([{ appId: "app-1" }]));
    const dispatch = jest.fn();

    await syncMicroAppCacheForUser(dispatch, "user-bob");

    expect(await AsyncStorage.getItem(LAST_LOGGED_IN_USER_ID_KEY)).toBe(
      "user-bob"
    );
    expect(await AsyncStorage.getItem(APPS)).toBeNull();
    expect(mockDirectoryDelete).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(setApps([]));
  });

  it("never throws, even if storage access fails — and fails closed by clearing the cache", async () => {
    await AsyncStorage.setItem(LAST_LOGGED_IN_USER_ID_KEY, "user-alice");
    await AsyncStorage.setItem(APPS, JSON.stringify([{ appId: "app-1" }]));
    jest
      .spyOn(AsyncStorage, "getItem")
      .mockRejectedValueOnce(new Error("storage unavailable"));
    const dispatch = jest.fn();

    await expect(
      syncMicroAppCacheForUser(dispatch, "user-bob")
    ).resolves.toBeUndefined();

    // Can't verify whose cache this is, so it fails closed: clear rather
    // than risk showing a previous user's downloaded apps.
    expect(mockDirectoryDelete).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(setApps([]));
  });

  it("does not throw even when the fail-closed cleanup itself fails", async () => {
    jest
      .spyOn(AsyncStorage, "getItem")
      .mockRejectedValueOnce(new Error("storage unavailable"));
    mockDirectoryDelete.mockImplementationOnce(() => {
      throw new Error("delete failed");
    });
    const dispatch = jest.fn();

    await expect(
      syncMicroAppCacheForUser(dispatch, "user-bob")
    ).resolves.toBeUndefined();
  });
});
