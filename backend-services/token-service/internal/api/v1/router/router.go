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
package router

import (
	"net/http"

	"github.com/opensuperapp/opensuperapp/backend-services/token-service/internal/api/v1/handler"
	"github.com/opensuperapp/opensuperapp/backend-services/token-service/internal/services"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"gorm.io/gorm"
)

func NewRouter(db *gorm.DB, tokenService *services.TokenService) http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	oauthHandler := handler.NewOAuthHandler(db, tokenService)
	keyHandler := handler.NewKeyHandler(tokenService)

	r.Post("/oauth/token", oauthHandler.Token)
	r.Post("/oauth/token/user", oauthHandler.GenerateUserToken)
	r.Post("/oauth/clients", oauthHandler.CreateClient)
	r.Get("/.well-known/jwks.json", keyHandler.GetJWKS)
	r.Post("/admin/reload-keys", keyHandler.ReloadKeys)
	r.Post("/admin/active-key", keyHandler.SetActiveKey)

	return r

}
