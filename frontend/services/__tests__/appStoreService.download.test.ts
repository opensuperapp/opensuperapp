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

// The mirror of the removal case: an install has to reach the user's app list
// before the app's status flips, because the My Apps screen reconciles disk
// against that list and would uninstall an app it sees as installed but not
// entitled.

const mockCallOrder: string[] = [];

jest.mock("@/context/slices/appSlice", () => ({
  addDownloading: (appId: string) => ({ type: "addDownloading", payload: appId }),
  removeDownloading: (appId: string) => ({
    type: "removeDownloading",
    payload: appId,
  }),
  addRemoving: (appId: string) => ({ type: "addRemoving", payload: appId }),
  removeRemoving: (appId: string) => ({ type: "removeRemoving", payload: appId }),
  setApps: (apps: unknown) => ({ type: "setApps", payload: apps }),
  updateAppStatus: (payload: unknown) => ({ type: "updateAppStatus", payload }),
  updateDownloadProgress: (payload: unknown) => ({
    type: "updateDownloadProgress",
    payload,
  }),
}));

jest.mock("@/context/slices/authSlice", () => ({
  selectIsSignedIn: jest.fn(() => true),
}));
jest.mock("@/context/store", () => ({
  store: { getState: () => ({ auth: { userId: "user-1" } }) },
}));

jest.mock("@/utils/exchangedTokenRehydrator", () => ({
  buildAppsWithTokens: jest.fn(),
}));
jest.mock("@/utils/exchangedTokenStore", () => ({
  persistAppsWithoutTokens: jest.fn(),
}));
jest.mock("@/utils/requestHandler", () => ({ apiRequest: jest.fn() }));
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// One non-directory entry is enough for the extraction loop to do a full pass.
jest.mock("jszip", () => ({
  loadAsync: jest.fn(async () => ({
    files: { "index.html": { dir: false, async: async () => "" } },
  })),
}));

jest.mock("react-native", () => ({
  Alert: { alert: jest.fn() },
  Platform: { OS: "ios", select: (spec: Record<string, unknown>) => spec.ios },
}));

jest.mock("@/services/userConfigService", () => ({
  UpdateUserConfiguration: jest.fn(async (appId: string, status: string) => {
    mockCallOrder.push(`config:${status}`);
    return true;
  }),
}));

const mockDownloadFileAsync = jest.fn(async (..._args: unknown[]) => {
  mockCallOrder.push("download:zip");
});
const mockWrite = jest.fn();

jest.mock("expo-file-system", () => {
  class MockDirectory {
    exists = true;
    create = jest.fn();
  }
  class MockFile {
    // Delegated rather than assigned: a static initialiser runs while this
    // factory does, which is before the mock above is assigned.
    static downloadFileAsync(...args: unknown[]) {
      return mockDownloadFileAsync(...args);
    }
    exists = true;
    size = 1024;
    write = mockWrite;
    base64 = async () => "zip-bytes";
    text = async () =>
      JSON.stringify({
        clientId: "micro-app-client",
        requiredPermissions: ["location"],
      });
    get parentDirectory() {
      return new MockDirectory();
    }
  }
  return {
    Directory: MockDirectory,
    File: MockFile,
    Paths: {
      document: "doc",
      relative: jest.fn(() => "micro-apps/app-1-extracted/index.html"),
    },
  };
});

// Imported after the mocks so the module factories above see initialised
// helpers when the modules are first required.
/* eslint-disable import/first */
import { Alert } from "react-native";

import { DOWNLOADED, NOT_DOWNLOADED } from "@/constants/Constants";
import { downloadMicroApp } from "@/services/appStoreService";
import { UpdateUserConfiguration } from "@/services/userConfigService";

const downloadUrl = "https://api.example.com/micro-apps/app-1/build.zip";

// The progress updates in the download path are paced with a 100ms sleep each;
// running the callbacks inline keeps the ordering but not the wall clock.
const runTimeoutsInline = () =>
  jest
    .spyOn(global, "setTimeout")
    .mockImplementation(((callback: () => void) => {
      callback();
      return 0;
    }) as unknown as typeof setTimeout);

describe("downloadMicroApp", () => {
  beforeEach(() => {
    mockCallOrder.length = 0;
    jest.clearAllMocks();
    runTimeoutsInline();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("adds the app to the user config before the status flips", async () => {
    const dispatch = jest.fn((action: { type: string }) => {
      mockCallOrder.push(`dispatch:${action.type}`);
      return action;
    });

    const downloaded = await downloadMicroApp(
      dispatch as never,
      "app-1",
      downloadUrl
    );

    expect(downloaded).toBe(true);
    expect(UpdateUserConfiguration).toHaveBeenCalledWith(
      "app-1",
      DOWNLOADED
    );
    // Progress dispatches are dropped: they fire throughout and say nothing
    // about the ordering under test.
    expect(
      mockCallOrder.filter((step) => step !== "dispatch:updateDownloadProgress")
    ).toEqual([
      "dispatch:addDownloading",
      "download:zip",
      `config:${DOWNLOADED}`,
      "dispatch:updateAppStatus",
      "dispatch:removeDownloading",
    ]);
  });

  // The host enforces what the installed microapp.json declares, so the status
  // update that records the install has to carry it into the store.
  it("records the permissions the installed manifest declares", async () => {
    const dispatch = jest.fn((action: unknown) => action);

    await downloadMicroApp(dispatch as never, "app-1", downloadUrl);

    expect(dispatch).toHaveBeenCalledWith({
      type: "updateAppStatus",
      payload: expect.objectContaining({
        appId: "app-1",
        status: DOWNLOADED,
        requiredPermissions: ["location"],
      }),
    });
  });

  // A refused write has already rolled the list back, so the app is not
  // entitled. Flipping the status anyway leaves an install the sync effect
  // immediately uninstalls.
  it("leaves the status alone when the user config write is refused", async () => {
    (UpdateUserConfiguration as jest.Mock).mockResolvedValueOnce(false);
    const dispatch = jest.fn((action: { type: string }) => {
      mockCallOrder.push(`dispatch:${action.type}`);
      return action;
    });

    const downloaded = await downloadMicroApp(
      dispatch as never,
      "app-1",
      downloadUrl
    );

    expect(downloaded).toBe(false);
    expect(UpdateUserConfiguration).toHaveBeenCalledTimes(2);
    expect(UpdateUserConfiguration).toHaveBeenNthCalledWith(
      2,
      "app-1",
      NOT_DOWNLOADED
    );
    expect(
      mockCallOrder.filter((step) => step !== "dispatch:updateDownloadProgress")
    ).toEqual([
      "dispatch:addDownloading",
      "download:zip",
      `config:${NOT_DOWNLOADED}`,
      "dispatch:removeDownloading",
    ]);
    expect(Alert.alert).toHaveBeenCalledWith(
      "Error",
      "Failed to download or save the file."
    );
  });
});
