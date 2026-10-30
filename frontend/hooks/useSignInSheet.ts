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
import { selectIsSignedIn } from "@/context/slices/authSlice";
import { RootState } from "@/context/store";
import { useSignInWithAsgardeo } from "@/hooks/useSignInWithAsgardeo";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

const EXPIRED_COPY = {
  title: "Session expired",
  message: "Your session has expired. Sign in again to keep using your apps.",
};

const REQUIRED_COPY = {
  title: "Sign in Required",
  message: "Please sign in to continue using the app",
};

const ROTATION_LOST_COPY = {
  title: "You've been signed out",
  message:
    "We lost your sign-in while the connection was down. Sign in again to keep using your apps.",
};

/**
 * Leaves the sheet. A link can open it as the only route in the stack, with
 * nothing to go back to; the feed takes its place then.
 */
const close = () => {
  if (router.canGoBack()) router.back();
  else router.replace(ScreenPaths.FEED);
};

/** Why the sign-in sheet was opened; it only changes the copy. */
export type SignInReason = "expired" | "required";

/**
 * What the sign-in sheet shows and does, shared by its iOS and Android layouts.
 *
 * The sheet closes itself once the user is signed in: a sign-in from the sheet or
 * anywhere else, or opening the route by a link while signed in.
 */
export const useSignInSheet = () => {
  const { reason } = useLocalSearchParams<{ reason?: SignInReason }>();
  const isSignedIn = useSelector(selectIsSignedIn);
  const rotationLost = useSelector(
    (state: RootState) => state.auth.rotationLost
  );
  const performSignIn = useSignInWithAsgardeo();
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (isSignedIn) close();
  }, [isSignedIn]);

  // A cancelled or failed sign-in leaves the sheet up to try again.
  const signIn = async () => {
    setIsSigningIn(true);
    try {
      await performSignIn();
    } finally {
      setIsSigningIn(false);
    }
  };

  const dismiss = close;

  const copy =
    reason !== "expired"
      ? REQUIRED_COPY
      : rotationLost
        ? ROTATION_LOST_COPY
        : EXPIRED_COPY;

  return {
    ...copy,
    isSigningIn,
    signIn,
    dismiss,
  };
};
