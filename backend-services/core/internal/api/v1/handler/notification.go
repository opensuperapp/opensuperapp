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

	"github.com/opensuperapp/opensuperapp/backend-services/core/internal/api/v1/dto"
	"github.com/opensuperapp/opensuperapp/backend-services/core/internal/auth"
	"github.com/opensuperapp/opensuperapp/backend-services/core/internal/models"
	"github.com/opensuperapp/opensuperapp/backend-services/core/internal/services"

	"gorm.io/gorm"
)

type NotificationHandler struct {
	db         *gorm.DB
	fcmService services.NotificationService
}

func NewNotificationHandler(db *gorm.DB, fcmService services.NotificationService) *NotificationHandler {
	return &NotificationHandler{
		db:         db,
		fcmService: fcmService,
	}
}

func (h *NotificationHandler) RegisterDeviceToken(w http.ResponseWriter, r *http.Request) {
	userInfo, ok := auth.GetUserInfo(r.Context())
	if !ok {
		http.Error(w, errUserInfoNotFound, http.StatusUnauthorized)
		return
	}
	if !validateContentType(w, r) {
		return
	}
	limitRequestBody(w, r, 0)
	var req dto.RegisterDeviceTokenRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, errInvalidRequestBody, http.StatusBadRequest)
		return
	}
	if !validateStruct(w, &req) {
		return
	}
	if req.Email != userInfo.Email {
		http.Error(w, errEmailDoesNotMatchAuthUser, http.StatusForbidden)
		return
	}
	deviceToken := models.DeviceToken{
		UserEmail:   req.Email,
		DeviceToken: req.Token,
		Platform:    req.Platform,
		IsActive:    true,
	}
	result := h.db.Where("user_email = ? AND platform = ?", req.Email, req.Platform).
		Assign(models.DeviceToken{
			DeviceToken: req.Token,
			IsActive:    true,
		}).
		FirstOrCreate(&deviceToken)

	if result.Error != nil {
		slog.Error("Failed to register device token", "error", result.Error, "email", req.Email)
		http.Error(w, errFailedToRegisterDeviceToken, http.StatusInternalServerError)
		return
	}
	slog.Info("Device token registered successfully", "email", req.Email, "platform", req.Platform)
	w.WriteHeader(http.StatusCreated)
}

func (h *NotificationHandler) DeactivateDeviceToken(w http.ResponseWriter, r *http.Request) {
	userInfo, ok := auth.GetUserInfo(r.Context())
	if !ok {
		http.Error(w, errUserInfoNotFound, http.StatusUnauthorized)
		return
	}
	if !validateContentType(w, r) {
		return
	}
	limitRequestBody(w, r, 0)
	var req dto.DeactivateDeviceTokenRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, errInvalidRequestBody, http.StatusBadRequest)
		return
	}
	if !validateStruct(w, &req) {
		return
	}
	if req.Email != userInfo.Email {
		http.Error(w, errEmailDoesNotMatchAuthUser, http.StatusForbidden)
		return
	}

	// Find and deactivate the device token
	var deviceToken models.DeviceToken
	result := h.db.Where("user_email = ? AND device_token = ? AND platform = ?",
		req.Email, req.Token, req.Platform).
		First(&deviceToken)

	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			slog.Warn("Device token not found for deactivation", "email", req.Email, "platform", req.Platform)
			http.Error(w, errDeviceTokenNotFound, http.StatusNotFound)
			return
		}
		slog.Error("Failed to find device token", "error", result.Error, "email", req.Email)
		http.Error(w, errFailedToDeactivateDeviceToken, http.StatusInternalServerError)
		return
	}

	// Update to deactivate
	deviceToken.IsActive = false
	if err := h.db.Save(&deviceToken).Error; err != nil {
		slog.Error("Failed to deactivate device token", "error", err, "email", req.Email)
		http.Error(w, errFailedToDeactivateDeviceToken, http.StatusInternalServerError)
		return
	}

	slog.Info("Device token deactivated successfully", "email", req.Email, "platform", req.Platform)
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Device token deactivated successfully"})
}

func (h *NotificationHandler) SendNotification(w http.ResponseWriter, r *http.Request) {
	if h.fcmService == nil {
		http.Error(w, errNotificationServiceNotAvailable, http.StatusServiceUnavailable)
		return
	}
	if !validateContentType(w, r) {
		return
	}
	limitRequestBody(w, r, 0)
	var req dto.SendNotificationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, errInvalidRequestBody, http.StatusBadRequest)
		return
	}
	if !validateStruct(w, &req) {
		return
	}
	// in this context client id is the microapp id
	microappID, err := h.getClientID(r)
	if err != nil {
		slog.Error(errClientIDInvalid, "error", err)
		http.Error(w, errClientIDInvalid, http.StatusUnauthorized)
		return
	}
	var deviceTokens []models.DeviceToken
	if err := h.db.Where("user_email IN ? AND is_active = ?", req.UserEmails, true).Find(&deviceTokens).Error; err != nil {
		slog.Error("Failed to fetch device tokens", "error", err)
		http.Error(w, errFailedToFetchDeviceTokens, http.StatusInternalServerError)
		return
	}
	if len(deviceTokens) == 0 {
		slog.Warn("No active device tokens found for users", "users", req.UserEmails)
		writeJSON(w, http.StatusOK, dto.NotificationResponse{Success: 0, Failed: 0, Message: msgNoActiveDeviceTokensFound})
		return
	}
	tokens := make([]string, len(deviceTokens))
	for i, dt := range deviceTokens {
		tokens[i] = dt.DeviceToken
	}
	dataStr := h.prepareFCMData(req.Data, microappID)
	successCount, failureCount, err := h.fcmService.SendMulticastNotification(r.Context(), tokens, req.Title, req.Body, dataStr)
	if err != nil {
		slog.Error("Failed to send notifications", "error", err)
		http.Error(w, errFailedToSendNotifications, http.StatusInternalServerError)
		return
	}
	status := statusSent
	if failureCount > 0 {
		status = statusPartialFailure
	}
	h.logNotifications(req.UserEmails, req.Title, req.Body, microappID, status, req.Data)
	slog.Info("Notifications sent", "success", successCount, "failed", failureCount, "microapp_id", microappID)
	response := dto.NotificationResponse{Success: successCount, Failed: failureCount, Message: msgNotificationsSentSuccessfully}
	writeJSON(w, http.StatusOK, response)
}

// helper functions

func (h *NotificationHandler) getClientID(r *http.Request) (string, error) {
	serviceInfo, ok := auth.GetServiceInfo(r.Context())
	if !ok {
		return "", errors.New(errServiceInfoNotFound)
	}
	if serviceInfo.ClientID == "" {
		slog.Warn("Client ID is empty in service info")
		return "", errors.New(errClientIDEmpty)
	}
	return serviceInfo.ClientID, nil
}

func (h *NotificationHandler) prepareFCMData(data map[string]interface{}, microappID string) map[string]string {
	// Converts the given data map to a map of string to string, marshalling non-string values to JSON strings.
	// Also adds the microappID to the data if it's not empty.
	dataStr := make(map[string]string)
	for k, v := range data {
		if str, ok := v.(string); ok {
			dataStr[k] = str
		} else {
			if bytes, err := json.Marshal(v); err == nil {
				dataStr[k] = string(bytes)
			}
		}
	}
	if microappID != "" {
		dataStr[dataKeyMicroappID] = microappID
	}
	return dataStr
}

func (h *NotificationHandler) logNotifications(userEmails []string, title, body, microappID, status string, data map[string]interface{}) {
	for _, email := range userEmails {
		log := models.NotificationLog{
			UserEmail:  email,
			Title:      &title,
			Body:       &body,
			Data:       data,
			Status:     &status,
			MicroappID: &microappID,
		}
		if err := h.db.Create(&log).Error; err != nil {
			slog.Error("Failed to log notification", "error", err, "email", email)
		}
	}
}
