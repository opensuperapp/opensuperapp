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
package database

import (
	"fmt"
	"log/slog"
	"time"

	"github.com/opensuperapp/opensuperapp/backend-services/core/internal/config"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func Connect(cfg *config.Config) *gorm.DB {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=True",
		cfg.DBUser, cfg.DBPassword, cfg.DBHost, cfg.DBPort, cfg.DBName)

	var db *gorm.DB
	var err error

	// Retry logic for transient failures
	for i := 0; i < cfg.DBConnectRetries; i++ {
		db, err = gorm.Open(mysql.Open(dsn), &gorm.Config{})
		if err == nil {
			break
		}
		slog.Warn("Failed to connect to database, retrying...",
			"attempt", i+1, "max", cfg.DBConnectRetries, "error", err)
		time.Sleep(time.Duration(1<<uint(i)) * 2 * time.Second) // Exponential backoff
	}

	if err != nil {
		slog.Error("Failed to connect to database after retries",
			"host", cfg.DBHost, "database", cfg.DBName)
		panic(err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		slog.Error("Failed to get DB instance", "error", err)
		panic(err)
	}

	// Connection pool settings
	sqlDB.SetMaxOpenConns(cfg.DBMaxOpenConns)
	sqlDB.SetMaxIdleConns(cfg.DBMaxIdleConns)
	sqlDB.SetConnMaxLifetime(time.Duration(cfg.DBConnMaxLifetime) * time.Minute)
	sqlDB.SetConnMaxIdleTime(time.Duration(cfg.DBConnMaxIdleTime) * time.Minute)

	slog.Info("Database connected successfully", "host", cfg.DBHost, "database", cfg.DBName)
	return db
}

func Close(db *gorm.DB) {
	sqlDB, err := db.DB()
	if err != nil {
		slog.Error("Failed to get DB instance for closing", "error", err)
		return
	}
	if err := sqlDB.Close(); err != nil {
		slog.Error("Failed to close database connection", "error", err)
	} else {
		slog.Info("Database connection closed")
	}
}
