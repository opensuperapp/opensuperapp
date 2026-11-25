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
import { ScreenPaths } from "@/constants/ScreenPaths";
import type { MicroApp } from "@/context/slices/appSlice";
import { findDownloadedMicroApp, openMicroApp } from "@/utils/openMicroApp";

const app = (appId: string, status = "downloaded"): MicroApp => ({
  name: `App ${appId}`,
  description: "",
  promoText: "",
  appId,
  iconUrl: "",
  bannerImageUrl: "",
  isMandatory: 0,
  versions: [],
  status,
  webViewUri: `${appId}/index.html`,
  clientId: `${appId}-client`,
  exchangedToken: "test-exchanged-token",
  exchangedIdToken: "test-exchanged-id-token",
  displayMode: "fullscreen",
});

const APPS = [app("a"), app("b", "not-downloaded")];
const router = () => ({ push: jest.fn(), dismissAll: jest.fn() });

describe("findDownloadedMicroApp", () => {
  it.each([
    ["a downloaded app", "a", "a"],
    ["an app that is not downloaded", "b", undefined],
    ["an unknown id", "zzz", undefined],
  ])("finds %s", (_, id, expected) => {
    expect(findDownloadedMicroApp(APPS, id)?.appId).toBe(expected);
  });
});

describe("openMicroApp", () => {
  it("pushes the micro-app screen with the app's details and the launch data, untouched", () => {
    const r = router();

    expect(openMicroApp({ router: r, apps: APPS, appId: "a", launchData: '{"x":1}' })).toBe(true);

    expect(r.push).toHaveBeenCalledWith({
      pathname: ScreenPaths.MICRO_APP,
      params: {
        webViewUri: "a/index.html",
        appName: "App a",
        clientId: "a-client",
        exchangedToken: "test-exchanged-token",
        exchangedIdToken: "test-exchanged-id-token",
        appId: "a",
        displayMode: "fullscreen",
        launchData: '{"x":1}',
      },
    });
    expect(r.dismissAll).not.toHaveBeenCalled();
  });

  it("dismisses the stack first when asked (the bridge)", () => {
    const r = router();

    openMicroApp({ router: r, apps: APPS, appId: "a", dismissAll: true });

    expect(r.dismissAll.mock.invocationCallOrder[0]).toBeLessThan(
      r.push.mock.invocationCallOrder[0],
    );
  });

  it.each([
    ["not downloaded", "b"],
    ["unknown", "zzz"],
  ])("does nothing and answers false for an app that is %s", (_, id) => {
    const r = router();

    expect(openMicroApp({ router: r, apps: APPS, appId: id, dismissAll: true })).toBe(false);
    expect(r.push).not.toHaveBeenCalled();
    expect(r.dismissAll).not.toHaveBeenCalled();
  });
});
