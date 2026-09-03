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
import { RootState } from "@/context/store";
import { useRemoteConfig } from "@/hooks/useRemoteConfig";
import {
  DEFAULT_WALLET_PASS_CONFIG,
  WalletPassConfig,
} from "@/types/remoteConfig.types";
import { hasBusinessCardAccess } from "@/utils/businessCardAccess";
import { decodeClaims } from "@/utils/tokenClaims";
import { useMemo } from "react";
import { Platform } from "react-native";
import { useSelector } from "react-redux";

export type WalletPassGates = {
  // The Profile header's card icon, and with it every path into the sheet.
  cardEnabled: boolean;
  // Whether the sheet leads with the vendor wallet badge or with "Save image".
  walletDownloadEnabled: boolean;
};

export const useWalletPassConfig = (): WalletPassGates => {
  const { value: config } = useRemoteConfig<WalletPassConfig>(
    WALLET_PASS_ENABLED_KEY,
    DEFAULT_WALLET_PASS_CONFIG,
  );

  const { accessToken } = useSelector((state: RootState) => state.auth);

  const rule = config?.[Platform.OS];

  // Legacy shape: the console may still hold a bare boolean, where it only
  // ever meant "wallet download", never "hide the card".
  const remoteCardEnabled =
    typeof rule === "boolean" ? true : rule?.enabled !== false;

  // ANDed on top of the remote-config gate above, never a replacement for
  // it: the card also stays hidden unless the signed-in user's email domain
  // and group memberships both clear the allow-list bar.
  const claims = useMemo(
    () => decodeClaims(accessToken, "access token"),
    [accessToken],
  );
  const businessCardAccess = hasBusinessCardAccess(
    claims?.email,
    claims?.groups,
  );

  const cardEnabled = remoteCardEnabled && businessCardAccess;

  const walletDownloadEnabled =
    typeof rule === "boolean"
      ? ENABLE_WALLET_PASS && rule && businessCardAccess
      : ENABLE_WALLET_PASS && cardEnabled && rule?.walletDownload === true;

  // Stable reference so consumers can drop this in a useLayoutEffect deps
  // list without re-running on every render.
  return useMemo(
    () => ({ cardEnabled, walletDownloadEnabled }),
    [cardEnabled, walletDownloadEnabled],
  );
};
