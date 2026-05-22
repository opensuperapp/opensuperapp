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
	"fmt"
	"log/slog"

	"github.com/opensuperapp/opensuperapp/backend-services/core/internal/models"

	userservice "github.com/opensuperapp/opensuperapp/backend-services/core/plugins/user-service"

	"gorm.io/gorm"
)

// userModel represents the database table structure for users
type userModel struct {
	Email         string  `gorm:"column:email;type:varchar(100);primaryKey"`
	FirstName     string  `gorm:"column:firstName;type:varchar(50)"`
	LastName      string  `gorm:"column:lastName;type:varchar(50)"`
	UserThumbnail *string `gorm:"column:userThumbnail;type:varchar(255)"`
	Location      *string `gorm:"column:location;type:varchar(100)"`
}

func (userModel) TableName() string {
	return "users"
}

type DBUserService struct {
	db *gorm.DB
}

// Verify that DBUserService implements UserService interface
var _ userservice.UserService = (*DBUserService)(nil)

func init() {
	userservice.Registry.Register("db", New)
}
func New(config map[string]any) (userservice.UserService, error) {
	// Extract the database connection from config
	globalDB, ok := config["DB"].(*gorm.DB)
	if !ok || globalDB == nil {
		return nil, fmt.Errorf("DBUserService: DB connection is required")
	}

	return &DBUserService{db: globalDB}, nil
}

// GetUserByEmail retrieves a user by their email address.
func (s *DBUserService) GetUserByEmail(email string) (*models.User, error) {
	var user userModel
	result := s.db.Where("email = ?", email).First(&user)

	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return nil, nil
		}
		slog.Error("Failed to fetch user by email", "error", result.Error, "email", email)
		return nil, result.Error
	}

	return user.toUser(), nil
}

// GetAllUsers retrieves all users from the database.
func (s *DBUserService) GetAllUsers() ([]*models.User, error) {
	var users []userModel
	result := s.db.Order("firstName, lastName").Find(&users)

	if result.Error != nil {
		slog.Error("Failed to fetch all users", "error", result.Error)
		return nil, result.Error
	}

	// Convert to models.User
	modelUsers := make([]*models.User, len(users))
	for i, u := range users {
		modelUsers[i] = u.toUser()
	}

	return modelUsers, nil
}

// UpsertUser creates a new user or updates an existing one.
func (s *DBUserService) UpsertUser(user *models.User) error {
	dbUser := fromUser(user)
	var result userModel
	err := s.db.Where("email = ?", dbUser.Email).
		Assign(userModel{
			FirstName:     dbUser.FirstName,
			LastName:      dbUser.LastName,
			UserThumbnail: dbUser.UserThumbnail,
			Location:      dbUser.Location,
		}).
		Attrs(userModel{
			Email: dbUser.Email,
		}).
		FirstOrCreate(&result).Error

	if err != nil {
		slog.Error("Failed to upsert user", "error", err, "email", user.Email)
		return err
	}

	return nil
}

// UpsertUsers creates or updates multiple users in the database within a transaction.
func (s *DBUserService) UpsertUsers(users []*models.User) error {
	slog.Info("Upserting bulk users", "count", len(users))

	return s.db.Transaction(func(tx *gorm.DB) error {
		txService := &DBUserService{db: tx}

		for i, user := range users {
			if err := txService.UpsertUser(user); err != nil {
				slog.Error("Failed to upsert user in bulk operation",
					"error", err, "index", i, "email", user.Email)
				return err
			}
		}

		slog.Info("Successfully upserted bulk users", "count", len(users))
		return nil
	})
}

// DeleteUser removes a user by their email address.
func (s *DBUserService) DeleteUser(email string) error {
	result := s.db.Where("email = ?", email).Delete(&userModel{})

	if result.Error != nil {
		slog.Error("Failed to delete user", "error", result.Error, "email", email)
		return result.Error
	}

	if result.RowsAffected == 0 {
		slog.Warn("No user found to delete", "email", email)
		return gorm.ErrRecordNotFound
	}

	return nil
}

// Helper functions

// toUser converts database model to models.User
func (u *userModel) toUser() *models.User {
	return &models.User{
		Email:         u.Email,
		FirstName:     u.FirstName,
		LastName:      u.LastName,
		UserThumbnail: u.UserThumbnail,
		Location:      u.Location,
	}
}

// fromUser converts models.User to database model
func fromUser(u *models.User) *userModel {
	return &userModel{
		Email:         u.Email,
		FirstName:     u.FirstName,
		LastName:      u.LastName,
		UserThumbnail: u.UserThumbnail,
		Location:      u.Location,
	}
}
