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
  isBootstrapUri,
  isWithinMicroAppBoundary,
  resolveMicroAppBoundary,
} from "@/utils/microAppOrigin";

// Shaped like `${Paths.document.uri}${webViewUri}` on each platform.
const IOS_DOCUMENT_URI = "file:///var/mobile/Containers/Data/Application/A1/Documents/";
const ANDROID_DOCUMENT_URI = "file:///data/user/0/com.example.superapp/files/";
const BUNDLE_PATH = "store/micro-apps/sample-app-extracted/index.html";

describe("resolveMicroAppBoundary", () => {
  it("resolves a bundle to the directory its document sits in", () => {
    expect(resolveMicroAppBoundary(`${IOS_DOCUMENT_URI}${BUNDLE_PATH}`)).toBe(
      "file:///var/mobile/Containers/Data/Application/A1/Documents/store/micro-apps/sample-app-extracted"
    );
  });

  it("resolves a development server to its origin", () => {
    expect(resolveMicroAppBoundary("http://localhost:3000")).toBe(
      "http://localhost:3000"
    );
  });

  it("returns null for a uri with no scheme", () => {
    expect(resolveMicroAppBoundary("")).toBeNull();
    expect(resolveMicroAppBoundary("index.html")).toBeNull();
  });
});

describe("isWithinMicroAppBoundary — bundle served from file://", () => {
  const boundary = resolveMicroAppBoundary(`${IOS_DOCUMENT_URI}${BUNDLE_PATH}`);

  it("allows the document the bundle loads from", () => {
    expect(
      isWithinMicroAppBoundary(`${IOS_DOCUMENT_URI}${BUNDLE_PATH}`, boundary)
    ).toBe(true);
  });

  it("allows an asset inside the bundle directory", () => {
    expect(
      isWithinMicroAppBoundary(
        `${IOS_DOCUMENT_URI}store/micro-apps/sample-app-extracted/static/js/main.js`,
        boundary
      )
    ).toBe(true);
  });

  it("allows the same path reported under /private/var by iOS", () => {
    expect(
      isWithinMicroAppBoundary(
        `file:///private/var/mobile/Containers/Data/Application/A1/Documents/${BUNDLE_PATH}`,
        boundary
      )
    ).toBe(true);
  });

  it("allows a percent-encoded path for the same document", () => {
    expect(
      isWithinMicroAppBoundary(
        `${IOS_DOCUMENT_URI}store/micro-apps/sample-app-extracted/a%20b.html`,
        boundary
      )
    ).toBe(true);
  });

  it("ignores a query string and a fragment", () => {
    expect(
      isWithinMicroAppBoundary(
        `${IOS_DOCUMENT_URI}${BUNDLE_PATH}?v=1#/home`,
        boundary
      )
    ).toBe(true);
  });

  it("allows the bare file:// origin Android reports for a bridge message", () => {
    expect(isWithinMicroAppBoundary("file://", boundary)).toBe(true);
    expect(isWithinMicroAppBoundary("file:///", boundary)).toBe(true);
  });

  it("rejects another micro app's bundle", () => {
    expect(
      isWithinMicroAppBoundary(
        `${IOS_DOCUMENT_URI}store/micro-apps/other-app-extracted/index.html`,
        boundary
      )
    ).toBe(false);
  });

  it("rejects a sibling directory that merely shares the prefix", () => {
    expect(
      isWithinMicroAppBoundary(
        `${IOS_DOCUMENT_URI}store/micro-apps/sample-app-extracted-evil/index.html`,
        boundary
      )
    ).toBe(false);
  });

  it("rejects a path that climbs out with ..", () => {
    expect(
      isWithinMicroAppBoundary(
        `${IOS_DOCUMENT_URI}store/micro-apps/sample-app-extracted/../other-app-extracted/index.html`,
        boundary
      )
    ).toBe(false);
  });

  it("rejects a remote page", () => {
    expect(
      isWithinMicroAppBoundary("https://attacker.example.com/", boundary)
    ).toBe(false);
  });

  it("rejects a file url carrying a remote authority", () => {
    expect(
      isWithinMicroAppBoundary("file://attacker.example.com/index.html", boundary)
    ).toBe(false);
  });

  it("rejects about:blank, which is not the micro app's own document", () => {
    expect(isWithinMicroAppBoundary("about:blank", boundary)).toBe(false);
  });
});

describe("isWithinMicroAppBoundary — Android bundle and development server", () => {
  it("matches an Android bundle path", () => {
    const boundary = resolveMicroAppBoundary(
      `${ANDROID_DOCUMENT_URI}${BUNDLE_PATH}`
    );
    expect(
      isWithinMicroAppBoundary(`${ANDROID_DOCUMENT_URI}${BUNDLE_PATH}`, boundary)
    ).toBe(true);
  });

  it("allows any route on the development server's origin", () => {
    const boundary = resolveMicroAppBoundary("http://localhost:3000");
    expect(isWithinMicroAppBoundary("http://localhost:3000", boundary)).toBe(
      true
    );
    expect(
      isWithinMicroAppBoundary("http://localhost:3000/static/js/main.js", boundary)
    ).toBe(true);
    expect(isWithinMicroAppBoundary("http://localhost:30001/", boundary)).toBe(
      false
    );
    expect(
      isWithinMicroAppBoundary("https://attacker.example.com/", boundary)
    ).toBe(false);
  });

  it("fails closed when the boundary could not be resolved", () => {
    expect(isWithinMicroAppBoundary("http://localhost:3000", null)).toBe(false);
    expect(isWithinMicroAppBoundary(undefined, "http://localhost:3000")).toBe(
      false
    );
  });
});

describe("isBootstrapUri", () => {
  it("recognises the uris a WebView loads on its own", () => {
    expect(isBootstrapUri("about:blank")).toBe(true);
    expect(isBootstrapUri("blob:null/abc")).toBe(true);
    expect(isBootstrapUri("data:text/html,<p>hi</p>")).toBe(true);
    expect(isBootstrapUri(undefined)).toBe(true);
  });

  it("does not recognise a navigable origin", () => {
    expect(isBootstrapUri("https://attacker.example.com/")).toBe(false);
    expect(isBootstrapUri("file:///var/index.html")).toBe(false);
  });
});
