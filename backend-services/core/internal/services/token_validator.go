package services

import (
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"math/big"
	"net/http"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v4"
)

const (

	// Timeouts and Intervals
	defaultHTTPTimeout      = 10 * time.Second
	jwksRefreshInterval     = 1 * time.Hour
	jwksLazyRefreshCooldown = 10 * time.Second
)

type RSATokenValidator struct {
	jwksURL            string
	issuer             string
	audience           string
	keys               map[string]*rsa.PublicKey
	keysMutex          sync.RWMutex
	lastFetch          time.Time
	lastRefreshAttempt time.Time
	httpClient         *http.Client
	cachedJWKS         json.RawMessage
	done               chan struct{}
}

type TokenClaims struct {
	jwt.RegisteredClaims
	Scopes string   `json:"scope,omitempty"`
	Email  string   `json:"email,omitempty"`
	Groups []string `json:"groups,omitempty"`
}

type JWKS struct {
	Keys []JWK `json:"keys"`
}

type JWK struct {
	Kid string `json:"kid"`
	Kty string `json:"kty"`
	Use string `json:"use"`
	N   string `json:"n"`
	E   string `json:"e"`
}

// NewTokenValidator creates a TokenValidator from an IDP base URL (for internal IDP)
func NewTokenValidator(idpBaseURL, issuer, audience string) (TokenValidator, error) {
	jwksURL := fmt.Sprintf("%s/.well-known/jwks.json", idpBaseURL)
	return NewTokenValidatorWithJWKSURL(jwksURL, issuer, audience)
}

// NewTokenValidatorWithJWKSURL creates a TokenValidator with explicit JWKS URL and validation (for external IDP)
func NewTokenValidatorWithJWKSURL(jwksURL, issuer, audience string) (TokenValidator, error) {
	tv := &RSATokenValidator{
		jwksURL:  jwksURL,
		issuer:   issuer,
		audience: audience,
		keys:     make(map[string]*rsa.PublicKey),
		httpClient: &http.Client{
			Timeout: defaultHTTPTimeout,
		},
		done: make(chan struct{}),
	}

	// Fetch keys on initialization
	if err := tv.refreshKeys(); err != nil {
		return nil, fmt.Errorf("failed to fetch JWKS: %w", err)
	}

	// Start background refresh
	go tv.backgroundRefresh()

	return tv, nil
}

func (tv *RSATokenValidator) ValidateToken(tokenString string) (*TokenClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &TokenClaims{}, func(token *jwt.Token) (interface{}, error) {
		// Verify signing method
		if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}

		// Get kid from header
		kid, ok := token.Header["kid"].(string)
		if !ok {
			return nil, fmt.Errorf("kid not found in token header")
		}

		// Get the public key
		return tv.getKey(kid)
	})

	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*TokenClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	// Validate issuer if configured
	if tv.issuer != "" && claims.Issuer != tv.issuer {
		return nil, fmt.Errorf("invalid issuer: expected %s, got %s", tv.issuer, claims.Issuer)
	}

	// Validate audience if configured
	if tv.audience != "" && !claims.VerifyAudience(tv.audience, true) {
		return nil, fmt.Errorf("invalid audience: expected %s", tv.audience)
	}

	return claims, nil
}

// Close stops the background refresh goroutine and releases resources
func (tv *RSATokenValidator) Close() {
	close(tv.done)
}

// getKey returns the public key for the given kid.
// If the key is not found, it attempts to refresh the keys if enough time has passed since the last refresh attempt.
func (tv *RSATokenValidator) getKey(kid string) (*rsa.PublicKey, error) {
	tv.keysMutex.RLock()
	key, exists := tv.keys[kid]
	tv.keysMutex.RUnlock()

	if exists {
		return key, nil
	}

	// Key not found, check if we can refresh
	tv.keysMutex.Lock()
	// Double check if key was added while waiting for lock
	if key, exists := tv.keys[kid]; exists {
		tv.keysMutex.Unlock()
		return key, nil
	}

	// Rate limit refresh attempts
	if time.Since(tv.lastRefreshAttempt) < jwksLazyRefreshCooldown {
		tv.keysMutex.Unlock()
		return nil, fmt.Errorf("key with kid %s not found (refresh rate limited)", kid)
	}

	// Update timestamp before unlocking to prevent other goroutines from refreshing immediately
	tv.lastRefreshAttempt = time.Now()
	tv.keysMutex.Unlock()

	slog.Info("Key not found, triggering JWKS refresh", "kid", kid)
	if err := tv.refreshKeys(); err != nil {
		return nil, fmt.Errorf("failed to refresh keys: %w", err)
	}

	tv.keysMutex.RLock()
	key, exists = tv.keys[kid]
	tv.keysMutex.RUnlock()

	if exists {
		return key, nil
	}

	return nil, fmt.Errorf("key with kid %s not found after refresh", kid)
}

func (tv *RSATokenValidator) refreshKeys() error {
	resp, err := tv.httpClient.Get(tv.jwksURL)
	if err != nil {
		return fmt.Errorf("failed to fetch JWKS: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("JWKS endpoint returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read JWKS response: %w", err)
	}

	var jwks JWKS
	if err := json.Unmarshal(body, &jwks); err != nil {
		return fmt.Errorf("failed to parse JWKS: %w", err)
	}

	newKeys := make(map[string]*rsa.PublicKey)
	for _, key := range jwks.Keys {
		if key.Kty != "RSA" {
			continue
		}

		pubKey, err := tv.parseRSAPublicKey(key)
		if err != nil {
			slog.Warn("Failed to parse key", "kid", key.Kid, "error", err)
			continue
		}

		newKeys[key.Kid] = pubKey
	}

	tv.keysMutex.Lock()
	tv.keys = newKeys
	tv.cachedJWKS = json.RawMessage(body)
	tv.lastFetch = time.Now()
	tv.keysMutex.Unlock()

	return nil
}

func (tv *RSATokenValidator) parseRSAPublicKey(key JWK) (*rsa.PublicKey, error) {
	nBytes, err := base64.RawURLEncoding.DecodeString(key.N)
	if err != nil {
		return nil, fmt.Errorf("failed to decode N: %w", err)
	}

	eBytes, err := base64.RawURLEncoding.DecodeString(key.E)
	if err != nil {
		return nil, fmt.Errorf("failed to decode E: %w", err)
	}

	n := new(big.Int).SetBytes(nBytes)
	var e int
	for _, b := range eBytes {
		e = e<<8 + int(b)
	}

	return &rsa.PublicKey{
		N: n,
		E: e,
	}, nil
}

func (tv *RSATokenValidator) backgroundRefresh() {
	ticker := time.NewTicker(jwksRefreshInterval)
	defer ticker.Stop()

	for {
		select {
		case <-tv.done:
			return
		case <-ticker.C:
			if err := tv.refreshKeys(); err != nil {
				slog.Warn("Background JWKS refresh failed", "error", err)
			}
		}
	}
}

// GetJWKS returns the cached JWKS JSON from the last refresh without refetching.
func (tv *RSATokenValidator) GetJWKS() (json.RawMessage, error) {
	tv.keysMutex.RLock()
	defer tv.keysMutex.RUnlock()
	if len(tv.cachedJWKS) == 0 {
		return nil, fmt.Errorf("no JWKS cached")
	}
	return tv.cachedJWKS, nil
}
