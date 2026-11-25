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
import { disablePushToken } from "@/context/slices/deviceSlice";
import { AppDispatch } from "@/context/store";
import { endSession } from "@/utils/endSession";

// Long enough for a healthy network to answer, short enough that a dead one does not
// leave the user staring at a profile they asked to leave.
const PUSH_TOKEN_DISABLE_WAIT_MS = 3000;

/** What the user's own Sign Out does. */
export const signOut = async (dispatch: AppDispatch): Promise<void> => {
  // Started first because removing the push token needs the access token endSession
  // clears, but only waited on for so long: signing out must not depend on the network.
  let timeout: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([
    dispatch(disablePushToken()),
    new Promise<void>((resolve) => {
      timeout = setTimeout(resolve, PUSH_TOKEN_DISABLE_WAIT_MS);
    }),
  ]);
  clearTimeout(timeout);

  await dispatch(endSession({ status: "signedOut" }));
};
