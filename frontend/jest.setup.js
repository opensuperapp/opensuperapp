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
/* eslint-env jest */

// NetInfo reaches for its native module as soon as it is imported, and there is none under
// Jest. The library ships this mock for exactly that; a suite that needs to drive
// connectivity changes overrides it with its own jest.mock.
import mockRNCNetInfo from "@react-native-community/netinfo/jest/netinfo-mock.js";

jest.mock("@react-native-community/netinfo", () => mockRNCNetInfo);

// lottie-react-native renders through a native view that doesn't exist under Jest. The brand
// loaders (components/brand) use it everywhere a wait is shown, so stand it in with a View.
jest.mock("lottie-react-native", () => {
  const { View } = require("react-native");
  const LottieView = (props) => <View testID={props.testID} />;
  return { __esModule: true, default: LottieView };
});
