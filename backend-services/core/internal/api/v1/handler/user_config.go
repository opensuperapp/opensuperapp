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
	"log/slog"
	"net/http"

	"github.com/opensuperapp/opensuperapp/backend-services/core/internal/api/v1/dto"
	"github.com/opensuperapp/opensuperapp/backend-services/core/internal/auth"
	"github.com/opensuperapp/opensuperapp/backend-services/core/internal/models"

	"gorm.io/gorm"
)

type UserConfigHandler struct {
	db *gorm.DB
}

func NewUserConfigHandler(db *gorm.DB) *UserConfigHandler {
	return &UserConfigHandler{db: db}
}

// GetAppConfigs retrieves all active configurations for the logged-in user
func (h *UserConfigHandler) GetAppConfigs(w http.ResponseWriter, r *http.Request) {
	userInfo, ok := auth.GetUserInfo(r.Context())
	if !ok {
		http.Error(w, errUserInfoNotFound, http.StatusUnauthorized)
		return
	}
	var configs []models.UserConfig
	if err := h.db.Where("email = ? AND active = ?", userInfo.Email, 1).Find(&configs).Error; err != nil {
		slog.Error("Failed to fetch user configs", "error", err, "email", userInfo.Email)
		http.Error(w, errFailedToFetchUserConfigs, http.StatusInternalServerError)
		return
	}
	var response []dto.UserConfigResponse
	for _, config := range configs {
		response = append(response, dto.UserConfigResponse{
			Email:       config.Email,
			ConfigKey:   config.ConfigKey,
			ConfigValue: config.ConfigValue,
			IsActive:    config.Active,
		})
	}
	if err := writeJSON(w, http.StatusOK, response); err != nil {
		slog.Error("Failed to write JSON response", "error", err)
		http.Error(w, errFailedToWriteResponse, http.StatusInternalServerError)
	}
}

// UpsertAppConfig creates or updates a user configuration
func (h *UserConfigHandler) UpsertAppConfig(w http.ResponseWriter, r *http.Request) {
	userInfo, ok := auth.GetUserInfo(r.Context())
	if !ok {
		http.Error(w, errUserInfoNotFound, http.StatusUnauthorized)
		return
	}
	if !validateContentType(w, r) {
		return
	}
	limitRequestBody(w, r, 0) // 1MB default limit
	var req dto.UpsertUserConfigRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, errInvalidRequestBody, http.StatusBadRequest)
		return
	}

	if !validateStruct(w, &req) {
		return
	}
	if req.IsActive == 0 {
		req.IsActive = 1
	}
	config := models.UserConfig{}
	result := h.db.Where("email = ? AND config_key = ?", userInfo.Email, req.ConfigKey).
		Assign(models.UserConfig{
			ConfigValue: req.ConfigValue,
			Active:      req.IsActive,
			UpdatedBy:   userInfo.Email,
		}).
		Attrs(models.UserConfig{
			Email:       userInfo.Email,
			ConfigKey:   req.ConfigKey,
			ConfigValue: req.ConfigValue,
			CreatedBy:   userInfo.Email,
		}).FirstOrCreate(&config)
	if result.Error != nil {
		slog.Error("Failed to upsert user config", "error", result.Error, "email", userInfo.Email, "configKey", req.ConfigKey)
		http.Error(w, errFailedToUpsertUserConfig, http.StatusInternalServerError)
		return
	}
	if err := writeJSON(w, http.StatusCreated, map[string]string{"message": msgConfigurationUpdatedSuccessfully}); err != nil {
		slog.Error("Failed to write JSON response", "error", err)
		http.Error(w, errFailedToWriteResponse, http.StatusInternalServerError)
	}
}
