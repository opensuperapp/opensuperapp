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
import { RootState } from "@/context/store";
import { DecodedAccessToken } from "@/types/decodeAccessToken.types";
import { loadAuthDataFromSecureStore } from "@/utils/authTokenStore";
import { decodeClaims, mergeClaims } from "@/utils/tokenClaims";
import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";

export const useTokenClaims = (): DecodedAccessToken | null => {
  const { accessToken, idToken } = useSelector(
    (state: RootState) => state.auth
  );
  const [storedClaims, setStoredClaims] = useState<DecodedAccessToken | null>(
    null
  );

  const reduxClaims = useMemo(
    () =>
      mergeClaims([
        decodeClaims(accessToken, "access token"),
        decodeClaims(idToken, "id token"),
      ]),
    [accessToken, idToken]
  );

  // A mid-session refresh writes new tokens to SecureStore without dispatching,
  // and a screen can mount before `restoreAuth` resolves, so Redux having
  // nothing is not the same as being signed out.
  const needsFallback = !reduxClaims?.jobtitle && !reduxClaims?.phone_number;

  useEffect(() => {
    if (!needsFallback) {
      setStoredClaims(null);
      return;
    }

    let cancelled = false;
    loadAuthDataFromSecureStore()
      .then((stored) => {
        if (cancelled) {
          return;
        }
        setStoredClaims(
          mergeClaims([
            decodeClaims(stored?.accessToken, "stored access token"),
            decodeClaims(stored?.idToken, "stored id token"),
          ])
        );
      })
      .catch((error) => {
        console.warn("[claims] could not read tokens from SecureStore", error);
      });

    return () => {
      cancelled = true;
    };
  }, [needsFallback]);

  return useMemo(
    () => mergeClaims([reduxClaims, storedClaims]),
    [reduxClaims, storedClaims]
  );
};
