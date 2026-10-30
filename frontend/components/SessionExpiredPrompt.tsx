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
import { ScreenPaths } from "@/constants/ScreenPaths";
import { selectSessionStatus } from "@/context/slices/authSlice";
import { RootState } from "@/context/store";
import { SignInReason } from "@/hooks/useSignInSheet";
import { router, useRootNavigationState } from "expo-router";
import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";

/**
 * Opens the sign-in sheet the moment the session expires, wherever the user is.
 * Before this the only way back was a Sign In button on Profile or the Store, and
 * nothing said to go there.
 *
 * Mounted once at the root. A user-initiated sign-out never opens it. It opens once per
 * expiry: closing it leaves the user signed out with the usual Sign In buttons where
 * they always were.
 */
const SessionExpiredPrompt = () => {
  const isExpired = useSelector(selectSessionStatus) === "expired";
  // A sign-in started while the expired session is still being cleared would be cleared
  // with it.
  const isEndingSession = useSelector(
    (state: RootState) => state.auth.isEndingSession
  );
  // On a cold start the session can expire before the root stack exists to push onto.
  const isNavigationReady = !!useRootNavigationState()?.key;
  const hasOpened = useRef(false);

  useEffect(() => {
    if (!isExpired) {
      hasOpened.current = false;
      return;
    }
    if (isEndingSession || !isNavigationReady || hasOpened.current) return;
    hasOpened.current = true;
    router.push({
      pathname: ScreenPaths.SIGN_IN,
      params: { reason: "expired" satisfies SignInReason },
    });
  }, [isExpired, isEndingSession, isNavigationReady]);

  return null;
};

export default SessionExpiredPrompt;
