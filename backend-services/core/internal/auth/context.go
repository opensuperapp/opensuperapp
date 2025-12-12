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
package auth

import (
	"context"
	"net/http"
)

type contextKey string

const (
	userInfoKey    = contextKey("userInfo")
	serviceInfoKey = contextKey("serviceInfo")
)

// SetUserInfo adds the CustomJwtPayload to the request context.
func SetUserInfo(r *http.Request, userInfo *CustomJwtPayload) *http.Request {
	ctx := context.WithValue(r.Context(), userInfoKey, userInfo)
	return r.WithContext(ctx)
}

// GetUserInfo retrieves the CustomJwtPayload from the context.
func GetUserInfo(ctx context.Context) (*CustomJwtPayload, bool) {
	userInfo, ok := ctx.Value(userInfoKey).(*CustomJwtPayload)
	return userInfo, ok
}

// SetServiceInfo adds the ServiceInfo to the request context.
func SetServiceInfo(r *http.Request, serviceInfo *ServiceInfo) *http.Request {
	ctx := context.WithValue(r.Context(), serviceInfoKey, serviceInfo)
	return r.WithContext(ctx)
}

// GetServiceInfo retrieves the ServiceInfo from the context.
func GetServiceInfo(ctx context.Context) (*ServiceInfo, bool) {
	serviceInfo, ok := ctx.Value(serviceInfoKey).(*ServiceInfo)
	return serviceInfo, ok
}
