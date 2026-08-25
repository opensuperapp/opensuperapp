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
import BusinessCardQrModal from "@/components/businessCard/BusinessCardQrModal";
import { BusinessCardData } from "@/types/businessCard.types";
import * as Brightness from "expo-brightness";
import React from "react";
import { act, create } from "react-test-renderer";

// The modal branches on the platform when it hands brightness back, so the
// suite drives both halves off one flag rather than two files. isIos has to be
// a real accessor on the mocked module: a getter written inline in the object
// literal gets flattened to a plain value by the spread, freezing it at
// whatever the flag was when the factory ran.
let mockIsIos = false;

jest.mock("@/constants/Constants", () =>
  Object.defineProperty(
    { __esModule: true, ...jest.requireActual("@/constants/Constants") },
    "isIos",
    { get: () => mockIsIos, enumerable: true }
  )
);

jest.mock("expo-brightness", () => ({
  getBrightnessAsync: jest.fn(),
  setBrightnessAsync: jest.fn(),
  restoreSystemBrightnessAsync: jest.fn(),
}));

jest.mock("react-native-qrcode-svg", () => ({
  __esModule: true,
  default: () => null,
}));

const getBrightnessAsync = Brightness.getBrightnessAsync as jest.Mock;
const setBrightnessAsync = Brightness.setBrightnessAsync as jest.Mock;
const restoreSystemBrightnessAsync =
  Brightness.restoreSystemBrightnessAsync as jest.Mock;

const data: BusinessCardData = {
  firstName: "Jane",
  lastName: "Doe",
  jobTitle: "Software Engineer",
  workEmail: "jane.doe@wso2.com",
  organization: "WSO2",
  website: "https://wso2.com",
};

// The brightness work is a promise chain the component never exposes, so let
// the queue drain rather than awaiting a handle.
const flush = async () => {
  await act(async () => {
    await new Promise((resolve) => setImmediate(resolve));
  });
};

const open = () => {
  let root: ReturnType<typeof create> | undefined;
  act(() => {
    root = create(
      <BusinessCardQrModal visible data={data} onClose={jest.fn()} />
    );
  });
  return root!;
};

const close = (root: ReturnType<typeof create>) => {
  act(() => {
    root.update(
      <BusinessCardQrModal visible={false} data={data} onClose={jest.fn()} />
    );
  });
};

describe("BusinessCardQrModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsIos = false;
    getBrightnessAsync.mockResolvedValue(0.35);
    setBrightnessAsync.mockResolvedValue(undefined);
    restoreSystemBrightnessAsync.mockResolvedValue(undefined);
  });

  it("reads the current brightness before raising it", async () => {
    open();
    await flush();

    expect(getBrightnessAsync).toHaveBeenCalledTimes(1);
    expect(setBrightnessAsync).toHaveBeenCalledWith(1);
    // Reading afterwards would only ever record our own 1.
    expect(getBrightnessAsync.mock.invocationCallOrder[0]).toBeLessThan(
      setBrightnessAsync.mock.invocationCallOrder[0]
    );
  });

  it("writes the captured level back on iOS, which has no restore call", async () => {
    mockIsIos = true;

    const root = open();
    await flush();
    close(root);
    await flush();

    expect(setBrightnessAsync).toHaveBeenNthCalledWith(1, 1);
    expect(setBrightnessAsync).toHaveBeenNthCalledWith(2, 0.35);
    expect(restoreSystemBrightnessAsync).not.toHaveBeenCalled();
  });

  it("hands the window back to the system on Android", async () => {
    const root = open();
    await flush();
    close(root);
    await flush();

    expect(restoreSystemBrightnessAsync).toHaveBeenCalledTimes(1);
    // Only the raise: Android restores by dropping the override, not by
    // writing the old level back.
    expect(setBrightnessAsync).toHaveBeenCalledTimes(1);
    expect(setBrightnessAsync).toHaveBeenCalledWith(1);
  });

  it("restores the level from before the raise, not the raised one", async () => {
    mockIsIos = true;
    // A device that reports back whatever was last written to it, so a capture
    // taken after the raise reads 1 and would pin the user at full brightness.
    let level = 0.2;
    getBrightnessAsync.mockImplementation(async () => level);
    setBrightnessAsync.mockImplementation(async (value: number) => {
      level = value;
    });

    const root = open();
    await flush();
    close(root);
    await flush();

    expect(level).toBe(0.2);
  });

  it("still ends on the captured level when the modal closes mid-raise", async () => {
    mockIsIos = true;

    const root = open();
    // No flush: the read is still in flight when the modal goes away.
    close(root);
    await flush();

    // The raise lands first, then the restore queued behind it puts 0.35 back,
    // instead of the close being overtaken and leaving the screen at 1.
    expect(setBrightnessAsync).toHaveBeenNthCalledWith(1, 1);
    expect(setBrightnessAsync).toHaveBeenNthCalledWith(2, 0.35);
    expect(setBrightnessAsync).toHaveBeenCalledTimes(2);
  });

  it("leaves brightness untouched on iOS when the capture fails", async () => {
    mockIsIos = true;
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    getBrightnessAsync.mockRejectedValue(new Error("no brightness module"));

    const root = open();
    await flush();
    close(root);
    await flush();

    // Nothing was captured, so there is no stale value to write back.
    expect(setBrightnessAsync).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      "Failed to raise screen brightness",
      expect.any(Error)
    );

    consoleError.mockRestore();
  });

  it("does not touch brightness while it is closed", async () => {
    act(() => {
      create(
        <BusinessCardQrModal visible={false} data={data} onClose={jest.fn()} />
      );
    });
    await flush();

    expect(getBrightnessAsync).not.toHaveBeenCalled();
    expect(setBrightnessAsync).not.toHaveBeenCalled();
    expect(restoreSystemBrightnessAsync).not.toHaveBeenCalled();
  });
});
