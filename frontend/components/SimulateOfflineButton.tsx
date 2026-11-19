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
import { Event } from "@/constants/enums/Event";
import { useIsOffline } from "@/context/OfflineStatusContext";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import { reachabilityEmitter } from "@/utils/eventEmitter";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity } from "react-native";

/**
 * Dev only: fakes the backend going out of reach, and back, to try the offline toast
 * without touching airplane mode. Goes through the same event a failed request raises.
 */
const SimulateOfflineButton = () => {
  const { colors } = useBrandTheme();
  const offline = useIsOffline();

  return (
    <TouchableOpacity
      onPress={() => reachabilityEmitter.emit(Event.AuthReachability, offline)}
      hitSlop={20}
      style={{ marginHorizontal: 16 }}
      accessibilityRole="button"
      accessibilityLabel={offline ? "Simulate back online" : "Simulate offline"}
    >
      <Ionicons
        name={offline ? "cloud-offline-outline" : "cloud-done-outline"}
        size={24}
        color={colors.accent}
      />
    </TouchableOpacity>
  );
};

export default SimulateOfflineButton;
