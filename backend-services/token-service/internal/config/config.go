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

	"github.com/joho/godotenv"
)

const (
	rootEnvFile = ".env"
)

type Config struct {
	Port           string
	DBUser         string
	DBPassword     string
	DBHost         string
	DBPort         string
	DBName         string
	DBDSN          string
	PrivateKeyPath string
	PublicKeyPath  string
	JWKSPath       string
	KeysDir        string // Directory containing multiple key pairs (for zero-downtime rotation)
	ActiveKeyID    string
	TokenExpiry    int
}

func Load() *Config {

	if err := godotenv.Load(rootEnvFile); err != nil {
		slog.Warn("No .env file found, using environment variables or defaults")
	}

	cfg := &Config{
		Port:           getEnv("PORT", "8081"),
		DBUser:         getEnv("DB_USER", "root"),
		DBPassword:     getEnv("DB_PASSWORD", "password"),
		DBHost:         getEnv("DB_HOST", "127.0.0.1"),
		DBPort:         getEnv("DB_PORT", "3306"),
		DBName:         getEnv("DB_NAME", "superapp"),
		PrivateKeyPath: getEnv("PRIVATE_KEY_PATH", "private_key.pem"),
		PublicKeyPath:  getEnv("PUBLIC_KEY_PATH", "public_key.pem"),
		JWKSPath:       getEnv("JWKS_PATH", "jwks.json"),
		KeysDir:        getEnv("KEYS_DIR", ""), // Empty means use single-key mode
		ActiveKeyID:    getEnv("ACTIVE_KEY_ID", "superapp-key-1"),
		TokenExpiry:    getEnvInt("TOKEN_EXPIRY_SECONDS", 3600),
	}

	// Construct DSN
	// Format: user:password@tcp(host:port)/dbname?charset=utf8mb4&parseTime=True&loc=Local
	cfg.DBDSN = fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		cfg.DBUser, cfg.DBPassword, cfg.DBHost, cfg.DBPort, cfg.DBName)

	return cfg
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
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
