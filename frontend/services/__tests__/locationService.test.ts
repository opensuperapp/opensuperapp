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
import { ensureLocationPermissions } from "@/services/locationService";
import {
  hasServicesEnabledAsync,
  requestBackgroundPermissionsAsync,
  requestForegroundPermissionsAsync,
} from "expo-location";

jest.mock("expo-location", () => ({
  Accuracy: { High: 4, Balanced: 3 },
  hasServicesEnabledAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  requestBackgroundPermissionsAsync: jest.fn(),
}));

const mockServicesEnabled = hasServicesEnabledAsync as jest.Mock;
const mockForeground = requestForegroundPermissionsAsync as jest.Mock;
const mockBackground = requestBackgroundPermissionsAsync as jest.Mock;

describe("ensureLocationPermissions", () => {
  beforeEach(() => {
    mockServicesEnabled.mockReset().mockResolvedValue(true);
    mockForeground.mockReset().mockResolvedValue({ status: "granted" });
    mockBackground.mockReset().mockResolvedValue({ status: "granted" });
  });

  it("allows a foreground stream when permission is granted", async () => {
    await expect(ensureLocationPermissions(false)).resolves.toBeNull();
    expect(mockBackground).not.toHaveBeenCalled();
  });

  it("reports a foreground denial", async () => {
    mockForeground.mockResolvedValue({ status: "denied" });

    await expect(ensureLocationPermissions(false)).resolves.toBe(
      "permission_denied"
    );
  });

  // iOS reports every app as denied while Location Services is off device-wide, so the
  // permission status alone cannot tell the two apart.
  it("reports services_disabled, not a denial, when Location Services is off", async () => {
    mockServicesEnabled.mockResolvedValue(false);
    mockForeground.mockResolvedValue({ status: "denied" });

    await expect(ensureLocationPermissions(false)).resolves.toBe(
      "services_disabled"
    );
  });

  it("reports a background denial separately", async () => {
    mockBackground.mockResolvedValue({ status: "denied" });

    await expect(ensureLocationPermissions(true)).resolves.toBe(
      "background_permission_denied"
    );
  });
});
