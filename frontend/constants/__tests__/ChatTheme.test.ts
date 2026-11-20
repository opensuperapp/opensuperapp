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
import { getChatTheme } from "@/constants/ChatTheme";
import { themes } from "@/constants/brand";

describe("getChatTheme", () => {
  // The chat screen's header effect depends on the palette, so a fresh object per
  // render would call navigation.setOptions on every streamed chunk.
  it("returns the same palette object for the same scheme", () => {
    expect(getChatTheme(true)).toBe(getChatTheme(true));
    expect(getChatTheme(false)).toBe(getChatTheme(false));
  });

  it("resolves each scheme from its own tokens", () => {
    expect(getChatTheme(true).background).toBe(themes.dark.bg);
    expect(getChatTheme(false).background).toBe(themes.light.bg);
  });
});
