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
package main

import (
	"log/slog"
	"net/http"
	"os"

	"github.com/opensuperapp/opensuperapp/backend-services/token-service/internal/api/v1/router"
	"github.com/opensuperapp/opensuperapp/backend-services/token-service/internal/config"
	"github.com/opensuperapp/opensuperapp/backend-services/token-service/internal/services"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func main() {
	cfg := config.Load()

	// Initialize Logger
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	// Connect to Database
	db, err := gorm.Open(mysql.Open(cfg.DBDSN), &gorm.Config{})
	if err != nil {
		slog.Error("Failed to connect to database", "error", err)
		os.Exit(1)
	}

	// Initialize Token Service
	// Choose between directory mode (zero-downtime rotation) or single-key mode (backward compatible)
	var tokenService *services.TokenService
	if cfg.KeysDir != "" {
		// Directory mode: Load all keys from directory
		slog.Info("Initializing token service in directory mode", "keys_dir", cfg.KeysDir, "active_key", cfg.ActiveKeyID)
		tokenService, err = services.NewTokenServiceFromDirectory(cfg.KeysDir, cfg.ActiveKeyID, cfg.TokenExpiry)
		if err != nil {
			slog.Error("Failed to initialize token service from directory", "error", err)
			os.Exit(1)
		}
	} else {
		// Single-key mode: Load single key pair (backward compatible)
		slog.Info("Initializing token service in single-key mode", "key_id", cfg.ActiveKeyID)
		tokenService, err = services.NewTokenService(cfg.PrivateKeyPath, cfg.PublicKeyPath, cfg.JWKSPath, cfg.TokenExpiry)
		if err != nil {
			slog.Error("Failed to initialize token service", "error", err)
			os.Exit(1)
		}

		// Set active key from config (allows override via environment variable)
		if cfg.ActiveKeyID != "" {
			if err := tokenService.SetActiveKey(cfg.ActiveKeyID); err != nil {
				slog.Warn("Failed to set active key from config, using default", "error", err, "default_key", tokenService.GetActiveKeyID())
			}
		}
	}

	// Initialize Router
	r := router.NewRouter(db, tokenService)

	// Start Server
	slog.Info("Starting IdP Service", "port", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, r); err != nil {
		slog.Error("Server failed", "error", err)
		os.Exit(1)
	}
}
