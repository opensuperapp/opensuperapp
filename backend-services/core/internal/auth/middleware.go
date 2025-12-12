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
package auth

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"

	"github.com/opensuperapp/opensuperapp/backend-services/core/internal/services"
)

const (
	authHeader  = "Authorization"
	bearerToken = "bearer"
)

// AuthMiddleware is the middleware that validates JWT tokens for users.
func AuthMiddleware(tokenValidator services.TokenValidator) func(http.Handler) http.Handler {
	return validateTokenMiddleware(tokenValidator, func(r *http.Request, claims *services.TokenClaims) *http.Request {
		userInfo := &CustomJwtPayload{
			Email:  claims.Email,
			Groups: claims.Groups,
		}
		return SetUserInfo(r, userInfo)
	})
}

// ServiceOAuthMiddleware validates the Bearer token for services.
func ServiceOAuthMiddleware(tokenValidator services.TokenValidator) func(http.Handler) http.Handler {
	return validateTokenMiddleware(tokenValidator, func(r *http.Request, claims *services.TokenClaims) *http.Request {
		serviceInfo := &ServiceInfo{
			ClientID: claims.Subject,
		}
		return SetServiceInfo(r, serviceInfo)
	})
}

// validateTokenMiddleware is a generic middleware for token validation.
func validateTokenMiddleware(tokenValidator services.TokenValidator, onSuccess func(r *http.Request, claims *services.TokenClaims) *http.Request) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			tokenString, ok := extractBearerToken(r)
			if !ok {
				slog.Warn("Missing or invalid Authorization header", "path", r.URL.Path, "method", r.Method)
				writeError(w, http.StatusUnauthorized, "Missing or invalid Authorization header")
				return
			}

			claims, err := tokenValidator.ValidateToken(tokenString)
			if err != nil {
				slog.Error("Token validation failed", "error", err, "path", r.URL.Path, "method", r.Method)
				writeError(w, http.StatusUnauthorized, "Invalid or expired token")
				return
			}

			r = onSuccess(r, claims)
			next.ServeHTTP(w, r)
		})
	}
}

// extractBearerToken extracts the token from the Authorization header.
// Returns the token string and true if successful, empty string and false otherwise.
func extractBearerToken(r *http.Request) (string, bool) {
	authHeaderValue := r.Header.Get(authHeader)
	if authHeaderValue == "" {
		return "", false
	}

	parts := strings.SplitN(authHeaderValue, " ", 2)
	if len(parts) != 2 || strings.ToLower(parts[0]) != bearerToken {
		return "", false
	}

	token := strings.TrimSpace(parts[1])
	if token == "" {
		return "", false
	}
	return token, true
}

// Writes an error message as a JSON response with the given status code.
func writeError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"message": message})
}
