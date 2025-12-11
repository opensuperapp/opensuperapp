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
