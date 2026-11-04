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
import "@/tasks/locationTask";
import { appendLocationFixes } from "@/utils/locationBuffer";
import { defineTask } from "expo-task-manager";
import { AppState } from "react-native";

jest.mock("expo-task-manager", () => ({ defineTask: jest.fn() }));
jest.mock("@/utils/locationBuffer", () => ({ appendLocationFixes: jest.fn() }));

const mockAppend = appendLocationFixes as jest.Mock;
const runTask = (defineTask as jest.Mock).mock.calls[0][1];

// React Native's Jest setup mocks AppState, so set the state the task reads directly.
const setAppState = (state: string) => {
  (AppState as { currentState: string }).currentState = state;
};

const delivery = {
  data: {
    locations: [
      {
        coords: { latitude: 6.9, longitude: 79.8, accuracy: 12 },
        timestamp: Date.parse("2026-01-01T00:00:00.000Z"),
      },
    ],
  },
  error: null,
};

describe("background location task", () => {
  beforeEach(() => {
    mockAppend.mockReset();
  });

  it("buffers a delivery received in the background", async () => {
    setAppState("background");

    await runTask(delivery);

    expect(mockAppend).toHaveBeenCalledWith([
      { lat: 6.9, lng: 79.8, accuracy: 12, ts: "2026-01-01T00:00:00.000Z" },
    ]);
  });

  it("does not buffer a delivery received in the foreground", async () => {
    setAppState("active");

    await runTask(delivery);

    expect(mockAppend).not.toHaveBeenCalled();
  });
});
