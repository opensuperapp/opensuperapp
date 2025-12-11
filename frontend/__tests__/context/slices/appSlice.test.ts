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
import appsReducer, {
  setApps,
  addDownloading,
  removeDownloading,
  updateAppStatus,
  updateExchangedToken,
  MicroApp,
} from "@/context/slices/appSlice";
import { DisplayMode } from "@/types/navigation";

const initialState = {
  apps: [],
  downloading: [],
};

const mockApps: MicroApp[] = [
  {
    appId: "app1",
    name: "App 1",
    description: "Description 1",
    promoText: "Promo 1",
    iconUrl: "icon1.png",
    bannerImageUrl: "banner1.png",
    isMandatory: 0,
    versions: [],
  },
  {
    appId: "app2",
    name: "App 2",
    description: "Description 2",
    promoText: "Promo 2",
    iconUrl: "icon2.png",
    bannerImageUrl: "banner2.png",
    isMandatory: 1,
    versions: [],
  },
];

describe("appsSlice", () => {
  it("should handle setApps", () => {
    const nextState = appsReducer(initialState, setApps(mockApps));
    expect(nextState.apps).toEqual(mockApps);
  });

  it("should handle addDownloading", () => {
    const nextState = appsReducer(initialState, addDownloading("app1"));
    expect(nextState.downloading).toEqual(["app1"]);
  });

  it("should handle removeDownloading", () => {
    const stateWithDownloading = { ...initialState, downloading: ["app1", "app2"] };
    const nextState = appsReducer(stateWithDownloading, removeDownloading("app1"));
    expect(nextState.downloading).toEqual(["app2"]);
  });

  it("should handle updateAppStatus", () => {
    const stateWithApps = { ...initialState, apps: mockApps };
    const payload = {
      appId: "app1",
      status: "installed",
      webViewUri: "uri1",
      clientId: "client1",
      exchangedToken: "token1",
      displayMode: "modal" as DisplayMode,
    };
    const nextState = appsReducer(stateWithApps, updateAppStatus(payload));
    const updatedApp = nextState.apps.find((app) => app.appId === "app1");
    expect(updatedApp?.status).toEqual("installed");
    expect(updatedApp?.webViewUri).toEqual("uri1");
    expect(updatedApp?.clientId).toEqual("client1");
    expect(updatedApp?.exchangedToken).toEqual("token1");
    expect(updatedApp?.displayMode).toEqual("modal");
  });

  it("should handle updateExchangedToken", () => {
    const stateWithApps = { ...initialState, apps: mockApps };
    const payload = {
      appId: "app1",
      exchangedToken: "newToken",
    };
    const nextState = appsReducer(stateWithApps, updateExchangedToken(payload));
    const updatedApp = nextState.apps.find((app) => app.appId === "app1");
    expect(updatedApp?.exchangedToken).toEqual("newToken");
  });
});
