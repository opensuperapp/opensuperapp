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
import { useBrandTheme } from "@/hooks/useBrandTheme";
import React from "react";
import { ActivityIndicator } from "react-native";

/**
 * The native spinner shown in place of a wallet button while a pass is being
 * fetched. The Choreo Wheel is kept for chat loading and the launch screen.
 */
const PendingSpinner = () => {
  const { colors } = useBrandTheme();
  return <ActivityIndicator color={colors.text2} />;
};

export default PendingSpinner;
