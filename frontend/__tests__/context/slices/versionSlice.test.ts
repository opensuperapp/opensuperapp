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
import versionReducer, {
  getVersions,
  Version,
} from "@/context/slices/versionSlice";

jest.mock("@/utils/requestHandler");
jest.mock("react-native", () => ({
  Platform: {
    OS: "ios",
  },
}));

const initialState = {
  versions: [],
  loading: false,
  error: null,
};

const mockVersions: Version[] = [
  {
    version: "1.0.0",
    build: 1,
    platform: "ios",
    releaseNotes: "Initial release",
    downloadUrl: "https://example.com/download",
  },
];

describe("versionSlice", () => {
  describe("async thunks", () => {
    it("should handle getVersions.pending", () => {
      const action = { type: getVersions.pending.type };
      const nextState = versionReducer(initialState, action);
      expect(nextState.loading).toBe(true);
      expect(nextState.error).toBe(null);
    });

    it("should handle getVersions.fulfilled with data", () => {
      const action = { type: getVersions.fulfilled.type, payload: mockVersions };
      const nextState = versionReducer(initialState, action);
      expect(nextState.loading).toBe(false);
      expect(nextState.versions).toEqual(mockVersions);
    });

    it("should handle getVersions.fulfilled with no data", () => {
      const action = { type: getVersions.fulfilled.type, payload: null };
      const nextState = versionReducer(initialState, action);
      expect(nextState.loading).toBe(false);
      expect(nextState.versions).toEqual([]);
    });

    it("should handle getVersions.rejected", () => {
      const error = "Version data not found";
      const action = { type: getVersions.rejected.type, payload: error };
      const nextState = versionReducer({ ...initialState, loading: true }, action);
      expect(nextState.loading).toBe(false);
      expect(nextState.error).toBe(error);
    });
  });
});
