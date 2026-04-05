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
  ConfigPlugin,
  IOSConfig,
  createRunOncePlugin,
  withDangerousMod,
  withXcodeProject,
} from "@expo/config-plugins";
import fs from "fs";
import path from "path";

const DEFAULTS_JSON = path.join(__dirname, "tab_visibility_rules.default.json");
const RC_KEY = "tab_visibility_rules";
const RESOURCE_BASENAME = "remote_config_tab_visibility_defaults";

function readDefaultsJsonString(): string {
  const raw = fs.readFileSync(DEFAULTS_JSON, "utf8");
  JSON.parse(raw);
  return raw.trim();
}

function buildAndroidRemoteConfigXml(jsonString: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<defaultsMap>
  <entry>
    <key>${RC_KEY}</key>
    <value><![CDATA[${jsonString}]]></value>
  </entry>
</defaultsMap>
`;
}

function escapeXmlText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildIosDefaultsPlist(jsonString: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>${RC_KEY}</key>
  <string>${escapeXmlText(jsonString)}</string>
</dict>
</plist>
`;
}

const withRemoteConfigTabVisibilityDefaultsImpl: ConfigPlugin = (config) => {
  const jsonString = readDefaultsJsonString();

  config = withDangerousMod(config, [
    "android",
    async (cfg) => {
      const root = cfg.modRequest.platformProjectRoot;
      if (!root) {
        throw new Error("Android platformProjectRoot missing during prebuild.");
      }
      const xmlDir = path.join(root, "app", "src", "main", "res", "xml");
      fs.mkdirSync(xmlDir, { recursive: true });
      const target = path.join(xmlDir, `${RESOURCE_BASENAME}.xml`);
      fs.writeFileSync(target, buildAndroidRemoteConfigXml(jsonString));
      return cfg;
    },
  ]);

  config = withXcodeProject(config, (projectConfig) => {
    const { projectRoot, platformProjectRoot } = projectConfig.modRequest;
    const projectName = IOSConfig.XcodeUtils.getProjectName(projectRoot);
    const plistRelative = path.join(projectName, `${RESOURCE_BASENAME}.plist`);
    const plistAbsolute = path.join(platformProjectRoot, plistRelative);
    const dir = path.dirname(plistAbsolute);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(plistAbsolute, buildIosDefaultsPlist(jsonString));

    if (!projectConfig.modResults.hasFile(plistAbsolute)) {
      projectConfig.modResults = IOSConfig.XcodeUtils.addResourceFileToGroup({
        filepath: plistRelative,
        groupName: projectName,
        project: projectConfig.modResults,
        isBuildFile: true,
        verbose: true,
      });
    }
    return projectConfig;
  });

  return config;
};

export default createRunOncePlugin(
  withRemoteConfigTabVisibilityDefaultsImpl,
  "with-remote-config-tab-visibility-defaults",
  "1.0.0",
);
