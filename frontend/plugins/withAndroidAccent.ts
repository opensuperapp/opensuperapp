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
  AndroidConfig,
  ConfigPlugin,
  withAndroidColors,
  withAndroidColorsNight,
  withAndroidStyles,
} from "@expo/config-plugins";

interface AndroidAccentProps {
  light: string;
  dark: string;
}

const COLOR_NAME = "colorAccent";

/**
 * Sets the app theme's `colorAccent`, which Android uses for native alert buttons, text
 * cursors and selection handles. Without it AppCompat falls back to its default teal.
 */
const withAndroidAccent: ConfigPlugin<AndroidAccentProps> = (
  config,
  { light, dark },
) => {
  config = withAndroidColors(config, (c) => {
    c.modResults = AndroidConfig.Colors.assignColorValue(c.modResults, {
      name: COLOR_NAME,
      value: light,
    });
    return c;
  });
  config = withAndroidColorsNight(config, (c) => {
    c.modResults = AndroidConfig.Colors.assignColorValue(c.modResults, {
      name: COLOR_NAME,
      value: dark,
    });
    return c;
  });
  return withAndroidStyles(config, (c) => {
    c.modResults = AndroidConfig.Styles.assignStylesValue(c.modResults, {
      add: true,
      parent: AndroidConfig.Styles.getAppThemeGroup(),
      name: COLOR_NAME,
      value: `@color/${COLOR_NAME}`,
    });
    return c;
  });
};

export default withAndroidAccent;
