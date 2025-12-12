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
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"

	"github.com/opensuperapp/opensuperapp/backend-services/core/internal/api/v1/dto"
	"github.com/opensuperapp/opensuperapp/backend-services/core/internal/auth"
	"github.com/opensuperapp/opensuperapp/backend-services/core/internal/models"

	userservice "github.com/opensuperapp/opensuperapp/backend-services/core/plugins/user-service"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
)

const (
	userRequestBodyLimit = 1 << 20 // 1MB default limit
)

type UserHandler struct {
	userService userservice.UserService
}

func NewUserHandler(userService userservice.UserService) *UserHandler {
	return &UserHandler{
		userService: userService,
	}
}

// GetUserInfo retrieves the currently logged-in user's information.
func (h *UserHandler) GetUserInfo(w http.ResponseWriter, r *http.Request) {
	// Get user info from context (set by auth middleware)
	userInfo, ok := auth.GetUserInfo(r.Context())
	if !ok {
		http.Error(w, "user info not found in context", http.StatusUnauthorized)
		return
	}

	user, err := h.userService.GetUserByEmail(userInfo.Email)
	if err != nil {
		slog.Error("Failed to fetch user info", "error", err, "email", userInfo.Email)
		http.Error(w, "failed to fetch user information", http.StatusInternalServerError)
		return
	}

	if user == nil {
		slog.Warn("User not found", "email", userInfo.Email)
		http.Error(w, "user not found", http.StatusNotFound)
		return
	}

	response := dto.UserResponse{
		Email:         user.Email,
		FirstName:     user.FirstName,
		LastName:      user.LastName,
		UserThumbnail: user.UserThumbnail,
		Location:      user.Location,
	}

	if err := writeJSON(w, http.StatusOK, response); err != nil {
		slog.Error("Failed to write JSON response", "error", err)
		http.Error(w, "failed to write response", http.StatusInternalServerError)
	}
}

// GetAll retrieves all users from the system.
func (h *UserHandler) GetAll(w http.ResponseWriter, r *http.Request) {
	users, err := h.userService.GetAllUsers()
	if err != nil {
		slog.Error("Failed to fetch all users", "error", err)
		http.Error(w, "failed to fetch users", http.StatusInternalServerError)
		return
	}

	response := make([]dto.UserResponse, 0, len(users))
	for _, user := range users {
		response = append(response, dto.UserResponse{
			Email:         user.Email,
			FirstName:     user.FirstName,
			LastName:      user.LastName,
			UserThumbnail: user.UserThumbnail,
			Location:      user.Location,
		})
	}

	if err := writeJSON(w, http.StatusOK, response); err != nil {
		slog.Error("Failed to write JSON response", "error", err)
		http.Error(w, "failed to write response", http.StatusInternalServerError)
	}
}

// Upsert creates a new user(s) or updates an existing one.
func (h *UserHandler) Upsert(w http.ResponseWriter, r *http.Request) {
	if !validateContentType(w, r) {
		return
	}

	limitRequestBody(w, r, userRequestBodyLimit)

	requests, isBulk, err := parseUpsertPayload(r.Body)
	if err != nil {
		slog.Error("Invalid request body for upsert", "error", err)
		var maxBytesErr *http.MaxBytesError
		if errors.As(err, &maxBytesErr) {
			http.Error(w, "request body too large", http.StatusRequestEntityTooLarge)
			return
		}
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	users, valid := convertAndValidateRequests(w, requests)
	if !valid {
		return
	}
	if len(users) == 0 {
		http.Error(w, "empty request body", http.StatusBadRequest)
		return
	}
	// Bulk user upsert
	if isBulk {
		if err := h.userService.UpsertUsers(users); err != nil {
			slog.Error("Failed to upsert bulk users", "error", err, "count", len(users))
			http.Error(w, "failed to upsert bulk users", http.StatusInternalServerError)
			return
		}
		if err := writeJSON(w, http.StatusCreated, map[string]string{"message": "Users created/updated successfully"}); err != nil {
			slog.Error("Failed to write JSON response", "error", err)
		}
		return
	}

	// Single user upsert
	if err := h.userService.UpsertUser(users[0]); err != nil {
		slog.Error("Failed to upsert user", "error", err, "email", users[0].Email)
		http.Error(w, "failed to upsert user", http.StatusInternalServerError)
		return
	}

	if err := writeJSON(w, http.StatusCreated, map[string]string{
		"message": "User created/updated successfully",
	}); err != nil {
		slog.Error("Failed to write JSON response", "error", err)
	}
}

// Delete removes a user by their email address.
func (h *UserHandler) Delete(w http.ResponseWriter, r *http.Request) {
	email := chi.URLParam(r, "email")
	if email == "" {
		http.Error(w, "missing email parameter", http.StatusBadRequest)
		return
	}

	err := h.userService.DeleteUser(email)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			http.Error(w, "user not found", http.StatusNotFound)
		} else {
			slog.Error("Failed to delete user", "error", err, "email", email)
			http.Error(w, "failed to delete user", http.StatusInternalServerError)
		}
		return
	}

	if err := writeJSON(w, http.StatusOK, map[string]string{"message": "User deleted successfully"}); err != nil {
		slog.Error("Failed to write JSON response", "error", err)
		http.Error(w, "failed to write response", http.StatusInternalServerError)
	}
}

// Helper functions

// parseUpsertPayload parses the request body for upsert user(s) operation.
// Returns the parsed requests, whether it's a bulk operation, and any error.
func parseUpsertPayload(body io.ReadCloser) ([]dto.UpsertUserRequest, bool, error) {
	var rawBody json.RawMessage
	if err := json.NewDecoder(body).Decode(&rawBody); err != nil {
		return nil, false, err
	}

	trimmed := bytes.TrimSpace(rawBody)
	if len(trimmed) == 0 {
		return nil, false, fmt.Errorf("empty request body")
	}
	// Check if it's an array by looking at the first character
	if trimmed[0] == '[' {
		var requests []dto.UpsertUserRequest
		if err := json.Unmarshal(trimmed, &requests); err != nil {
			return nil, true, err
		}
		return requests, true, nil
	}

	// Single object
	var request dto.UpsertUserRequest
	if err := json.Unmarshal(trimmed, &request); err != nil {
		return nil, false, err
	}
	return []dto.UpsertUserRequest{request}, false, nil
}

// convertAndValidateRequests converts DTOs to models and validates them.
// Returns the converted users and whether validation succeeded.
func convertAndValidateRequests(w http.ResponseWriter, reqs []dto.UpsertUserRequest) ([]*models.User, bool) {
	users := make([]*models.User, 0, len(reqs))

	for _, r := range reqs {
		if !validateStruct(w, &r) {
			return nil, false
		}

		users = append(users, &models.User{
			Email:         r.Email,
			FirstName:     r.FirstName,
			LastName:      r.LastName,
			UserThumbnail: r.UserThumbnail,
			Location:      r.Location,
		})
	}

	return users, true
}
