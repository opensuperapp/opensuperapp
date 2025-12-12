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
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"path/filepath"

	fileservice "github.com/opensuperapp/opensuperapp/backend-services/core/plugins/file-service"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
)

const (
	uploadFileMaxSize = 20 << 20 // 20 MB
)

type FileHandler struct {
	fileService fileservice.FileService
}

// DBFileService interface since this handler is db-specific
type DBFileService interface {
	GetBlobContent(fileName string) ([]byte, error)
}

func NewFileHandler(fileService fileservice.FileService) *FileHandler {
	return &FileHandler{
		fileService: fileService,
	}
}

// UploadFile handles file upload via binary body
func (h *FileHandler) UploadFile(w http.ResponseWriter, r *http.Request) {
	fileName := r.URL.Query().Get("fileName")
	fileName = filepath.Base(fileName) // Sanitize: strip directory components
	if fileName == "." || fileName == ".." {
		http.Error(w, "invalid fileName", http.StatusBadRequest)
		return
	}
	if fileName == "" {
		http.Error(w, "fileName query parameter is required", http.StatusBadRequest)
		return
	}

	// Defense-in-depth: limit request body size
	r.Body = http.MaxBytesReader(w, r.Body, uploadFileMaxSize)
	content, err := io.ReadAll(r.Body)
	if err != nil {
		slog.Error("Error reading file content from request body", "error", err)
		http.Error(w, "error in reading file content from request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	if len(content) == 0 {
		http.Error(w, "file content is empty", http.StatusBadRequest)
		return
	}

	downloadURL, err := h.fileService.UploadFile(fileName, content)
	if err != nil {
		slog.Error("Error uploading file", "error", err, "fileName", fileName)
		http.Error(w, "error uploading file", http.StatusInternalServerError)
		return
	}

	response := map[string]string{
		"message":     "File uploaded successfully.",
		"downloadUrl": downloadURL,
	}

	if err := writeJSON(w, http.StatusCreated, response); err != nil {
		slog.Error("Failed to write JSON response", "error", err)
		http.Error(w, "failed to write response", http.StatusInternalServerError)
	}
}

// DeleteFile handles file deletion by fileName
func (h *FileHandler) DeleteFile(w http.ResponseWriter, r *http.Request) {
	fileName := filepath.Base(r.URL.Query().Get("fileName"))
	if fileName == "." || fileName == ".." {
		http.Error(w, "invalid fileName", http.StatusBadRequest)
		return
	}
	if fileName == "" {
		http.Error(w, "fileName query parameter is required", http.StatusBadRequest)
		return
	}

	err := h.fileService.DeleteFile(fileName)
	if err != nil {
		slog.Error("Error deleting file", "error", err, "fileName", fileName)
		http.Error(w, "error deleting file", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// DownloadMicroAppFile handles public file download
// Note: This handler is only called when FileServiceType is "db", so the service will always be database as the file service
func (h *FileHandler) DownloadMicroAppFile(w http.ResponseWriter, r *http.Request) {
	rawFileName := chi.URLParam(r, "fileName")
	if rawFileName == "" {
		http.Error(w, "fileName parameter is required", http.StatusBadRequest)
		return
	}
	fileName := filepath.Base(rawFileName)
	if fileName == "." || fileName == ".." {
		http.Error(w, "invalid fileName", http.StatusBadRequest)
		return
	}

	dbService, ok := h.fileService.(DBFileService)
	if !ok {
		http.Error(w, "This endpoint only works with DB file service", http.StatusInternalServerError)
		return
	}

	content, err := dbService.GetBlobContent(fileName)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			http.Error(w, "file not found", http.StatusNotFound)
			return
		}
		slog.Error("Error occurred while retrieving Micro App file", "error", err, "fileName", fileName)
		http.Error(w, "Error occurred while retrieving Micro App file", http.StatusInternalServerError)
		return
	}
	safeFileName := sanitizeForHeader(fileName)
	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", safeFileName))
	w.WriteHeader(http.StatusOK)

	if _, err := w.Write(content); err != nil {
		slog.Error("Failed to write file content", "error", err, "fileName", fileName)
	}
}
