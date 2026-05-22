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
package rbac

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/opensuperapp/opensuperapp/backend-services/core/internal/auth"
)

type errorResponse struct {
	Error string `json:"error"`
}

// RequireGroups is middleware that checks if user belongs to any of the groups.
func RequireGroups(groups ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			user, ok := auth.GetUserInfo(r.Context())
			if !ok {
				slog.Warn("rbac: no user in context", "path", r.URL.Path)
				writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "unauthorized"})
				return
			}

			userSet := makeGroupSet(user.Groups)
			if !HasAnyGroupSet(userSet, groups...) {
				slog.Warn("rbac: access denied",
					"user", user.Email,
					"userGroups", user.Groups,
					"requiredGroups", groups,
					"path", r.URL.Path,
				)
				writeJSON(w, http.StatusForbidden, errorResponse{Error: "forbidden"})
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}
