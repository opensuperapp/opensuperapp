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
import { LocationFix } from "@/types/microApp.types";
import {
  appendLocationFixes,
  drainLocationBuffer,
} from "@/utils/locationBuffer";
import AsyncStorage from "@react-native-async-storage/async-storage";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock"
  )
);

const fix = (ts: string): LocationFix => ({ lat: 1, lng: 2, accuracy: 5, ts });

describe("locationBuffer", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("drains what was appended, oldest first, and empties the buffer", async () => {
    await appendLocationFixes([fix("2026-01-01T00:00:00.000Z")]);
    await appendLocationFixes([fix("2026-01-01T00:00:01.000Z")]);

    await expect(drainLocationBuffer()).resolves.toEqual([
      fix("2026-01-01T00:00:00.000Z"),
      fix("2026-01-01T00:00:01.000Z"),
    ]);
    await expect(drainLocationBuffer()).resolves.toEqual([]);
  });

  it("keeps a fix appended while a drain is in flight", async () => {
    await appendLocationFixes([fix("2026-01-01T00:00:00.000Z")]);

    const [drained] = await Promise.all([
      drainLocationBuffer(),
      appendLocationFixes([fix("2026-01-01T00:00:01.000Z")]),
    ]);

    expect(drained).toEqual([fix("2026-01-01T00:00:00.000Z")]);
    await expect(drainLocationBuffer()).resolves.toEqual([
      fix("2026-01-01T00:00:01.000Z"),
    ]);
  });
});
