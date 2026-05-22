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
	"encoding/json"
	"fmt"
	"mime"
	"net/http"
	"strings"
	"unicode"

	"github.com/go-playground/validator/v10"
)

var validate = validator.New()

// Writes the given data as JSON to the HTTP response with the specified status code.
func writeJSON(w http.ResponseWriter, status int, data any) error {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		return fmt.Errorf("failed to encode JSON: %w", err)
	}
	return nil
}

// Validates a struct using the validator package and writes validation errors to the response.
func validateStruct(w http.ResponseWriter, s any) bool {
	if err := validate.Struct(s); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return false
	}
	return true
}

// Validates that the Content-Type header is application/json.
func validateContentType(w http.ResponseWriter, r *http.Request) bool {
	contentType := r.Header.Get("Content-Type")
	mediaType, _, err := mime.ParseMediaType(contentType)
	if err != nil || mediaType != "application/json" {
		http.Error(w, "Content-Type must be application/json", http.StatusUnsupportedMediaType)
		return false
	}
	return true
}

// Limits the size of the request body to prevent large payloads.
func limitRequestBody(w http.ResponseWriter, r *http.Request, maxBytes int64) {
	if maxBytes == 0 {
		maxBytes = defaultMaxRequestBodySize
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxBytes)
}

func sanitizeForHeader(s string) string {
	return strings.Map(func(r rune) rune {
		if unicode.IsControl(r) || r == '"' || r == '\'' {
			return -1 // drop the rune
		}
		return r
	}, s)
}
