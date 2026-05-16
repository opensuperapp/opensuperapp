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

import { useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";

export type NetworkState = {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string;
  details: any;
};

export default function useNetworkState(): NetworkState {
  const [networkState, setNetworkState] = useState<NetworkState>({
    isConnected: true,
    isInternetReachable: true,
    type: "unknown",
    details: null,
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setNetworkState({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? null,
        type: state.type,
        details: state.details,
      });
    });

    NetInfo.fetch().then((state) => {
      setNetworkState({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? null,
        type: state.type,
        details: state.details,
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return networkState;
}
