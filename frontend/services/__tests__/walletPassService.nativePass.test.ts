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
import { addToAppleWallet } from "@/services/walletPassService";
import { apiRequest, getAccessToken } from "@/utils/requestHandler";
import * as Sharing from "expo-sharing";
import { Alert } from "react-native";

jest.mock("@/utils/requestHandler", () => ({
  apiRequest: jest.fn(),
  getAccessToken: jest.fn(),
}));

// The endpoint URLs are built when the service loads, so the base URL is pinned
// here rather than depending on the environment running the tests.
jest.mock("@/constants/Constants", () => ({
  __esModule: true,
  ...jest.requireActual("@/constants/Constants"),
  BASE_URL: "https://backend.example.com",
}));

jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

jest.mock("react-native", () => ({
  Alert: { alert: jest.fn() },
  Linking: { openURL: jest.fn() },
  // constants/Constants.ts (imported transitively) reads Platform.OS.
  Platform: { OS: "ios" },
}));

const mockCanAddPasses = jest.fn();
const mockShowAddPassControllerFromFile = jest.fn();

// The native module as a dev client that has it would see it: present, with
// PKAddPassesViewController behind these two calls.
jest.mock("react-native-wallet-manager", () => ({
  __esModule: true,
  default: {
    canAddPasses: () => mockCanAddPasses(),
    showAddPassControllerFromFile: (filePath: string) =>
      mockShowAddPassControllerFromFile(filePath),
  },
}));

jest.mock("expo-file-system", () => {
  class MockFile {
    uri: string;

    constructor(...args: unknown[]) {
      const name = args[args.length - 1];
      // A real cache URI, so the file:// stripping is exercised for real.
      this.uri = `file:///var/mobile/Containers/Data/Caches/${String(name)}`;
    }

    create(): void {}

    writeSync(): void {}

    // SDK 58: File.write() became async (returns a Promise). The services must
    // use writeSync(); calling write() here fails the test loudly.
    write(): never {
      throw new Error("File.write() is async from SDK 58; use writeSync()");
    }
  }

  return {
    File: MockFile,
    Paths: { cache: "file:///var/mobile/Containers/Data/Caches" },
  };
});

// The two business-card endpoints are the only backend calls that pass the
// caller's raw token on in `x-user-assertion`, so the token is pinned here to
// assert the header is set per call rather than by the shared request handler.
const ACCESS_TOKEN = "header.payload.signature";

const okResponse = () => {
  (apiRequest as jest.Mock).mockResolvedValue({
    status: 200,
    data: new ArrayBuffer(8),
  });
};

describe("addToAppleWallet — native add sheet", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getAccessToken as jest.Mock).mockResolvedValue(ACCESS_TOKEN);
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
    (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);
  });

  it("opens the native add sheet and never touches the share sheet", async () => {
    okResponse();
    mockCanAddPasses.mockResolvedValue(true);
    mockShowAddPassControllerFromFile.mockResolvedValue(true);

    await expect(addToAppleWallet(true)).resolves.toBe(true);

    expect(mockShowAddPassControllerFromFile).toHaveBeenCalledTimes(1);
    expect(Sharing.shareAsync).not.toHaveBeenCalled();
  });

  it("passes a plain filesystem path, not a file:// URI", async () => {
    okResponse();
    mockCanAddPasses.mockResolvedValue(true);
    mockShowAddPassControllerFromFile.mockResolvedValue(true);

    await addToAppleWallet(true);

    // PKAddPassesViewController's Swift side calls URL(fileURLWithPath:),
    // which reads a "file://" prefix as part of the path and then finds
    // nothing there.
    const path = mockShowAddPassControllerFromFile.mock.calls[0][0];
    expect(path).not.toContain("file://");
    expect(path).toBe(
      "/var/mobile/Containers/Data/Caches/choreo-labs-business-card.pkpass"
    );
  });

  it("reports failure when the native sheet declines to open", async () => {
    okResponse();
    mockCanAddPasses.mockResolvedValue(true);
    mockShowAddPassControllerFromFile.mockResolvedValue(false);

    await expect(addToAppleWallet(true)).resolves.toBe(false);
  });

  it("tells the user when the device cannot add passes at all", async () => {
    okResponse();
    mockCanAddPasses.mockResolvedValue(false);

    await expect(addToAppleWallet(true)).resolves.toBe(false);

    expect(Alert.alert).toHaveBeenCalled();
    // A share sheet cannot add a pass either, so offering one would be a
    // dead end.
    expect(Sharing.shareAsync).not.toHaveBeenCalled();
    expect(mockShowAddPassControllerFromFile).not.toHaveBeenCalled();
  });

  it("falls back to the share sheet when the native call throws", async () => {
    okResponse();
    mockCanAddPasses.mockResolvedValue(true);
    mockShowAddPassControllerFromFile.mockRejectedValue(
      new Error("NO_VIEW_CONTROLLER")
    );

    await expect(addToAppleWallet(true)).resolves.toBe(true);

    expect(Sharing.shareAsync).toHaveBeenCalledWith(expect.any(String), {
      UTI: "com.apple.pkpass",
    });
  });

  it("makes no request and opens nothing when the flag is off", async () => {
    await expect(addToAppleWallet(false)).resolves.toBe(false);

    expect(apiRequest).not.toHaveBeenCalled();
    expect(mockCanAddPasses).not.toHaveBeenCalled();
    expect(Sharing.shareAsync).not.toHaveBeenCalled();
  });
});
