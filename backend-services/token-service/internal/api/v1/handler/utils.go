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
package handler

import (
	"crypto/rand"
	"encoding/json"
	"net/http"

	"golang.org/x/crypto/bcrypt"
)

const (
	defaultMaxRequestBodySize = 1 << 20 // 1MB
	charset                   = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
)

// writeJSON writes data as JSON to the response with the given status code.
func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

// writeError writes a standardized OAuth2 error response.
func writeError(w http.ResponseWriter, status int, errCode, errDescription string) {
	resp := map[string]string{"error": errCode}
	if errDescription != "" {
		resp["error_description"] = errDescription
	}
	writeJSON(w, status, resp)
}

// limitRequestBody limits the size of the request body.
func limitRequestBody(w http.ResponseWriter, r *http.Request, maxBytes int64) {
	if maxBytes == 0 {
		maxBytes = defaultMaxRequestBodySize
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxBytes)
}

// hashSecret hashes a plaintext secret using bcrypt with a secure cost factor.
// The bcrypt algorithm automatically generates a per-secret salt and includes it
// in the output hash. The returned hash is safe to store in the database.
// Cost factor 12 provides a good balance of security and performance (~250ms).
func hashSecret(secret string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(secret), 12)
	if err != nil {
		return "", err
	}
	return string(hash), nil
}

// checkSecret verifies a plaintext secret against a bcrypt hash.
// This function provides constant-time comparison (timing-safe) automatically
// via bcrypt's internal implementation, preventing timing attacks.
// Returns nil if the secret matches the hash, otherwise returns an error.
func checkSecret(secret, hash string) error {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(secret))
}

// generateSecureSecret generates a cryptographically secure random secret
func generateSecureSecret(length int) (string, error) {
	b := make([]byte, length)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	for i := range b {
		b[i] = charset[b[i]%byte(len(charset))]
	}
	return string(b), nil
}
