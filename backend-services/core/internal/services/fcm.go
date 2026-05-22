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
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"strings"
	"time"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/messaging"
	"google.golang.org/api/option"
)

// FCMService provides Firebase Cloud Messaging functionality for sending push notifications.
// It wraps the Firebase Admin SDK messaging client and provides methods for sending
// notifications to multiple devices with automatic batching and retry logic.
type FCMService struct {
	client *messaging.Client
}

type Notification struct {
	Title string
	Body  string
	Data  map[string]string
}

// retryState tracks the state of retry attempts across iterations.
type retryState struct {
	totalSuccess      int
	finalFailedTokens map[string]struct{}
}

// attemptResult holds the results of processing all batches in a single attempt.
type attemptResult struct {
	successCount    int
	retryableTokens []string
}

// batchResult holds the results of processing a single batch.
type batchResult struct {
	successCount    int
	retryableTokens []string
}

const (
	// maxTokensPerBatch is the maximum number of device tokens that can be sent in a single batch.
	// FCM has a limit of 500 tokens per multicast request.
	maxTokensPerBatch = 500

	maxRetries = 3

	// initialRetryDelay is the initial delay before the first retry attempt.
	// Subsequent retries use exponential backoff.
	initialRetryDelay = 1 * time.Second

	// maxRetryDelay is the maximum delay between retry attempts.
	// This caps the exponential backoff to prevent excessively long waits.
	maxRetryDelay = 30 * time.Second

	// FCMAbsoluteLimit is the absolute maximum number of tokens to process
	FCMAbsoluteLimit = 50000
)

// Error pattern sets for classifying retry behavior.
var (
	// batchRetryablePatterns are substrings indicating a request-level issue
	// where retrying the entire batch is sensible.
	batchRetryablePatterns = []string{
		"deadline exceeded",
		"timeout",
		"connection refused",
		"connection reset",
		"temporary failure",
		"server unavailable",
		"internal error",
		"503",
		"500",
		"502",
		"504",
		"UNAVAILABLE",
		"INTERNAL",
		"RESOURCE_EXHAUSTED",
	}

	// tokenNonRetryableErrors indicate permanent issues tied to a specific
	// registration token (e.g., invalid or unregistered). Do not retry.
	tokenNonRetryableErrors = []string{
		"invalid-registration-token",
		"registration-token-not-registered",
		"invalid-package-name",
		"invalid-argument",
		"sender-id-mismatch",
		"mismatched-credential",
		"invalid-apns-credentials",
	}

	// tokenRetryableErrors indicate transient issues for a specific token
	// (e.g., service unavailable). Retry with backoff.
	tokenRetryableErrors = []string{
		"internal-error",
		"unavailable",
		"timeout",
		"server-unavailable",
		"quota-exceeded",
		"service-unavailable",
		"too-many-requests",
		"message-rate-exceeded",
	}
)

// NewFCMService initializes a new FCM service with Firebase Admin SDK.
//
// Parameters:
//   - credentialsPath: Path to the Firebase service account credentials JSON file.
//
// Returns:
//   - *FCMService: An initialized FCM service instance
//   - error: An error if initialization fails (e.g., invalid credentials, missing project ID)
func NewFCMService(credentialsPath string) (*FCMService, error) {
	ctx := context.Background()

	var app *firebase.App
	var err error

	if credentialsPath != "" {
		opt := option.WithCredentialsFile(credentialsPath)

		var projectID string
		projectID, err = getProjectIDFromCredentials(credentialsPath)
		if err != nil {
			return nil, fmt.Errorf("error reading project ID from credentials: %w", err)
		}

		config := &firebase.Config{
			ProjectID: projectID,
		}
		app, err = firebase.NewApp(ctx, config, opt)
	} else {
		// Initialize with default credentials (for Cloud Run, etc.)
		app, err = firebase.NewApp(ctx, nil)
	}

	if err != nil {
		return nil, fmt.Errorf("error initializing firebase app: %w", err)
	}

	client, err := app.Messaging(ctx)
	if err != nil {
		return nil, fmt.Errorf("error getting messaging client: %w", err)
	}

	slog.Info("FCM service initialized successfully")
	return &FCMService{client: client}, nil
}

// SendMulticastNotification sends a push notification to multiple devices.
//
// This method automatically handles:
//   - Token deduplication to avoid sending duplicates
//   - Batching tokens into groups of maxTokensPerBatch (500) tokens
//   - Per-token retry logic with exponential backoff for transient failures
//   - Platform-specific configuration (APNS for iOS, Android config)
//
// Parameters:
//   - ctx: Context for request cancellation and timeout control
//   - tokens: List of FCM device tokens to send the notification to
//   - title: Notification title
//   - body: Notification body text
//   - data: Additional key-value data to include in the notification payload
//
// Returns:
//   - int: Total number of successfully delivered notifications
//   - int: Total number of failed deliveries
//   - error: An error if the entire batch processing fails (partial failures are reported in failure count)
//
// The notification includes default sound and badge settings for both iOS and Android.
func (s *FCMService) SendMulticastNotification(
	ctx context.Context,
	tokens []string,
	title string,
	body string,
	data map[string]string,
) (int, int, error) {

	if len(tokens) == 0 {
		return 0, 0, nil
	}

	// Deduplicate tokens to avoid sending duplicate notifications
	tokens = uniqueTokens(tokens)
	slog.Info("Starting notification send", "unique_tokens", len(tokens))

	// Enforce absolute limit - TRUNCATE if exceeded
	if len(tokens) > FCMAbsoluteLimit {
		slog.Warn("Token count exceeds absolute limit, truncating",
			"original_count", len(tokens),
			"limit", FCMAbsoluteLimit)
		tokens = tokens[:FCMAbsoluteLimit]
	}

	return s.sendWithRetry(ctx, tokens, title, body, data)
}

// sendWithRetry sends notifications with per-token retry logic.
func (s *FCMService) sendWithRetry(
	ctx context.Context,
	allTokens []string,
	title string,
	body string,
	data map[string]string,
) (int, int, error) {

	retryState := newRetryState()
	currentTokens := allTokens

	// Retry loop for failed tokens
	for attempt := 1; attempt <= maxRetries; attempt++ {
		if len(currentTokens) == 0 {
			break
		}

		slog.Info("Attempt sending notifications",
			"attempt", attempt,
			"tokens", len(currentTokens))

		// Process all batches in this attempt
		attemptResult := s.sendBatches(ctx, currentTokens, title, body, data, retryState)
		retryState.addSuccessCount(attemptResult.successCount)

		slog.Info("Attempt results",
			"attempt", attempt,
			"success", attemptResult.successCount,
			"failed_retryable", len(attemptResult.retryableTokens),
			"failed_non_retryable", retryState.failedCount())

		// Check if we should continue retrying
		if len(attemptResult.retryableTokens) == 0 {
			slog.Info("No tokens to retry, operation complete")
			// Clear currentTokens since we're done (don't mark successful tokens as failed)
			currentTokens = nil
			break
		}

		// Prepare for next iteration
		currentTokens = uniqueTokens(attemptResult.retryableTokens)

		// Wait before retrying (unless this is the last attempt)
		if attempt < maxRetries {
			if err := s.waitForRetry(ctx, attempt); err != nil {
				return retryState.totalSuccess, retryState.failedCount() + len(currentTokens), err
			}
		}
	}

	// Mark remaining tokens as failed only if we exhausted retries
	// (not if we broke early due to success)
	if len(currentTokens) > 0 {
		retryState.markRemainingAsFailed(currentTokens)
	}

	slog.Info("Notification send complete",
		"total_success", retryState.totalSuccess,
		"total_failure", retryState.failedCount(),
		"original_tokens", len(allTokens))

	return retryState.totalSuccess, retryState.failedCount(), nil
}

// newRetryState creates a new retry state tracker.
func newRetryState() *retryState {
	return &retryState{
		finalFailedTokens: make(map[string]struct{}),
	}
}

// addSuccessCount increments the total success counter.
func (rs *retryState) addSuccessCount(count int) {
	rs.totalSuccess += count
}

// failedCount returns the number of permanently failed tokens.
func (rs *retryState) failedCount() int {
	return len(rs.finalFailedTokens)
}

// markAsFailed marks a token as permanently failed.
func (rs *retryState) markAsFailed(token string) {
	rs.finalFailedTokens[token] = struct{}{}
}

// isAlreadyFailed checks if a token has already been marked as failed.
func (rs *retryState) isAlreadyFailed(token string) bool {
	_, failed := rs.finalFailedTokens[token]
	return failed
}

// markRemainingAsFailed marks all remaining tokens as permanently failed.
func (rs *retryState) markRemainingAsFailed(tokens []string) {
	if len(tokens) > 0 {
		slog.Warn("Max retries exceeded for tokens", "count", len(tokens))
		for _, token := range tokens {
			rs.markAsFailed(token)
		}
	}
}

// sendBatches processes all token batches for a single retry attempt.
func (s *FCMService) sendBatches(
	ctx context.Context,
	tokens []string,
	title string,
	body string,
	data map[string]string,
	retryState *retryState,
) attemptResult {

	var successCount int
	var retryableTokens []string

	for i := 0; i < len(tokens); i += maxTokensPerBatch {
		batch := s.getBatch(tokens, i)
		batchResult := s.sendBatch(ctx, batch, title, body, data, retryState, i)

		successCount += batchResult.successCount
		retryableTokens = append(retryableTokens, batchResult.retryableTokens...)
	}

	return attemptResult{
		successCount:    successCount,
		retryableTokens: retryableTokens,
	}
}

// getBatch extracts a batch of tokens starting at the given index.
func (s *FCMService) getBatch(tokens []string, startIndex int) []string {
	end := startIndex + maxTokensPerBatch
	if end > len(tokens) {
		end = len(tokens)
	}
	return tokens[startIndex:end]
}

// sendBatch processes a single batch of tokens.
func (s *FCMService) sendBatch(
	ctx context.Context,
	batch []string,
	title string,
	body string,
	data map[string]string,
	retryState *retryState,
	batchStartIndex int,
) batchResult {

	message := s.buildMulticastMessage(batch, title, body, data)

	response, err := s.client.SendEachForMulticast(ctx, message)
	if err != nil {
		return s.handleBatchError(err, batch, retryState, batchStartIndex)
	}

	// Process individual token responses
	retryableTokens := s.processTokenResponses(batch, response, retryState)

	s.logBatchResults(batchStartIndex, len(batch), response)

	return batchResult{
		successCount:    response.SuccessCount,
		retryableTokens: retryableTokens,
	}
}

// buildMulticastMessage constructs the FCM multicast message with platform-specific config.
func (s *FCMService) buildMulticastMessage(
	tokens []string,
	title string,
	body string,
	data map[string]string,
) *messaging.MulticastMessage {
	return &messaging.MulticastMessage{
		Tokens: tokens,
		Notification: &messaging.Notification{
			Title: title,
			Body:  body,
		},
		Data: data,
		APNS: &messaging.APNSConfig{
			Payload: &messaging.APNSPayload{
				Aps: &messaging.Aps{
					Sound: "default",
					Badge: ptrInt(1),
				},
			},
		},
		Android: &messaging.AndroidConfig{
			Priority: "high",
			Notification: &messaging.AndroidNotification{
				Sound:        "default",
				ChannelID:    "default",
				DefaultSound: true,
			},
		},
	}
}

// handleBatchError handles errors that affect an entire batch.
func (s *FCMService) handleBatchError(
	err error,
	batch []string,
	retryState *retryState,
	batchStartIndex int,
) batchResult {
	batchEnd := batchStartIndex + len(batch)

	if isRetryableBatchError(err) {
		slog.Warn("Batch failed with retryable error",
			"batch_start", batchStartIndex,
			"batch_end", batchEnd,
			"error", err)
		return batchResult{
			successCount:    0,
			retryableTokens: s.filterRetryableTokens(batch, retryState),
		}
	}

	// Non-retryable error - mark all tokens as failed
	slog.Error("Batch failed with non-retryable error",
		"batch_start", batchStartIndex,
		"batch_end", batchEnd,
		"error", err)

	for _, token := range batch {
		retryState.markAsFailed(token)
	}

	return batchResult{
		successCount:    0,
		retryableTokens: nil,
	}
}

// filterRetryableTokens returns tokens that haven't already been marked as failed.
func (s *FCMService) filterRetryableTokens(tokens []string, retryState *retryState) []string {
	var retryable []string
	for _, token := range tokens {
		if !retryState.isAlreadyFailed(token) {
			retryable = append(retryable, token)
		}
	}
	return retryable
}

// processTokenResponses processes individual token responses from a batch send.
func (s *FCMService) processTokenResponses(
	batch []string,
	response *messaging.BatchResponse,
	retryState *retryState,
) []string {
	var retryableTokens []string

	for idx, resp := range response.Responses {
		if !resp.Success {
			token := batch[idx]

			if s.shouldRetryToken(resp.Error, token, retryState) {
				retryableTokens = append(retryableTokens, token)
				slog.Warn("Token failed with retryable error",
					"error", resp.Error,
					"token_prefix", tokenPrefix(token))
			} else {
				retryState.markAsFailed(token)
				slog.Warn("Token failed with non-retryable error",
					"error", resp.Error,
					"token_prefix", tokenPrefix(token))
			}
		}
	}

	return retryableTokens
}

// shouldRetryToken determines if a failed token should be retried.
func (s *FCMService) shouldRetryToken(err error, token string, retryState *retryState) bool {
	if retryState.isAlreadyFailed(token) {
		return false
	}
	return isRetryablePerTokenError(err)
}

// logBatchResults logs the results of processing a batch.
func (s *FCMService) logBatchResults(startIndex, batchSize int, response *messaging.BatchResponse) {
	slog.Info("Batch results",
		"batch_start", startIndex,
		"batch_end", startIndex+batchSize,
		"batch_size", batchSize,
		"success", response.SuccessCount,
		"failure", response.FailureCount)
}

// waitForRetry implements exponential backoff delay before retry attempts.
func (s *FCMService) waitForRetry(ctx context.Context, attempt int) error {
	delay := backoffDelay(attempt)
	slog.Info("Waiting before retry",
		"delay_ms", delay.Milliseconds(),
		"next_attempt", attempt+1)

	select {
	case <-time.After(delay):
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

// isRetryableBatchError determines if a batch-level FCM error should be retried.
// This handles errors that affect the entire batch request.
func isRetryableBatchError(err error) bool {
	if err == nil {
		return false
	}

	errMsg := err.Error()

	// Check for common retryable error patterns
	for _, pattern := range batchRetryablePatterns {
		if containsInsensitive(errMsg, pattern) {
			return true
		}
	}

	return false
}

// isRetryablePerTokenError determines if a per-token FCM error should be retried.
func isRetryablePerTokenError(err error) bool {
	if err == nil {
		return false
	}

	errMsg := err.Error()

	// Non-retryable error conditions - fail immediately for these
	for _, nonRetryableErr := range tokenNonRetryableErrors {
		if errMsg == nonRetryableErr || containsInsensitive(errMsg, nonRetryableErr) {
			return false
		}
	}

	// Retryable error conditions
	for _, retryableErr := range tokenRetryableErrors {
		if errMsg == retryableErr || containsInsensitive(errMsg, retryableErr) {
			return true
		}
	}

	// For unknown errors, don't retry to be conservative
	return false
}

// backoffDelay implements exponential backoff with a maximum cap.
// The delay doubles with each attempt but is capped at maxRetryDelay.
func backoffDelay(attempt int) time.Duration {
	delay := initialRetryDelay * time.Duration(1<<uint(attempt-1))

	// Cap the maximum delay
	if delay > maxRetryDelay {
		delay = maxRetryDelay
	}

	return delay
}

// uniqueTokens removes duplicate tokens from the slice while preserving order.
func uniqueTokens(tokens []string) []string {
	if len(tokens) == 0 {
		return tokens
	}

	seen := make(map[string]bool, len(tokens))
	unique := make([]string, 0, len(tokens))

	for _, token := range tokens {
		if token == "" {
			continue
		}
		if !seen[token] {
			seen[token] = true
			unique = append(unique, token)
		}
	}

	if len(unique) < len(tokens) {
		slog.Info("Deduplicated tokens",
			"original_count", len(tokens),
			"unique_count", len(unique),
			"duplicates_removed", len(tokens)-len(unique))
	}

	return unique
}

// tokenPrefix safely truncates a token for logging purposes.
func tokenPrefix(token string) string {
	if len(token) <= 10 {
		return token
	}
	return token[:10] + "..."
}

// ptrInt returns a pointer to the provided integer value.
// This is a helper function for creating inline integer pointers,
// commonly needed for FCM notification badge counts.
func ptrInt(i int) *int {
	return &i
}

// getProjectIDFromCredentials reads the project_id from the Firebase credentials JSON file.
//
// Parameters:
//   - credentialsPath: Path to the Firebase service account JSON file
//
// Returns:
//   - string: The extracted project ID
//   - error: An error if the file cannot be read, parsed, or doesn't contain a project_id
func getProjectIDFromCredentials(credentialsPath string) (string, error) {
	data, err := os.ReadFile(credentialsPath)
	if err != nil {
		return "", fmt.Errorf("failed to read credentials file: %w", err)
	}

	var creds struct {
		ProjectID string `json:"project_id"`
	}

	if err := json.Unmarshal(data, &creds); err != nil {
		return "", fmt.Errorf("failed to parse credentials JSON: %w", err)
	}

	if creds.ProjectID == "" {
		return "", fmt.Errorf("project_id not found in credentials file")
	}

	return creds.ProjectID, nil
}

// contains checks if a string contains a substring using case-insensitive comparison.
func containsInsensitive(s, substr string) bool {
	return strings.Contains(strings.ToLower(s), strings.ToLower(substr))
}
