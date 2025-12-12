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

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
)

type MicroAppVersionHandler struct {
	db *gorm.DB
}

func NewMicroAppVersionHandler(db *gorm.DB) *MicroAppVersionHandler {
	return &MicroAppVersionHandler{db: db}
}

// UpsertVersion handles creating or updating a version for a micro app
func (h *MicroAppVersionHandler) UpsertVersion(w http.ResponseWriter, r *http.Request) {
	// Get user info from context (set by auth middleware)
	userInfo, ok := auth.GetUserInfo(r.Context())
	if !ok {
		http.Error(w, "user info not found in context", http.StatusUnauthorized)
		return
	}
	userEmail := userInfo.Email

	appID := chi.URLParam(r, "appID")
	if appID == "" {
		http.Error(w, "missing micro_app_id", http.StatusBadRequest)
		return
	}

	var microApp models.MicroApp
	if err := h.db.Where("micro_app_id = ?", appID).First(&microApp).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			http.Error(w, "micro app not found", http.StatusNotFound)
		} else {
			slog.Error("Failed to fetch micro app", "error", err, "appID", appID)
			http.Error(w, "failed to fetch micro app", http.StatusInternalServerError)
		}
		return
	}

	if !validateContentType(w, r) {
		return
	}

	limitRequestBody(w, r, 0) // 1MB default limit
	var req dto.CreateMicroAppVersionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	// Validate request
	if !validateStruct(w, &req) {
		return
	}

	version := models.MicroAppVersion{}
	result := h.db.Where("micro_app_id = ? AND version = ? AND build = ?", appID, req.Version, req.Build).
		Assign(models.MicroAppVersion{
			ReleaseNotes: req.ReleaseNotes,
			IconURL:      req.IconURL,
			DownloadURL:  req.DownloadURL,
			Active:       models.StatusActive,
			UpdatedBy:    &userEmail,
		}).
		Attrs(models.MicroAppVersion{
			MicroAppID: appID,
			Version:    req.Version,
			Build:      req.Build,
			CreatedBy:  userEmail,
		}).FirstOrCreate(&version)

	if result.Error != nil {
		slog.Error("Failed to upsert version", "error", result.Error, "appID", appID, "version", req.Version, "build", req.Build)
		http.Error(w, "failed to upsert version", http.StatusInternalServerError)
		return
	}

	if err := writeJSON(w, http.StatusCreated, dto.MicroAppVersionResponse{
		ID:           version.ID,
		MicroAppID:   version.MicroAppID,
		Version:      version.Version,
		Build:        version.Build,
		ReleaseNotes: version.ReleaseNotes,
		IconURL:      version.IconURL,
		DownloadURL:  version.DownloadURL,
		Active:       version.Active,
	}); err != nil {
		slog.Error("Failed to write JSON response", "error", err)
		http.Error(w, "failed to write response", http.StatusInternalServerError)
	}
}
