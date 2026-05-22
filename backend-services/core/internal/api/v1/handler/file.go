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

type fileUploadResponse struct {
	Message     string `json:"message"`
	DownloadURL string `json:"downloadUrl"`
}

type FileHandler struct {
	fileService   fileservice.FileService
	maxUploadSize int64 // Maximum upload size in bytes
}

func NewFileHandler(fileService fileservice.FileService, maxUploadSizeMB int) *FileHandler {
	return &FileHandler{
		fileService:   fileService,
		maxUploadSize: int64(maxUploadSizeMB) << 20, // Convert MB to bytes
	}
}

func (h *FileHandler) UploadFile(w http.ResponseWriter, r *http.Request) {
	fileName, err := validateFileName(r.URL.Query().Get(QueryParamFileName))
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, h.maxUploadSize)
	content, err := io.ReadAll(r.Body)
	if err != nil {
		slog.Error(errReadingBody, "error", err)
		http.Error(w, errReadingBody, http.StatusBadRequest)
		return
	}
	defer r.Body.Close()
	if len(content) == 0 {
		http.Error(w, errFileContentEmpty, http.StatusBadRequest)
		return
	}
	downloadURL, err := h.fileService.UploadFile(fileName, content)
	if err != nil {
		slog.Error(errUploadingFile, "error", err, "fileName", fileName)
		http.Error(w, errUploadingFile, http.StatusInternalServerError)
		return
	}
	response := fileUploadResponse{
		Message:     msgSuccessFileUpload,
		DownloadURL: downloadURL,
	}
	if err := writeJSON(w, http.StatusCreated, response); err != nil {
		slog.Error(errFailedToWriteResponse, "error", err)
		http.Error(w, errFailedToWriteResponse, http.StatusInternalServerError)
	}
}

// DeleteFile handles file deletion by fileName
func (h *FileHandler) DeleteFile(w http.ResponseWriter, r *http.Request) {
	fileName, err := validateFileName(r.URL.Query().Get(QueryParamFileName))
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	err = h.fileService.DeleteFile(fileName)
	if err != nil {
		slog.Error(errDeletingFile, "error", err, "fileName", fileName)
		http.Error(w, errDeletingFile, http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// Note: This handler is only called when FileServiceType is "db",
//
//	so the service will always be database as the file service.
type DBFileService interface {
	GetBlobContent(fileName string) ([]byte, error)
}

// DownloadMicroAppFile handles public file download
func (h *FileHandler) DownloadMicroAppFile(w http.ResponseWriter, r *http.Request) {
	fileName, err := validateFileName(chi.URLParam(r, QueryParamFileName))
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	dbService, ok := h.fileService.(DBFileService)
	if !ok {
		http.Error(w, errDBfileService, http.StatusInternalServerError)
		return
	}
	content, err := dbService.GetBlobContent(fileName)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			http.Error(w, errFileNotFound, http.StatusNotFound)
			return
		}
		slog.Error(errDownloadingFile, "error", err, "fileName", fileName)
		http.Error(w, errDownloadingFile, http.StatusInternalServerError)
		return
	}
	safeFileName := sanitizeForHeader(fileName)
	w.Header().Set(contentTypeHeader, applicationOctetStream)
	w.Header().Set(contentDisposition, fmt.Sprintf("attachment; filename=\"%s\"", safeFileName))
	w.WriteHeader(http.StatusOK)
	if _, err := w.Write(content); err != nil {
		slog.Error(errFailedToWriteResponse, "error", err, "fileName", fileName)
	}
}

// helper functions

// validateFileName checks if the provided fileName is non-empty and sanitizes it by extracting the base name.
// It returns an error if the fileName is empty or resolves to "." or ".." after sanitization.
// The function returns the sanitized file name if valid, otherwise an appropriate error.
func validateFileName(fileName string) (string, error) {
	if fileName == "" {
		return "", errors.New(errQueryParamMissing)
	}
	sanitized := filepath.Base(fileName)
	if sanitized == "." || sanitized == ".." {
		return "", errors.New(errInvalidFileName)
	}
	return sanitized, nil
}
