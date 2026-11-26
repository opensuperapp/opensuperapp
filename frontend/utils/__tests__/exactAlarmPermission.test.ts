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
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  canScheduleExactAlarms,
  openExactAlarmSettings,
} from "@/modules/exact-alarm";
import { promptForExactAlarmOnce } from "@/utils/exactAlarmPermission";

jest.mock("@react-native-async-storage/async-storage", () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

const mockPlatform = { isAndroid: true };
jest.mock("@/constants/Constants", () => ({
  ALARM_PERMISSION_PROMPTED_KEY: "alarm_permission_prompted",
  get isAndroid() {
    return mockPlatform.isAndroid;
  },
}));

// The native module both checks and opens the screen, using the package name
// Android reports, so JS never builds the settings intent itself.
jest.mock("@/modules/exact-alarm", () => ({
  canScheduleExactAlarms: jest.fn(() => false),
  openExactAlarmSettings: jest.fn(),
}));

const openSettings = openExactAlarmSettings as jest.Mock;
const canSchedule = canScheduleExactAlarms as jest.Mock;

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  mockPlatform.isAndroid = true;
  canSchedule.mockReturnValue(false);
});

describe("promptForExactAlarmOnce", () => {
  it("opens this app's Alarms & reminders screen when exact alarms are off", async () => {
    await promptForExactAlarmOnce();

    expect(openSettings).toHaveBeenCalledTimes(1);
  });

  it("leaves the user alone when exact alarms are already allowed", async () => {
    canSchedule.mockReturnValue(true);

    await promptForExactAlarmOnce();

    expect(openSettings).not.toHaveBeenCalled();
  });

  it("asks only once, even if the user left exact alarms off", async () => {
    await promptForExactAlarmOnce();
    await promptForExactAlarmOnce();

    expect(openSettings).toHaveBeenCalledTimes(1);
  });

  it("does nothing on iOS, which has no exact-alarm permission", async () => {
    mockPlatform.isAndroid = false;

    await promptForExactAlarmOnce();

    expect(canSchedule).not.toHaveBeenCalled();
    expect(openSettings).not.toHaveBeenCalled();
  });

  it("does not throw when the settings screen can't be opened", async () => {
    openSettings.mockImplementationOnce(() => {
      throw new Error("no activity");
    });
    jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(promptForExactAlarmOnce()).resolves.toBeUndefined();
  });
});
