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
package db

import (
	"errors"
	"fmt"
	"log/slog"
	"net/url"

	fileservice "github.com/opensuperapp/opensuperapp/backend-services/core/plugins/file-service"

	"gorm.io/gorm"
)

// MicroAppFile represents a file stored in the database.
// Files are stored with their name as the primary key and content as a BLOB.
type MicroAppFile struct {
	FileName    string `gorm:"column:file_name;primaryKey;type:varchar(255)"`
	BlobContent []byte `gorm:"column:blob_content;type:mediumblob;not null"`
}

func (MicroAppFile) TableName() string {
	return "micro_apps_storage"
}

// DBFileService implements the FileService interface using a database backend.
// It stores file content in a MySQL table and generates download URLs based on a base URL.
type DBFileService struct {
	db      *gorm.DB
	baseURL string
}

func init() {
	fileservice.Registry.Register("db", New)
}

func New(config map[string]any) (fileservice.FileService, error) {
	baseURL, ok := config["FILE_SERVICE_BACKEND_BASE_URL"].(string)
	if !ok || baseURL == "" {
		return nil, fmt.Errorf("DBFileService: FILE_SERVICE_BACKEND_BASE_URL is required")
	}

	// Extract the database connection from config
	globalDB, ok := config["DB"].(*gorm.DB)
	if !ok || globalDB == nil {
		return nil, fmt.Errorf("DBFileService: DB connection is required")
	}

	slog.Info("Initializing DBFileService", "base_url", baseURL)
	return &DBFileService{db: globalDB, baseURL: baseURL}, nil
}

// UploadFile stores or updates a file in the database.
// If a file with the same name already exists, it will be overwritten.
//
// Parameters:
//   - fileName: The name of the file (max 255 characters, required)
//   - content: The file content as bytes (nil is treated as empty content)
//
// Returns the download URL for the file or an error if the operation fails.
func (s *DBFileService) UploadFile(fileName string, content []byte) (string, error) {
	slog.Info("Upserting file", "fileName", fileName, "size", len(content))

	if fileName == "" {
		return "", fmt.Errorf("DBFileService: fileName is required")
	}
	if len(fileName) > 255 {
		return "", fmt.Errorf("DBFileService: fileName is too long (max 255)")
	}
	if content == nil {
		content = []byte{}
	}
	file := MicroAppFile{
		FileName:    fileName,
		BlobContent: content,
	}

	result := s.db.Save(&file)
	if result.Error != nil {
		slog.Error("Failed to upsert file", "error", result.Error, "fileName", fileName)
		return "", result.Error
	}
	downloadUrl, err := s.GetDownloadURL(fileName)
	if err != nil {
		slog.Error("Failed to get download URL", "error", err, "fileName", fileName)
		return "", err
	}

	slog.Info("File upserted successfully", "fileName", fileName)
	return downloadUrl, nil
}

// DeleteFile removes a file from the database by fileName.
// Returns gorm.ErrRecordNotFound if the file doesn't exist.
//
// Parameters:
//   - fileName: The name of the file to delete
//
// Returns an error if the deletion fails or if no file was found.
func (s *DBFileService) DeleteFile(fileName string) error {
	slog.Info("Deleting file", "fileName", fileName)

	result := s.db.Where("file_name = ?", fileName).Delete(&MicroAppFile{})

	if result.Error != nil {
		slog.Error("Failed to delete file", "error", result.Error, "fileName", fileName)
		return result.Error
	}

	if result.RowsAffected == 0 {
		slog.Warn("No file found to delete", "fileName", fileName)
		return gorm.ErrRecordNotFound
	}

	slog.Info("File deleted successfully", "fileName", fileName)
	return nil
}

// GetDownloadURL generates the download URL for a file.
// The URL is constructed using the base URL configured during service initialization.
//
// Parameters:
//   - fileName: The name of the file (required)
//
// Returns the full download URL with the fileName properly escaped for use in a URL path.
func (s *DBFileService) GetDownloadURL(fileName string) (string, error) {
	if s.baseURL == "" {
		return "", fmt.Errorf("DBFileService: FILE_SERVICE_BACKEND_BASE_URL is required")
	}
	if fileName == "" {
		return "", fmt.Errorf("DBFileService: fileName is required")
	}
	return fmt.Sprintf("%s/public/micro-app-files/download/%s", s.baseURL, url.PathEscape(fileName)), nil
}

// GetBlobContent retrieves the blob content of a file by fileName.
// Returns gorm.ErrRecordNotFound if the file doesn't exist.
//
// Parameters:
//   - fileName: The name of the file to retrieve
//
// Returns the file content as bytes or an error if retrieval fails.
func (s *DBFileService) GetBlobContent(fileName string) ([]byte, error) {
	slog.Info("Retrieving blob content", "fileName", fileName)

	var file MicroAppFile
	result := s.db.Where("file_name = ?", fileName).First(&file)

	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			slog.Warn("File not found", "fileName", fileName)
		} else {
			slog.Error("Failed to retrieve blob content", "error", result.Error, "fileName", fileName)
		}
		return nil, result.Error
	}

	slog.Info("Blob content retrieved successfully", "fileName", fileName, "size", len(file.BlobContent))
	return file.BlobContent, nil
}
