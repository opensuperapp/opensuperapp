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
import { LAST_ACTIVE_PATH_KEY } from "@/constants/Constants";
import { ScreenPaths } from "@/constants/ScreenPaths";
import {
  openTabTracking,
  useTrackActiveScreen,
} from "@/hooks/useTrackActiveScreen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";
import { act, create } from "react-test-renderer";

jest.mock("@react-native-async-storage/async-storage", () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
// Focus is treated as mount: each screen here is the focused one.
jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (effect: () => void) =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("react").useEffect(effect, [effect]),
}));

const flush = () => act(async () => {});

// The gate is module state that only ever opens, so these run in order on one copy.
describe("useTrackActiveScreen", () => {
  beforeEach(() => AsyncStorage.clear());

  it("does not overwrite the saved tab before the restore has read it", async () => {
    await AsyncStorage.setItem(LAST_ACTIVE_PATH_KEY, ScreenPaths.CHAT);
    const Feed = () => {
      useTrackActiveScreen(ScreenPaths.FEED);
      return null;
    };

    await act(async () => {
      create(<Feed />);
    });
    await flush();

    expect(await AsyncStorage.getItem(LAST_ACTIVE_PATH_KEY)).toBe(
      ScreenPaths.CHAT,
    );
  });

  it("records the focused tab once tracking is opened", async () => {
    await AsyncStorage.setItem(LAST_ACTIVE_PATH_KEY, ScreenPaths.CHAT);
    const Library = () => {
      useTrackActiveScreen(ScreenPaths.LIBRARY);
      return null;
    };

    await act(async () => {
      create(<Library />);
    });
    await act(async () => openTabTracking());
    await flush();

    expect(await AsyncStorage.getItem(LAST_ACTIVE_PATH_KEY)).toBe(
      ScreenPaths.LIBRARY,
    );
  });
});
