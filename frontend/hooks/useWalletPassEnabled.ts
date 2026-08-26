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
import { ENABLE_WALLET_PASS } from "@/constants/Constants";
import { WALLET_PASS_ENABLED_KEY } from "@/constants/RemoteConfigDefaults";
import { useRemoteConfig } from "@/hooks/useRemoteConfig";
import {
  DEFAULT_WALLET_PASS_CONFIG,
  WalletPassConfig,
} from "@/types/remoteConfig.types";
import { Platform } from "react-native";

// Two independent gates: the build ships the feature at all, and WSO2 has it
// switched on for this OS right now.
export const useWalletPassEnabled = (): boolean => {
  const { value: config } = useRemoteConfig<WalletPassConfig>(
    WALLET_PASS_ENABLED_KEY,
    DEFAULT_WALLET_PASS_CONFIG
  );

  // `=== true`, not truthiness: the config comes from JSON.parse, so `null` or
  // a stringly-typed "true" have to read as off rather than pass or crash.
  return ENABLE_WALLET_PASS && config?.[Platform.OS] === true;
};
