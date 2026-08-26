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
import {
  addToAppleWallet,
  addToGoogleWallet,
} from "@/services/walletPassService";
import { apiRequest } from "@/utils/requestHandler";
import * as Sharing from "expo-sharing";
import { Alert, Linking } from "react-native";

jest.mock("@/utils/requestHandler", () => ({
  apiRequest: jest.fn(),
}));

// The endpoint URLs are built when the service loads, so the base URL is
// pinned here instead of being whatever EXPO_PUBLIC_BACKEND_BASE_URL happens
// to be in the shell running the tests.
jest.mock("@/constants/Constants", () => ({
  __esModule: true,
  ...jest.requireActual("@/constants/Constants"),
  BASE_URL: "https://backend.example.com",
}));

jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

// This suite covers the fallback: a dev client built before
// react-native-wallet-manager landed, where the module's own
// TurboModuleRegistry.getEnforcing call throws as it is evaluated. The native
// add sheet, which is the primary path, is covered in
// walletPassService.nativePass.test.ts.
jest.mock("react-native-wallet-manager", () => {
  throw new Error("NativeWalletManager could not be found");
});

jest.mock("react-native", () => ({
  Alert: {
    alert: jest.fn(),
  },
  Linking: {
    openURL: jest.fn(),
  },
  // constants/Constants.ts (imported transitively) reads Platform.OS.
  Platform: { OS: "ios" },
}));

const mockCreate = jest.fn();
const mockWrite = jest.fn();
let lastFileUri = "";

jest.mock("expo-file-system", () => {
  class MockFile {
    uri: string;

    constructor(...args: unknown[]) {
      const name = args[args.length - 1];
      this.uri = `mock-cache/${String(name)}`;
      lastFileUri = this.uri;
    }

    create(options: unknown): void {
      mockCreate(options);
    }

    write(content: unknown): void {
      mockWrite(content);
    }
  }

  return {
    File: MockFile,
    Paths: { cache: "mock-cache-dir" },
  };
});

const onLogout = jest.fn().mockResolvedValue(undefined);

describe("addToAppleWallet", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    lastFileUri = "";
  });

  it("falls back to the share sheet with the com.apple.pkpass UTI when the native module is missing", async () => {
    (apiRequest as jest.Mock).mockResolvedValue({
      status: 200,
      data: new ArrayBuffer(8),
    });
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
    (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);

    const result = await addToAppleWallet(true, onLogout);

    expect(apiRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://backend.example.com/business-card/pkpass",
        method: "GET",
        responseType: "arraybuffer",
      }),
      onLogout
    );
    expect(mockWrite).toHaveBeenCalled();
    expect(Sharing.shareAsync).toHaveBeenCalledWith(lastFileUri, {
      UTI: "com.apple.pkpass",
    });
    expect(result).toBe(true);
  });

  it("does not write a file or open the share sheet on a non-2xx response", async () => {
    (apiRequest as jest.Mock).mockResolvedValue({ status: 503, data: undefined });

    const result = await addToAppleWallet(true, onLogout);

    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockWrite).not.toHaveBeenCalled();
    expect(Sharing.shareAsync).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalled();
    expect(result).toBe(false);
  });

  // An empty ArrayBuffer is truthy, so a 200 carrying no bytes used to reach
  // the file write; the share sheet would then report success for a zero-byte
  // .pkpass that Apple Wallet refuses to install.
  it("does not write a file or open the share sheet on a 200 with an empty body", async () => {
    (apiRequest as jest.Mock).mockResolvedValue({
      status: 200,
      data: new ArrayBuffer(0),
    });

    const result = await addToAppleWallet(true, onLogout);

    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockWrite).not.toHaveBeenCalled();
    expect(Sharing.shareAsync).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it("makes no request when the wallet_pass_enabled flag is off", async () => {
    const result = await addToAppleWallet(false, onLogout);

    expect(apiRequest).not.toHaveBeenCalled();
    expect(Sharing.shareAsync).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });
});

describe("addToGoogleWallet", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls the save-url endpoint and opens the returned URL", async () => {
    const saveUrl = "https://pay.google.com/gp/v/save/abc123";
    (apiRequest as jest.Mock).mockResolvedValue({
      status: 200,
      data: { saveUrl },
    });
    (Linking.openURL as jest.Mock).mockResolvedValue(true);

    const result = await addToGoogleWallet(true, onLogout);

    expect(apiRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://backend.example.com/business-card/google-save-url",
        method: "GET",
      }),
      onLogout
    );
    expect(Linking.openURL).toHaveBeenCalledWith(saveUrl);
    expect(result).toBe(true);
  });

  it("does not open the share sheet / URL on a non-2xx response", async () => {
    (apiRequest as jest.Mock).mockResolvedValue({ status: 500, data: undefined });

    const result = await addToGoogleWallet(true, onLogout);

    expect(Linking.openURL).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it("makes no request when the wallet_pass_enabled flag is off", async () => {
    const result = await addToGoogleWallet(false, onLogout);

    expect(apiRequest).not.toHaveBeenCalled();
    expect(Linking.openURL).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it("handles openURL rejecting without throwing", async () => {
    const saveUrl = "https://pay.google.com/gp/v/save/abc123";
    (apiRequest as jest.Mock).mockResolvedValue({
      status: 200,
      data: { saveUrl },
    });
    (Linking.openURL as jest.Mock).mockRejectedValue(new Error("no handler"));

    await expect(addToGoogleWallet(true, onLogout)).resolves.toBe(false);
    expect(Alert.alert).toHaveBeenCalled();
  });
});
