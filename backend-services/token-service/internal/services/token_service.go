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
package services

import (
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log/slog"
	"math/big"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v4"
)

const (
	Issuer = "superapp"
	KeyID  = "superapp-key-1" // Default active kid
)

type TokenService struct {
	mu          sync.RWMutex
	privateKeys map[string]*rsa.PrivateKey // kid -> private key
	publicKeys  map[string]*rsa.PublicKey  // kid -> public key
	activeKeyID string                     // Current signing key
	jwksData    []byte
	expiry      time.Duration
	keysDir     string // Directory for key reloading
}

// NewTokenService creates a TokenService with single key set -- only for backward compatibility
func NewTokenService(privateKeyPath, publicKeyPath, jwksPath string, expirySeconds int) (*TokenService, error) {
	ts := &TokenService{
		privateKeys: make(map[string]*rsa.PrivateKey),
		publicKeys:  make(map[string]*rsa.PublicKey),
		activeKeyID: KeyID, // Default to the constant
		expiry:      time.Duration(expirySeconds) * time.Second,
	}

	// Load Private Key (single key mode for backward compatibility)
	privKeyBytes, err := os.ReadFile(privateKeyPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read private key: %w", err)
	}
	privateKey, err := jwt.ParseRSAPrivateKeyFromPEM(privKeyBytes)
	if err != nil {
		return nil, fmt.Errorf("failed to parse private key: %w", err)
	}
	ts.privateKeys[KeyID] = privateKey

	// Load Public Key
	var publicKey *rsa.PublicKey
	if publicKeyPath != "" {
		pubKeyBytes, err := os.ReadFile(publicKeyPath)
		if err == nil {
			publicKey, err = jwt.ParseRSAPublicKeyFromPEM(pubKeyBytes)
			if err != nil {
				slog.Warn("Failed to parse public key", "error", err)
			} else {
				ts.publicKeys[KeyID] = publicKey
			}
		} else {
			slog.Warn("Failed to read public key", "error", err)
		}
	}

	// Load and update JWKS file with actual public key N value
	var jwksData []byte
	if jwksPath != "" && publicKey != nil {
		jwksData, err = loadAndUpdateJWKS(jwksPath, publicKey)
		if err != nil {
			slog.Warn("Failed to load JWKS file, will generate dynamically", "error", err)
		}
	}
	ts.jwksData = jwksData

	return ts, nil
}

// NewTokenServiceFromDirectory creates a TokenService by loading all keys from a directory
func NewTokenServiceFromDirectory(keysDir string, activeKeyID string, expirySeconds int) (*TokenService, error) {
	privateKeys, publicKeys, err := loadKeysFromDirectory(keysDir)
	if err != nil {
		return nil, err
	}

	ts := &TokenService{
		privateKeys: privateKeys,
		publicKeys:  publicKeys,
		activeKeyID: activeKeyID,
		expiry:      time.Duration(expirySeconds) * time.Second,
		keysDir:     keysDir,
	}

	// Verify active key exists
	if _, ok := ts.privateKeys[activeKeyID]; !ok {
		return nil, fmt.Errorf("active key %s not found in loaded keys", activeKeyID)
	}

	// Generate JWKS from all public keys
	ts.jwksData, err = ts.generateJWKS()
	if err != nil {
		slog.Warn("Failed to generate JWKS", "error", err)
	}

	slog.Info("Token service initialized from directory",
		"keys_loaded", len(privateKeys),
		"active_key", activeKeyID)

	return ts, nil
}

// ReloadKeys re-scans the keys directory and updates the service state without downtime
func (s *TokenService) ReloadKeys() error {
	if s.keysDir == "" {
		return fmt.Errorf("keys directory not configured")
	}

	slog.Info("Reloading keys from directory", "dir", s.keysDir)

	privateKeys, publicKeys, err := loadKeysFromDirectory(s.keysDir)
	if err != nil {
		return fmt.Errorf("failed to load keys: %w", err)
	}

	// Verify active key still exists
	s.mu.RLock()
	activeKeyID := s.activeKeyID
	s.mu.RUnlock()

	if _, ok := privateKeys[activeKeyID]; !ok {
		return fmt.Errorf("active key %s not found in new keys", activeKeyID)
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	s.privateKeys = privateKeys
	s.publicKeys = publicKeys

	// Regenerate JWKS
	jwksData, err := s.generateJWKS()
	if err != nil {
		slog.Warn("Failed to generate JWKS during reload", "error", err)
	} else {
		s.jwksData = jwksData
	}

	slog.Info("Keys reloaded successfully", "keys_loaded", len(privateKeys))
	return nil
}

// loadKeysFromDirectory is a helper to load keys from a directory
func loadKeysFromDirectory(keysDir string) (map[string]*rsa.PrivateKey, map[string]*rsa.PublicKey, error) {
	privateKeys := make(map[string]*rsa.PrivateKey)
	publicKeys := make(map[string]*rsa.PublicKey)

	// Read all files in the directory
	entries, err := os.ReadDir(keysDir)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to read keys directory: %w", err)
	}

	keysLoaded := 0
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		filename := entry.Name()

		// Look for private key files (format: {keyid}_private.pem)
		if !strings.HasSuffix(filename, "_private.pem") {
			continue
		}

		// Extract key ID from filename
		keyID := strings.TrimSuffix(filename, "_private.pem")

		// Load private key
		privKeyPath := filepath.Join(keysDir, filename)
		privKeyBytes, err := os.ReadFile(privKeyPath)
		if err != nil {
			slog.Warn("Failed to read private key", "key_id", keyID, "error", err)
			continue
		}

		privateKey, err := jwt.ParseRSAPrivateKeyFromPEM(privKeyBytes)
		if err != nil {
			slog.Warn("Failed to parse private key", "key_id", keyID, "error", err)
			continue
		}
		privateKeys[keyID] = privateKey

		// Load corresponding public key
		pubKeyPath := filepath.Join(keysDir, keyID+"_public.pem")
		pubKeyBytes, err := os.ReadFile(pubKeyPath)
		if err == nil {
			publicKey, err := jwt.ParseRSAPublicKeyFromPEM(pubKeyBytes)
			if err == nil {
				publicKeys[keyID] = publicKey
			} else {
				slog.Warn("Failed to parse public key", "key_id", keyID, "error", err)
			}
		}

		keysLoaded++
		slog.Info("Loaded key pair", "key_id", keyID)
	}

	if keysLoaded == 0 {
		return nil, nil, fmt.Errorf("no valid key pairs found in directory: %s", keysDir)
	}

	return privateKeys, publicKeys, nil
}

// loadAndUpdateJWKS loads the JWKS template and updates the N value from the public key
func loadAndUpdateJWKS(jwksPath string, publicKey *rsa.PublicKey) ([]byte, error) {
	data, err := os.ReadFile(jwksPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read JWKS file: %w", err)
	}

	var jwks map[string]interface{}
	if err := json.Unmarshal(data, &jwks); err != nil {
		return nil, fmt.Errorf("failed to parse JWKS file: %w", err)
	}

	// Update the N value in the first key
	keys, ok := jwks["keys"].([]interface{})
	if !ok || len(keys) == 0 {
		return nil, fmt.Errorf("invalid JWKS format")
	}

	key, ok := keys[0].(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("invalid key format in JWKS")
	}

	// Set N from public key
	nStr := base64.RawURLEncoding.EncodeToString(publicKey.N.Bytes())
	key["n"] = nStr

	return json.Marshal(jwks)
}

// generateJWKS creates a JWKS containing all loaded public keys
// This enables validators to verify tokens signed by any of the loaded keys
func (s *TokenService) generateJWKS() ([]byte, error) {
	keys := make([]map[string]interface{}, 0, len(s.publicKeys))

	for keyID, publicKey := range s.publicKeys {
		// Encode N (modulus) as base64url
		nBytes := publicKey.N.Bytes()
		nStr := base64.RawURLEncoding.EncodeToString(nBytes)

		// Encode E (exponent) as base64url
		eBytes := big.NewInt(int64(publicKey.E)).Bytes()
		eStr := base64.RawURLEncoding.EncodeToString(eBytes)

		keys = append(keys, map[string]interface{}{
			"kty": "RSA",
			"use": "sig",
			"kid": keyID,
			"n":   nStr,
			"e":   eStr,
			"alg": "RS256",
		})
	}

	jwks := map[string]interface{}{
		"keys": keys,
	}

	return json.Marshal(jwks)
}

// GetJWKS returns the cached JWKS data
func (s *TokenService) GetJWKS() ([]byte, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if len(s.jwksData) == 0 {
		return nil, fmt.Errorf("JWKS not available")
	}
	return s.jwksData, nil
}

// GetExpiry returns the token expiry duration in seconds
func (s *TokenService) GetExpiry() int {
	return int(s.expiry.Seconds())
}

// SetActiveKey sets the active signing key
// This allows for key rotation without restarting the service
func (s *TokenService) SetActiveKey(keyID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.privateKeys[keyID]; !ok {
		return fmt.Errorf("key %s not found in private keys", keyID)
	}
	s.activeKeyID = keyID
	slog.Info("Active signing key updated", "key_id", keyID)
	return nil
}

// GetActiveKeyID returns the current active key ID
func (s *TokenService) GetActiveKeyID() string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.activeKeyID
}
