package models

import (
	"time"

	"gorm.io/gorm"
)

// OAuth2Client represents an OAuth2 client (microapp backend)
// The ClientID serves as both the OAuth client identifier and the microapp identifier
type OAuth2Client struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	ClientID     string         `gorm:"type:varchar(255);uniqueIndex;not null" json:"client_id"`
	ClientSecret string         `gorm:"type:text;not null" json:"-"` // Bcrypt hashed secret (~60 chars)
	Name         string         `gorm:"not null" json:"name"`
	Scopes       string         `json:"scopes"` // Comma-separated scopes
	IsActive     bool           `gorm:"default:true" json:"is_active"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}
