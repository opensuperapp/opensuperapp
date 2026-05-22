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
import createAuthRequestBody from '@/utils/authBody';

describe('authBody Utils', () => {
  it('should create auth request body with authorization_code grant type', () => {
    const body = createAuthRequestBody({
      grantType: 'authorization_code',
      code: 'test-code',
      redirectUri: 'http://localhost:3000/callback',
      clientId: 'test-client-id',
      codeVerifier: 'test-verifier',
    });

    expect(body).toContain('grant_type=authorization_code');
    expect(body).toContain('code=test-code');
    expect(body).toContain('redirect_uri=');
    expect(body).toContain('client_id=test-client-id');
    expect(body).toContain('code_verifier=test-verifier');
  });

  it('should create auth request body with refresh_token grant type', () => {
    const body = createAuthRequestBody({
      grantType: 'refresh_token',
      refreshToken: 'test-refresh-token',
      clientId: 'test-client-id',
    });

    expect(body).toContain('grant_type=refresh_token');
    expect(body).toContain('refresh_token=test-refresh-token');
    expect(body).toContain('client_id=test-client-id');
  });

  it('should create auth request body with token exchange grant type', () => {
    const body = createAuthRequestBody({
      grantType: 'urn:ietf:params:oauth:grant-type:token-exchange',
      subjectToken: 'test-subject-token',
      subjectTokenType: 'urn:ietf:params:oauth:token-type:jwt',
      requestedTokenType: 'urn:ietf:params:oauth:token-type:access_token',
      scope: 'openid profile',
    });

    expect(body).toContain('grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Atoken-exchange');
    expect(body).toContain('subject_token=test-subject-token');
    expect(body).toContain('subject_token_type=');
    expect(body).toContain('requested_token_type=');
    expect(body).toContain('scope=openid');
  });

  it('should omit optional parameters when not provided', () => {
    const body = createAuthRequestBody({
      grantType: 'refresh_token',
      refreshToken: 'test-token',
    });

    expect(body).toContain('grant_type=refresh_token');
    expect(body).toContain('refresh_token=test-token');
    expect(body).not.toContain('code=');
    expect(body).not.toContain('redirect_uri=');
  });

  it('should handle all optional parameters together', () => {
    const body = createAuthRequestBody({
      grantType: 'authorization_code',
      code: 'abc',
      redirectUri: 'https://example.com',
      clientId: 'client123',
      codeVerifier: 'verifier',
      scope: 'openid email',
    });

    expect(body).toContain('grant_type=authorization_code');
    expect(body).toContain('code=abc');
    expect(body).toContain('client_id=client123');
    expect(body).toContain('scope=openid');
  });
});
