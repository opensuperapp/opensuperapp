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
import { buildMediaCaptureGuard } from "./bridge";

type FakeNavigator = {
  mediaDevices?: {
    getUserMedia?: (constraints?: unknown) => Promise<string>;
    getDisplayMedia?: () => Promise<string>;
  };
  getUserMedia?: () => void;
  webkitGetUserMedia?: () => void;
};

/**
 * Runs the guard against a stand in navigator, the way the WebView runs it against the
 * real one before any page script loads.
 * @param allowVideo Whether the micro app declared the camera capability.
 * @param allowAudio Whether the micro app declared the microphone capability.
 * @returns The navigator the guard left behind.
 */
const applyGuard = (allowVideo: boolean, allowAudio: boolean): FakeNavigator => {
  const navigator: FakeNavigator = {
    mediaDevices: {
      getUserMedia: () => Promise.resolve("stream"),
      getDisplayMedia: () => Promise.resolve("screen"),
    },
    getUserMedia: () => {},
    webkitGetUserMedia: () => {},
  };
  new Function(
    "navigator",
    buildMediaCaptureGuard(allowVideo, allowAudio)
  )(navigator);
  return navigator;
};

describe("buildMediaCaptureGuard", () => {
  it("removes every capture entry point when nothing is declared", () => {
    const navigator = applyGuard(false, false);

    expect(navigator.mediaDevices?.getUserMedia).toBeUndefined();
    expect(navigator.mediaDevices?.getDisplayMedia).toBeUndefined();
    expect(navigator.getUserMedia).toBeUndefined();
    expect(navigator.webkitGetUserMedia).toBeUndefined();
  });

  it("passes video through when the camera is declared", async () => {
    const navigator = applyGuard(true, false);

    await expect(
      navigator.mediaDevices?.getUserMedia?.({ video: true })
    ).resolves.toBe("stream");
  });

  it("rejects audio when only the camera is declared", async () => {
    const navigator = applyGuard(true, false);

    await expect(
      navigator.mediaDevices?.getUserMedia?.({ audio: true })
    ).rejects.toMatchObject({ name: "NotAllowedError" });
  });

  it("rejects a combined request that reaches past the declaration", async () => {
    const navigator = applyGuard(true, false);

    await expect(
      navigator.mediaDevices?.getUserMedia?.({ video: true, audio: true })
    ).rejects.toMatchObject({ name: "NotAllowedError" });
  });

  it("rejects video when only the microphone is declared", async () => {
    const navigator = applyGuard(false, true);

    await expect(
      navigator.mediaDevices?.getUserMedia?.({ audio: true })
    ).resolves.toBe("stream");
    await expect(
      navigator.mediaDevices?.getUserMedia?.({ video: true })
    ).rejects.toMatchObject({ name: "NotAllowedError" });
  });

  it("refuses screen capture whatever was declared", async () => {
    const navigator = applyGuard(true, true);

    await expect(
      navigator.mediaDevices?.getDisplayMedia?.()
    ).rejects.toMatchObject({ name: "NotAllowedError" });
  });

  it("leaves a constraint object for the camera intact", async () => {
    const navigator = applyGuard(true, false);

    await expect(
      navigator.mediaDevices?.getUserMedia?.({
        video: { facingMode: "environment" },
      })
    ).resolves.toBe("stream");
  });
});
