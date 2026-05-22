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
package config

import (
	"fmt"
	"log/slog"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

const (
	fileServiceConfigPrefix = "FILE_SERVICE_"
	userServiceConfigPrefix = "USER_SERVICE_"
)

type Config struct {
	DBUser            string
	DBPassword        string
	DBHost            string
	DBPort            string
	DBName            string
	DBMaxOpenConns    int
	DBMaxIdleConns    int
	DBConnMaxLifetime int // in minutes
	DBConnMaxIdleTime int // in minutes
	DBConnectRetries  int
	ServerPort        string

	FirebaseCredentialsPath string

	// External IDP (Asgardeo) - for user authentication
	ExternalIdPJWKSURL  string
	ExternalIdPIssuer   string
	ExternalIdPAudience string

	// Internal IDP (go-idp) - for service authentication
	InternalIdPBaseURL  string
	InternalIdPIssuer   string
	InternalIdPAudience string

	// File Service
	FileServiceType string

	// User Service
	UserServiceType string

	// File Upload
	UploadFileMaxSizeMB int // Maximum file upload size in megabytes

	// rawEnv stores all environment variables for plugin configuration.
	// This field is unexported to prevent direct access to sensitive data.
	// Use GetPluginConfig() to access filtered configuration by prefix.
	rawEnv map[string]any
}

func Load() *Config {
	// Load .env file if it exists (optional, won't error if missing)
	if err := godotenv.Load(); err != nil {
		slog.Warn("No .env file found, using environment variables or defaults")
	}

	// Capture all environment variables
	rawEnv := make(map[string]any)
	for _, env := range os.Environ() {
		pair := strings.SplitN(env, "=", 2)
		if len(pair) == 2 {
			rawEnv[pair[0]] = pair[1]
		}
	}

	cfg := &Config{
		DBUser:            getEnvRequired("DB_USER"),
		DBPassword:        getEnvRequired("DB_PASSWORD"),
		DBHost:            getEnvRequired("DB_HOST"),
		DBPort:            getEnvRequired("DB_PORT"),
		DBName:            getEnvRequired("DB_NAME"),
		DBMaxOpenConns:    getEnvInt("DB_MAX_OPEN_CONNS", 25),
		DBMaxIdleConns:    getEnvInt("DB_MAX_IDLE_CONNS", 5),
		DBConnMaxLifetime: getEnvInt("DB_CONN_MAX_LIFETIME_MIN", 30),
		DBConnMaxIdleTime: getEnvInt("DB_CONN_MAX_IDLE_TIME_MIN", 5),
		DBConnectRetries:  getEnvInt("DB_CONNECT_RETRIES", 5),
		ServerPort:        getEnv("SERVER_PORT", "9090"),

		FirebaseCredentialsPath: getEnv("FIREBASE_CREDENTIALS_PATH", ""),

		// External IDP (Asgardeo)
		ExternalIdPJWKSURL:  getEnvRequired("EXTERNAL_IDP_JWKS_URL"),
		ExternalIdPIssuer:   getEnvRequired("EXTERNAL_IDP_ISSUER"),
		ExternalIdPAudience: getEnvRequired("EXTERNAL_IDP_AUDIENCE"),

		// Internal IDP (go-idp)
		InternalIdPBaseURL:  getEnvRequired("INTERNAL_IDP_BASE_URL"),
		InternalIdPIssuer:   getEnvRequired("INTERNAL_IDP_ISSUER"),
		InternalIdPAudience: getEnvRequired("INTERNAL_IDP_AUDIENCE"),

		// File Service
		FileServiceType: getEnv("FILE_SERVICE_TYPE", "db"),

		// User Service
		UserServiceType: getEnv("USER_SERVICE_TYPE", "db"),

		// File Upload
		UploadFileMaxSizeMB: getEnvInt("UPLOAD_FILE_MAX_SIZE_MB", 20),

		rawEnv: rawEnv,
	}

	slog.Info("Configuration loaded", "server_port", cfg.ServerPort, "db_host", cfg.DBHost)
	return cfg
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func getEnvRequired(key string) string {
	value := os.Getenv(key)
	if value == "" {
		slog.Error("Missing required environment variable", "key", key)
		// We panic here because the application cannot function without these values.
		// In a production environment, this will cause the pod/container to crash loop,
		// which is preferable to running in an undefined state.
		panic(fmt.Sprintf("Missing required environment variable: %s", key))
	}
	return value
}

func getEnvInt(key string, fallback int) int {
	if value := os.Getenv(key); value != "" {
		var intValue int
		if _, err := fmt.Sscanf(value, "%d", &intValue); err == nil {
			return intValue
		}
		slog.Warn("Invalid integer value for environment variable, using default", "key", key, "value", value, "default", fallback)
	}
	return fallback
}

// get file service config
func (c *Config) GetFileServiceConfig() map[string]any {
	return c.GetPluginConfig(fileServiceConfigPrefix)
}

// get user service config
func (c *Config) GetUserServiceConfig() map[string]any {
	return c.GetPluginConfig(userServiceConfigPrefix)
}

// GetPluginConfig returns a map of environment variables that start with the given prefix.
// This provides controlled access to environment variables without exposing all secrets.
// Only variables matching the prefix are returned, limiting exposure of sensitive data.
func (c *Config) GetPluginConfig(prefix string) map[string]any {
	filtered := make(map[string]any)
	for k, v := range c.rawEnv {
		if strings.HasPrefix(k, prefix) {
			filtered[k] = v
		}
	}
	return filtered
}
