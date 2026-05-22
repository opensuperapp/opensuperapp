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
package router

import (
	"log/slog"
	"net/http"

	v1 "github.com/opensuperapp/opensuperapp/backend-services/core/internal/api/v1/router"
	"github.com/opensuperapp/opensuperapp/backend-services/core/internal/auth"
	"github.com/opensuperapp/opensuperapp/backend-services/core/internal/config"
	"github.com/opensuperapp/opensuperapp/backend-services/core/internal/services"

	// pluggable services
	fileservice "github.com/opensuperapp/opensuperapp/backend-services/core/plugins/file-service"
	userservice "github.com/opensuperapp/opensuperapp/backend-services/core/plugins/user-service"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"gorm.io/gorm"
)

const (
	apiV1Prefix         = "/api/v1"
	userRoutesPrefix    = apiV1Prefix
	serviceRoutesPrefix = apiV1Prefix + "/services"
)

func NewRouter(db *gorm.DB, cfg *config.Config) http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	// set up validators and services

	// Initialize User Token Validator (External IDP)
	externalIDPValidator, err := services.NewTokenValidatorWithJWKSURL(
		cfg.ExternalIdPJWKSURL,
		cfg.ExternalIdPIssuer,
		cfg.ExternalIdPAudience,
	)
	if err != nil {
		slog.Error("Failed to initialize External IDP Validator", "error", err)
		panic("External IDP Validator is required but failed to initialize")
	} else {
		slog.Info("External IDP Validator initialized successfully", "issuer", cfg.ExternalIdPIssuer)
	}

	// Initialize Service Token Validator (Internal IDP)
	internalIDPValidator, err := services.NewTokenValidator(cfg.InternalIdPBaseURL, cfg.InternalIdPIssuer, cfg.InternalIdPAudience)
	if err != nil {
		slog.Error("Failed to initialize Internal IDP Validator", "error", err)
		panic("Internal IDP Validator is required but failed to initialize")
	} else {
		slog.Info("Internal IDP Validator initialized successfully", "idp_url", cfg.InternalIdPBaseURL)
	}

	// Initialize FCM service
	var fcmService services.NotificationService
	if cfg.FirebaseCredentialsPath != "" {
		fcmService, err = services.NewFCMService(cfg.FirebaseCredentialsPath)
		if err != nil {
			slog.Error("Failed to initialize FCM service", "error", err)
		} else {
			slog.Info("FCM service initialized successfully")
		}
	} else {
		slog.Warn("Firebase credentials path not configured, notification features will be unavailable")
	}

	// Initialize File Service
	fileServiceConfig := cfg.GetFileServiceConfig()
	fileServiceConfig["DB"] = db // Add the database connection access for default db file service (and db user service)
	fileService, err := fileservice.Registry.Get(cfg.FileServiceType, fileServiceConfig)
	if err != nil {
		slog.Error("Failed to initialize File Service", "type", cfg.FileServiceType, "error", err)
		panic(err)
	} else {
		slog.Info("File Service initialized successfully", "type", cfg.FileServiceType)
	}

	// Initialize User Service
	userConfig := cfg.GetUserServiceConfig()
	userConfig["DB"] = db // Add the database connection access for default db user service
	userService, err := userservice.Registry.Get(cfg.UserServiceType, userConfig)
	if err != nil {
		slog.Error("Failed to initialize User Service", "type", cfg.UserServiceType, "error", err)
		panic(err)
	} else {
		slog.Info("User Service initialized successfully", "type", cfg.UserServiceType)
	}

	// set up routes
	// v1

	// Public Routes (no authentication required)
	// Auth Router (Gateway/Public - OAuth, JWKS)
	r.Mount("/", v1.NewNoAuthRouter(db, cfg, internalIDPValidator, fileService))

	// User Authenticated Routes (validates against External IDP)
	r.Route(userRoutesPrefix, func(r chi.Router) {
		r.Use(auth.AuthMiddleware(externalIDPValidator))
		r.Mount("/", v1.NewUserRouter(db, fcmService, fileService, userService, cfg))
	})

	// Service Routes (validates against Internal IDP)
	r.Route(serviceRoutesPrefix, func(r chi.Router) {
		r.Use(auth.ServiceOAuthMiddleware(internalIDPValidator))
		r.Mount("/", v1.NewServiceRouter(db, fcmService))
	})

	return r
}
