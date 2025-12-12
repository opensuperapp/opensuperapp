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
package fileservice

import (
	"github.com/opensuperapp/opensuperapp/backend-services/core/internal/registry"
)

// FileService defines the interface for file management operations.
type FileService interface {
	UploadFile(fileName string, content []byte) (string, error)
	DeleteFile(fileName string) error
}

// Registry is the global registry for FileService implementations.
// Implementations should register themselves in their init() functions.
var Registry = registry.New[FileService]()
