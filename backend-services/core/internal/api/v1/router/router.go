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
	"net/http"

	"github.com/opensuperapp/opensuperapp/backend-services/core/internal/api/v1/handler"
	"github.com/opensuperapp/opensuperapp/backend-services/core/internal/auth/rbac"
	"github.com/opensuperapp/opensuperapp/backend-services/core/internal/config"
	"github.com/opensuperapp/opensuperapp/backend-services/core/internal/services"

	fileservice "github.com/opensuperapp/opensuperapp/backend-services/core/plugins/file-service"
	userservice "github.com/opensuperapp/opensuperapp/backend-services/core/plugins/user-service"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
)

// NewUserRouter returns the http.Handler for user-authenticated routes (Asgardeo).
func NewUserRouter(db *gorm.DB, fcmService services.NotificationService, fileService fileservice.FileService, userService userservice.UserService, cfg *config.Config) http.Handler {
	r := chi.NewRouter()

	r.Mount("/micro-apps", MicroAppRoutes(db))
	r.Mount("/device-tokens", deviceTokenRoutes(db, fcmService))
	r.Mount("/token", TokenRoutes(db, cfg))
	r.Mount("/files", fileRoutes(fileService, cfg))
	r.Mount("/users", userRoutes(db, userService))
	r.Mount("/user-info", userInfoRoutes(userService))

	return r
}

// NewServiceRouter returns the http.Handler for service-authenticated routes (Internal IDP).
func NewServiceRouter(db *gorm.DB, fcmService services.NotificationService) http.Handler {
	r := chi.NewRouter()

	r.Mount("/notifications", NotificationRoutes(db, fcmService))

	return r
}

// NewNoAuthRouter returns the http.Handler for public/gateway routes (OAuth, JWKS).
// These routes handle authentication protocols and do not require backend-level auth middleware.
func NewNoAuthRouter(db *gorm.DB, cfg *config.Config, serviceTokenValidator services.TokenValidator, fileService fileservice.FileService) http.Handler {
	r := chi.NewRouter()

	tokenHandler := handler.NewTokenHandler(db, cfg, serviceTokenValidator)

	// OAuth  token endpoint - proxies to internal IDP for service token generation
	r.Post("/oauth/token", tokenHandler.ProxyOAuthToken)

	// JWKS endpoint - serves cached JWKS for microapp token validation
	r.Get("/.well-known/jwks.json", tokenHandler.GetJWKS)

	// Other public routes
	r.Mount("/public", PublicRoutes(fileService, cfg))

	return r
}

// PublicRoutes sets up a sub-router for public routes
func PublicRoutes(fileService fileservice.FileService, cfg *config.Config) http.Handler {
	r := chi.NewRouter()

	// GET /public/micro-app-files/download/{fileName}
	r.Get("/micro-app-files/download/{fileName}", handler.NewFileHandler(fileService, cfg.UploadFileMaxSizeMB).DownloadMicroAppFile)

	return r
}

// MicroAppRoutes sets up a sub-router for all endpoints prefixed with /micro-apps.
func MicroAppRoutes(db *gorm.DB) http.Handler {
	r := chi.NewRouter()

	// Initialize Microapp Handlers
	microappHandler := handler.NewMicroAppHandler(db)
	microappVersionHandler := handler.NewMicroAppVersionHandler(db)

	// GET /micro-apps
	r.Get("/", microappHandler.GetAll)

	// GET /micro-apps/{appID}
	r.Get("/{appID}", microappHandler.GetByID)

	// POST /micro-apps (admin only)
	r.
		With(rbac.RequireGroups(rbac.GroupAdmin)).
		Post("/", microappHandler.Upsert)

	// PUT /micro-apps/deactivate/{appID} (admin only)
	r.
		With(rbac.RequireGroups(rbac.GroupAdmin)).
		Put("/deactivate/{appID}", microappHandler.Deactivate)

	// POST /micro-apps/{appID}/versions (admin only)
	r.
		With(rbac.RequireGroups(rbac.GroupAdmin)).
		Post("/{appID}/versions", microappVersionHandler.UpsertVersion)

	return r
}

// DeviceTokenRoutes sets up a sub-router for device token endpoints
func deviceTokenRoutes(db *gorm.DB, fcmService services.NotificationService) http.Handler {
	r := chi.NewRouter()

	notificationHandler := handler.NewNotificationHandler(db, fcmService)

	// POST /device-tokens
	r.Post("/", notificationHandler.RegisterDeviceToken)

	// DELETE /device-tokens
	r.Delete("/", notificationHandler.DeactivateDeviceToken)

	return r
}

// NotificationRoutes sets up a sub-router for notification endpoints
func NotificationRoutes(db *gorm.DB, fcmService services.NotificationService) http.Handler {
	r := chi.NewRouter()

	notificationHandler := handler.NewNotificationHandler(db, fcmService)

	// POST /notifications/send
	r.Post("/send", notificationHandler.SendNotification)

	return r
}

// TokenRoutes sets up a sub-router for token endpoints
func TokenRoutes(db *gorm.DB, cfg *config.Config) http.Handler {
	r := chi.NewRouter()

	tokenHandler := handler.NewTokenHandler(db, cfg, nil) // nil as JWKS not needed for token exchange

	// POST /token/exchange - Exchange user token for microapp token (requires user auth)
	r.Post("/exchange", tokenHandler.ExchangeToken)

	return r
}

// fileRoutes sets up a sub-router for file operations.
func fileRoutes(fileService fileservice.FileService, cfg *config.Config) http.Handler {
	r := chi.NewRouter()

	fileHandler := handler.NewFileHandler(fileService, cfg.UploadFileMaxSizeMB)

	// POST /files?fileName=xxx
	r.
		With(rbac.RequireGroups(rbac.GroupAdmin)).
		Post("/", fileHandler.UploadFile)

	// DELETE /files?fileName=xxx
	r.
		With(rbac.RequireGroups(rbac.GroupAdmin)).
		Delete("/", fileHandler.DeleteFile)

	return r
}

// userInfoRoutes sets up a sub-router for /user-info endpoint.
func userInfoRoutes(userService userservice.UserService) http.Handler {
	r := chi.NewRouter()

	userHandler := handler.NewUserHandler(userService)

	// GET /user-info - Get current logged-in user's info
	r.Get("/", userHandler.GetUserInfo)

	return r
}

// userRoutes sets up a sub-router for all endpoints prefixed with /users.
func userRoutes(db *gorm.DB, userService userservice.UserService) http.Handler {
	r := chi.NewRouter()

	// Initialize User Config Handler
	userConfigHandler := handler.NewUserConfigHandler(db)
	userHandler := handler.NewUserHandler(userService)

	// GET /users
	r.
		With(rbac.RequireGroups(rbac.GroupAdmin)).
		Get("/", userHandler.GetAll)

	// POST /users
	r.
		With(rbac.RequireGroups(rbac.GroupAdmin)).
		Post("/", userHandler.Upsert)

	// DELETE /users/{email}
	r.
		With(rbac.RequireGroups(rbac.GroupAdmin)).
		Delete("/{email}", userHandler.Delete)

	// GET /users/app-configs
	r.Get("/app-configs", userConfigHandler.GetAppConfigs)

	// POST /users/app-configs
	r.Post("/app-configs", userConfigHandler.UpsertAppConfig)

	return r
}
