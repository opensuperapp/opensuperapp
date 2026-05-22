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
	"errors"
	"log/slog"
	"net/http"
	"slices"

	"github.com/opensuperapp/opensuperapp/backend-services/core/internal/api/v1/dto"
	"github.com/opensuperapp/opensuperapp/backend-services/core/internal/auth"
	"github.com/opensuperapp/opensuperapp/backend-services/core/internal/models"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
)

type MicroAppHandler struct {
	db *gorm.DB
}

func NewMicroAppHandler(db *gorm.DB) *MicroAppHandler {
	return &MicroAppHandler{db: db}
}

// MicroAppHandler to handle fetching all micro apps
func (h *MicroAppHandler) GetAll(w http.ResponseWriter, r *http.Request) {
	userInfo, ok := auth.GetUserInfo(r.Context())
	if !ok {
		http.Error(w, errUserInfoNotFound, http.StatusUnauthorized)
		return
	}
	authorizedAppIDs, err := h.getMicroAppIDsByGroups(userInfo.Groups)
	if err != nil {
		slog.Error(errFailedToGetAuthorizedAppIDs, "error", err, "groups", userInfo.Groups)
		http.Error(w, errFailedToFetchMicroApps, http.StatusInternalServerError)
		return
	}
	if len(authorizedAppIDs) == 0 {
		if err := writeJSON(w, http.StatusOK, []dto.MicroAppResponse{}); err != nil {
			slog.Error("Failed to write JSON response", "error", err)
			http.Error(w, errFailedToWriteResponse, http.StatusInternalServerError)
		}
		return
	}
	var apps []models.MicroApp
	// Fetch only active micro apps with their active versions, roles, and configs that the user has access to
	if err := h.db.Where("active = ? AND micro_app_id IN ?", models.StatusActive, authorizedAppIDs).
		Preload("Versions", "active = ?", models.StatusActive).
		Preload("Roles", "active = ?", models.StatusActive).
		Preload("Configs", "active = ?", models.StatusActive).
		Find(&apps).Error; err != nil {
		slog.Error(errFailedToFetchMicroAppsFromDB, "error", err)
		http.Error(w, errFailedToFetchMicroApps, http.StatusInternalServerError)
		return
	}
	var response []dto.MicroAppResponse
	for _, app := range apps {
		appResponse := h.convertToResponseFromPreloaded(app)
		response = append(response, appResponse)
	}
	if err := writeJSON(w, http.StatusOK, response); err != nil {
		slog.Error("Failed to write JSON response", "error", err)
		http.Error(w, errFailedToWriteResponse, http.StatusInternalServerError)
	}
}

// MicroAppHandler to handle fetching a micro app by ID
func (h *MicroAppHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, urlParamAppID)
	if id == "" {
		http.Error(w, errMissingMicroAppID, http.StatusBadRequest)
		return
	}
	// Get user info from context (set by auth middleware)
	userInfo, ok := auth.GetUserInfo(r.Context())
	if !ok {
		http.Error(w, errUserInfoNotFound, http.StatusUnauthorized)
		return
	}
	// Get app IDs the user has access to based on their groups
	authorizedAppIDs, err := h.getMicroAppIDsByGroups(userInfo.Groups)
	if err != nil {
		slog.Error(errFailedToGetAuthorizedAppIDs, "error", err, "groups", userInfo.Groups)
		http.Error(w, errFailedToFetchMicroApp, http.StatusInternalServerError)
		return
	}
	// Check if the requested app ID is in the user's authorized list
	isAuthorized := slices.Contains(authorizedAppIDs, id)
	if !isAuthorized {
		slog.Warn(errUserNotAuthorizedToAccessApp, "appID", id, "email", userInfo.Email, "groups", userInfo.Groups)
		http.Error(w, errForbidden, http.StatusForbidden)
		return
	}
	var app models.MicroApp
	if err := h.db.Where("micro_app_id = ? AND active = ?", id, models.StatusActive).
		Preload("Versions", "active = ?", models.StatusActive).
		Preload("Roles", "active = ?", models.StatusActive).
		Preload("Configs", "active = ?", models.StatusActive).
		First(&app).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			http.Error(w, errMicroAppNotFound, http.StatusNotFound)
		} else {
			slog.Error("Failed to fetch micro app", "error", err, "appID", id)
			http.Error(w, errFailedToFetchMicroApp, http.StatusInternalServerError)
		}
		return
	}
	appResponse := h.convertToResponseFromPreloaded(app)

	if err := writeJSON(w, http.StatusOK, appResponse); err != nil {
		slog.Error("Failed to write JSON response", "error", err)
		http.Error(w, errFailedToWriteResponse, http.StatusInternalServerError)
	}
}

// MicroAppHandler to handle upserting a new micro app
func (h *MicroAppHandler) Upsert(w http.ResponseWriter, r *http.Request) {
	// Get user info from context (set by auth middleware)
	userInfo, ok := auth.GetUserInfo(r.Context())
	if !ok {
		http.Error(w, errUserInfoNotFound, http.StatusUnauthorized)
		return
	}
	userEmail := userInfo.Email

	if !validateContentType(w, r) {
		return
	}
	limitRequestBody(w, r, 0) // 1MB default limit
	var req dto.CreateMicroAppRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, errInvalidRequestBody, http.StatusBadRequest)
		return
	}
	// Validate request
	if !validateStruct(w, &req) {
		return
	}
	var app models.MicroApp
	// Use transaction to ensure app and all versions are upserted atomically
	err := h.db.Transaction(func(tx *gorm.DB) error {
		// Upsert micro app
		result := tx.Where("micro_app_id = ?", req.AppID).
			Assign(models.MicroApp{
				Name:        req.Name,
				Description: req.Description,
				IconURL:     req.IconURL,
				Mandatory:   req.Mandatory,
				Active:      models.StatusActive,
				UpdatedBy:   &userEmail,
			}).
			Attrs(models.MicroApp{
				MicroAppID: req.AppID,
				CreatedBy:  userEmail,
			}).FirstOrCreate(&app)

		if result.Error != nil {
			return result.Error
		}
		// Upsert versions if provided
		if len(req.Versions) > 0 {
			for _, versionReq := range req.Versions {
				version := models.MicroAppVersion{}
				versionResult := tx.Where("micro_app_id = ? AND version = ? AND build = ?", req.AppID, versionReq.Version, versionReq.Build).
					Assign(models.MicroAppVersion{
						ReleaseNotes: versionReq.ReleaseNotes,
						IconURL:      versionReq.IconURL,
						DownloadURL:  versionReq.DownloadURL,
						Active:       models.StatusActive,
						UpdatedBy:    &userEmail,
					}).
					Attrs(models.MicroAppVersion{
						MicroAppID: req.AppID,
						Version:    versionReq.Version,
						Build:      versionReq.Build,
						CreatedBy:  userEmail,
					}).FirstOrCreate(&version)

				if versionResult.Error != nil {
					return versionResult.Error
				}
			}
		}
		// Upsert roles if provided
		if len(req.Roles) > 0 {
			for _, roleReq := range req.Roles {
				role := models.MicroAppRole{}
				roleResult := tx.Where("micro_app_id = ? AND role = ?", req.AppID, roleReq.Role).
					Assign(models.MicroAppRole{
						Active:    models.StatusActive,
						UpdatedBy: &userEmail,
					}).
					Attrs(models.MicroAppRole{
						MicroAppID: req.AppID,
						Role:       roleReq.Role,
						CreatedBy:  userEmail,
					}).FirstOrCreate(&role)

				if roleResult.Error != nil {
					return roleResult.Error
				}
			}
		}
		// Upsert configs if provided
		if len(req.Configs) > 0 {
			for _, configReq := range req.Configs {
				config := models.MicroAppConfig{}
				configResult := tx.Where("micro_app_id = ? AND config_key = ?", req.AppID, configReq.ConfigKey).
					Assign(models.MicroAppConfig{
						ConfigValue: configReq.ConfigValue,
						Active:      models.StatusActive,
						UpdatedBy:   &userEmail,
					}).
					Attrs(models.MicroAppConfig{
						MicroAppID:  req.AppID,
						ConfigKey:   configReq.ConfigKey,
						ConfigValue: configReq.ConfigValue,
						CreatedBy:   userEmail,
					}).FirstOrCreate(&config)

				if configResult.Error != nil {
					return configResult.Error
				}
			}
		}
		return nil
	})
	if err != nil {
		slog.Error("Failed to upsert micro app", "error", err, "appID", req.AppID)
		http.Error(w, errFailedToUpsertMicroApp, http.StatusInternalServerError)
		return
	}
	// Reload with preloaded relations for response
	if err := h.db.Where("micro_app_id = ?", req.AppID).
		Preload("Versions", "active = ?", models.StatusActive).
		Preload("Roles", "active = ?", models.StatusActive).
		Preload("Configs", "active = ?", models.StatusActive).
		First(&app).Error; err != nil {
		slog.Error(errFailedToReloadMicroApp, "error", err, "appID", req.AppID)
		http.Error(w, errFailedToFetchMicroApp, http.StatusInternalServerError)
		return
	}
	appResponse := h.convertToResponseFromPreloaded(app)
	if err := writeJSON(w, http.StatusCreated, appResponse); err != nil {
		slog.Error("Failed to write JSON response", "error", err)
		http.Error(w, errFailedToWriteResponse, http.StatusInternalServerError)
	}
}

// MicroAppHandler to handle deactivating a micro app
func (h *MicroAppHandler) Deactivate(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, urlParamAppID)
	if id == "" {
		http.Error(w, errMissingMicroAppID, http.StatusBadRequest)
		return
	}
	var app models.MicroApp
	if err := h.db.Where("micro_app_id = ?", id).First(&app).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			http.Error(w, errMicroAppNotFound, http.StatusNotFound)
		} else {
			slog.Error("Failed to fetch micro app", "error", err, "appID", id)
			http.Error(w, errFailedToFetchMicroApp, http.StatusInternalServerError)
		}
		return
	}
	// Use transaction to ensure app, versions, roles, and configs are deactivated together
	err := h.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&app).Update("active", models.StatusInactive).Error; err != nil {
			return err
		}
		if err := tx.Model(&models.MicroAppVersion{}).Where("micro_app_id = ?", id).Update("active", models.StatusInactive).Error; err != nil {
			return err
		}
		if err := tx.Model(&models.MicroAppRole{}).Where("micro_app_id = ?", id).Update("active", models.StatusInactive).Error; err != nil {
			return err
		}
		if err := tx.Model(&models.MicroAppConfig{}).Where("micro_app_id = ?", id).Update("active", models.StatusInactive).Error; err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		slog.Error("Failed to deactivate micro app", "error", err, "appID", id)
		http.Error(w, errFailedToDeactivateMicroApp, http.StatusInternalServerError)
		return
	}
	if err := writeJSON(w, http.StatusOK, map[string]string{"message": msgMicroAppDeactivatedSuccessfully}); err != nil {
		slog.Error("Failed to write JSON response", "error", err)
		http.Error(w, errFailedToWriteResponse, http.StatusInternalServerError)
	}
}

// Helper Functions

// Fetches micro app IDs accessible by the given user groups
func (h *MicroAppHandler) getMicroAppIDsByGroups(groups []string) ([]string, error) {
	if len(groups) == 0 {
		slog.Warn(errNoGroupsFoundForUser)
		return []string{}, nil
	}
	var appIDs []string
	if err := h.db.Model(&models.MicroAppRole{}).
		Select("DISTINCT micro_app_id").
		Where("active = ? AND role IN ?", models.StatusActive, groups).
		Pluck("micro_app_id", &appIDs).Error; err != nil {
		return nil, err
	}
	if len(appIDs) == 0 {
		slog.Warn(errNoMicroAppsFoundForGroups, "groups", groups)
		return []string{}, nil
	}
	return appIDs, nil
}

// Converts a MicroApp model with preloaded versions, roles, and configs to response DTO
func (h *MicroAppHandler) convertToResponseFromPreloaded(app models.MicroApp) dto.MicroAppResponse {
	var versionResponses []dto.MicroAppVersionResponse
	for _, v := range app.Versions {
		versionResponses = append(versionResponses, dto.MicroAppVersionResponse{
			ID:           v.ID,
			MicroAppID:   v.MicroAppID,
			Version:      v.Version,
			Build:        v.Build,
			ReleaseNotes: v.ReleaseNotes,
			IconURL:      v.IconURL,
			DownloadURL:  v.DownloadURL,
			Active:       v.Active,
		})
	}
	var roleResponses []dto.MicroAppRoleResponse
	for _, r := range app.Roles {
		roleResponses = append(roleResponses, dto.MicroAppRoleResponse{
			ID:         r.ID,
			MicroAppID: r.MicroAppID,
			Role:       r.Role,
			Active:     r.Active,
		})
	}
	var configResponses []dto.MicroAppConfigResponse
	for _, c := range app.Configs {
		// Marshal JSONMap to json.RawMessage
		configValueBytes, err := json.Marshal(c.ConfigValue)
		if err != nil {
			slog.Error(errFailedToMarshalConfigValue, "configKey", c.ConfigKey, "error", err)
			continue
		}
		configResponses = append(configResponses, dto.MicroAppConfigResponse{
			ConfigKey:   c.ConfigKey,
			ConfigValue: json.RawMessage(configValueBytes),
		})
	}
	return dto.MicroAppResponse{
		AppID:       app.MicroAppID,
		Name:        app.Name,
		Description: app.Description,
		IconURL:     app.IconURL,
		Active:      app.Active,
		Mandatory:   app.Mandatory,
		Versions:    versionResponses,
		Roles:       roleResponses,
		Configs:     configResponses,
	}
}
