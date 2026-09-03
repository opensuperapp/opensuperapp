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
import { ConfigPlugin, withGradleProperties } from "@expo/config-plugins";

const JVM_ARGS_KEY = "org.gradle.jvmargs";

/**
 * Raises the Gradle daemon's memory limits in gradle.properties.
 *
 * The React Native template ships -Xmx2048m -XX:MaxMetaspaceSize=512m. Release
 * builds run lintVitalAnalyze for every native module, and lint loads enough
 * classes to exhaust a 512m metaspace, which fails the build with
 * "OutOfMemoryError: Metaspace" partway through :lintVitalAnalyzeRelease.
 * Metaspace is committed on demand, so a larger ceiling costs nothing until it
 * is needed.
 */
const withGradleMemory: ConfigPlugin<{ jvmArgs?: string } | void> = (
  config,
  props
) => {
  const jvmArgs = props?.jvmArgs ?? "-Xmx4096m -XX:MaxMetaspaceSize=2048m";

  return withGradleProperties(config, (mod) => {
    // Drop any existing entry so repeated prebuild runs stay idempotent.
    mod.modResults = mod.modResults.filter(
      (item) => !(item.type === "property" && item.key === JVM_ARGS_KEY)
    );

    mod.modResults.push({
      type: "property",
      key: JVM_ARGS_KEY,
      value: jvmArgs,
    });

    return mod;
  });
};

export default withGradleMemory;
