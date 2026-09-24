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

// Regression cover for issue #87: removing an app used to reinstall it. The My
// Apps screen reconciles disk against the user's app list on every `apps`
// change, so a removal that flips the app's status before the list drops the
// app looks to it like a missing install.

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
jest.mock("jszip", () => ({ loadAsync: jest.fn() }));

jest.mock("react-native", () => ({
  Alert: { alert: jest.fn() },
  Platform: { OS: "ios", select: (spec: Record<string, unknown>) => spec.ios },
}));

jest.mock("@/services/userConfigService", () => ({
  UpdateUserConfiguration: jest.fn(async (appId: string, status: string) => {
    mockCallOrder.push(`config:${status}`);
  }),
}));

const mockDeleteDirectory = jest.fn(() => mockCallOrder.push("delete:dir"));
const mockDeleteFile = jest.fn(() => mockCallOrder.push("delete:zip"));

jest.mock("expo-file-system", () => {
  class MockDirectory {
    exists = true;
    delete = mockDeleteDirectory;
  }
  class MockFile {
    exists = true;
    delete = mockDeleteFile;
  }
  return {
    Directory: MockDirectory,
    File: MockFile,
    Paths: { document: "doc", relative: jest.fn(() => "index.html") },
  };
});

// Imported after the mocks so the module factories above see initialised
// helpers when the modules are first required.
/* eslint-disable import/first */
import { NOT_DOWNLOADED } from "@/constants/Constants";
import { removeMicroApp } from "@/services/appStoreService";
import { UpdateUserConfiguration } from "@/services/userConfigService";

const logout = jest.fn(async () => {});

describe("removeMicroApp", () => {
  beforeEach(() => {
    mockCallOrder.length = 0;
    jest.clearAllMocks();
  });

  it("drops the app from the user config before the status flips or files go", async () => {
    const dispatch = jest.fn((action: { type: string }) => {
      mockCallOrder.push(`dispatch:${action.type}`);
      return action;
    });

    await removeMicroApp(dispatch as never, "app-1", logout);

    expect(UpdateUserConfiguration).toHaveBeenCalledWith(
      "app-1",
      NOT_DOWNLOADED,
      logout
    );
    expect(mockCallOrder).toEqual([
      "dispatch:addRemoving",
      `config:${NOT_DOWNLOADED}`,
      "delete:dir",
      "delete:zip",
      "dispatch:updateAppStatus",
      "dispatch:removeRemoving",
    ]);
  });

  it("clears the removing flag even when the removal fails", async () => {
    (UpdateUserConfiguration as jest.Mock).mockRejectedValueOnce(
      new Error("network down")
    );
    const dispatched: string[] = [];
    const dispatch = jest.fn((action: { type: string }) => {
      dispatched.push(action.type);
      return action;
    });

    await removeMicroApp(dispatch as never, "app-1", logout);

    expect(dispatched).toEqual(["addRemoving", "removeRemoving"]);
  });
});
