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
  shareCardImage,
  shareVCard,
} from "@/services/businessCardService";
import { BusinessCardData } from "@/types/businessCard.types";
import { buildVCard, vCardFileName } from "@/utils/vcard";
import * as Sharing from "expo-sharing";
import { Alert } from "react-native";

jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

jest.mock("react-native", () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

const mockCreate = jest.fn();
const mockWrite = jest.fn();
let lastFileArgs: unknown[] = [];
let lastFileUri = "";

jest.mock("expo-file-system", () => {
  class MockFile {
    uri: string;

    constructor(...args: unknown[]) {
      lastFileArgs = args;
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

const minimalData: BusinessCardData = {
  firstName: "Jane",
  lastName: "Doe",
  workEmail: "jane.doe@wso2.com",
  organization: "WSO2 LLC",
  website: "https://wso2.com",
};

describe("shareVCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    lastFileArgs = [];
    lastFileUri = "";
  });

  it("writes the vCard content and filename, then shares it, returning true", async () => {
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
    (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);

    const result = await shareVCard(minimalData);

    expect(mockWrite).toHaveBeenCalledWith(buildVCard(minimalData));
    expect(lastFileArgs[lastFileArgs.length - 1]).toBe(
      vCardFileName(minimalData)
    );
    expect(Sharing.shareAsync).toHaveBeenCalledWith(
      lastFileUri,
      expect.objectContaining({ mimeType: "text/vcard" })
    );
    expect(result).toBe(true);
  });

  it("creates the file with overwrite: true", async () => {
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
    (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);

    await shareVCard(minimalData);

    expect(mockCreate).toHaveBeenCalledWith({ overwrite: true });
  });

  it("shows an alert and returns false when sharing is unavailable", async () => {
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(false);

    const result = await shareVCard(minimalData);

    expect(Sharing.shareAsync).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it("swallows a throw from shareAsync, returns false, and alerts", async () => {
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
    (Sharing.shareAsync as jest.Mock).mockRejectedValue(
      new Error("share boom")
    );

    await expect(shareVCard(minimalData)).resolves.toBe(false);
    expect(Alert.alert).toHaveBeenCalled();
  });

  it("swallows a throw from the file write, returns false, and alerts", async () => {
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
    mockWrite.mockImplementationOnce(() => {
      throw new Error("write boom");
    });

    await expect(shareVCard(minimalData)).resolves.toBe(false);
    expect(Sharing.shareAsync).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalled();
  });

  it("produces file content with no TEL;TYPE=CELL line when mobile is undefined", async () => {
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
    (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);

    await shareVCard({ ...minimalData, mobile: undefined });

    const writtenContent = mockWrite.mock.calls[0][0] as string;
    expect(writtenContent).not.toContain("TEL;TYPE=CELL");
  });
});

describe("shareCardImage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("passes the uri through untouched with mimeType: image/png, returning true", async () => {
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
    (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);

    const result = await shareCardImage("file:///card.png");

    expect(Sharing.shareAsync).toHaveBeenCalledWith(
      "file:///card.png",
      expect.objectContaining({ mimeType: "image/png" })
    );
    expect(result).toBe(true);
  });

  it("shows an alert and returns false when sharing is unavailable", async () => {
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(false);

    const result = await shareCardImage("file:///card.png");

    expect(Sharing.shareAsync).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it("swallows a throw from shareAsync, returns false, and alerts", async () => {
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
    (Sharing.shareAsync as jest.Mock).mockRejectedValue(
      new Error("share boom")
    );

    await expect(shareCardImage("file:///card.png")).resolves.toBe(false);
    expect(Alert.alert).toHaveBeenCalled();
  });
});
