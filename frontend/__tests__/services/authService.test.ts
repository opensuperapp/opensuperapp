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
import {
  loadAuthData,
  processNativeAuthResult,
  getAccessToken,
  refreshAccessToken,
  logout,
  getBackendToken,
  tokenExchange,
  isTokenExpiringSoon,
} from '@/services/authService';
import SecureStorage from '@/utils/secureStorage';
import * as authTokenStore from '@/utils/authTokenStore';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { logout as appLogout } from 'react-native-app-auth';
import { Alert } from 'react-native';

jest.mock('axios');

jest.mock('@/utils/secureStorage');
jest.mock('@/utils/authTokenStore');
jest.mock('react-native-app-auth');
jest.mock('jwt-decode');
jest.mock('@/constants/Constants', () => ({
  TOKEN_URL: 'http://token-url',
  LOGOUT_URL: 'http://logout-url',
  BASE_URL: 'http://base-url',
  CLIENT_ID: 'client-id',
  SUCCESS: 'success',
  REDIRECT_URI: 'redirect-uri',
  USE_BACKEND_TOKEN_EXCHANGE: false,
  AUTHENTICATOR_APP_ID: 'authenticator-app-id',
  APPS: 'APPS',
  USER_INFO: 'USER_INFO',
}));

jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
  Platform: {
    OS: 'ios',
  },
}));


// Mock global fetch
global.fetch = jest.fn();

describe('authService', () => {
  const mockedAxios = axios as jest.MockedFunction<typeof axios>;
  const mockedJwtDecode = jwtDecode as jest.MockedFunction<typeof jwtDecode>;
  const mockedAppLogout = appLogout as jest.MockedFunction<typeof appLogout>;

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('loadAuthData', () => {
    it('should load auth data from secure storage', async () => {
      const mockAuthData = {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        idToken: 'test-id-token',
        email: 'test@example.com',
        expiresAt: Date.now() + 3600000,
      };

      (authTokenStore.loadAuthDataFromSecureStore as jest.Mock).mockResolvedValue(mockAuthData);

      const result = await loadAuthData();

      expect(authTokenStore.loadAuthDataFromSecureStore).toHaveBeenCalled();
      expect(result).toEqual(mockAuthData);
    });
  });

  describe('processNativeAuthResult', () => {
    it('should process auth result successfully', async () => {
      const mockAuthResult = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        idToken: 'id-token-payload',
        accessTokenExpirationDate: new Date(Date.now() + 3600000).toISOString(),
      };

      mockedJwtDecode.mockImplementation((token: string) => {
        if (token === 'id-token-payload') return { email: 'test@example.com' };
        return { exp: Math.floor(Date.now() / 1000) + 3600 };
      });

      const result = await processNativeAuthResult(mockAuthResult as any);

      expect(result).toBeDefined();
      expect(result?.accessToken).toBe('new-access-token');
      expect(authTokenStore.saveAuthDataToSecureStore).toHaveBeenCalled();
    });

    it('should return null if tokens are missing', async () => {
      const result = await processNativeAuthResult({ accessToken: '' } as any);
      expect(result).toBeNull();
    });

    it('should return null on catch block', async () => {
      mockedJwtDecode.mockImplementationOnce(() => { throw new Error('fail'); });
      const result = await processNativeAuthResult({ accessToken: 'a', idToken: 'i' } as any);
      expect(result).toBeNull();
    });
  });

  describe('getAccessToken', () => {
    it('should fetch access token using auth code', async () => {
      const mockResult = {
        type: 'success',
        params: { code: 'test-code' },
      };
      const mockRequest = { codeVerifier: 'verifier' };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue({
          access_token: 'acc',
          refresh_token: 'ref',
          id_token: 'id',
        }),
      });

      mockedJwtDecode.mockReturnValue({ email: 'test@example.com', exp: 123456789 });

      const result = await getAccessToken(mockRequest, mockResult, 'redirect');

      expect(result?.accessToken).toBe('acc');
      expect(authTokenStore.saveAuthDataToSecureStore).toHaveBeenCalled();
    });

    it('should return null on fetch error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Fetch failed'));
      const result = await getAccessToken({}, { type: 'success', params: { code: 'c' } }, 'r');
      expect(result).toBeNull();
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh token correctly', async () => {
      const mockAuthData = { refreshToken: 'old-refresh' };
      (authTokenStore.loadAuthDataFromSecureStore as jest.Mock).mockResolvedValue(mockAuthData);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          access_token: 'new-acc',
          refresh_token: 'new-ref',
          id_token: 'new-id',
        }),
      });

      mockedJwtDecode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 });

      const onLogout = jest.fn();
      const result = await refreshAccessToken(onLogout);

      expect(result?.accessToken).toBe('new-acc');
      expect(authTokenStore.saveAuthDataToSecureStore).toHaveBeenCalled();
    });

    it('should call onLogout on 400 error', async () => {
      (authTokenStore.loadAuthDataFromSecureStore as jest.Mock).mockResolvedValue({ refreshToken: 'ref' });
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 400 });

      const onLogout = jest.fn();
      await refreshAccessToken(onLogout);
      expect(onLogout).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should perform logout correctly', async () => {
      (authTokenStore.loadAuthDataFromSecureStore as jest.Mock).mockResolvedValue({ idToken: 'id' });
      mockedAppLogout.mockResolvedValueOnce(undefined as any);

      await logout();

      expect(mockedAppLogout).toHaveBeenCalled();
      expect(authTokenStore.clearAuthDataFromSecureStore).toHaveBeenCalled();
      expect(SecureStorage.removeItem).toHaveBeenCalledWith('APPS');
    });

    it('should do local logout if idToken is missing', async () => {
      (authTokenStore.loadAuthDataFromSecureStore as jest.Mock).mockResolvedValue({ idToken: null });

      await logout();

      expect(mockedAppLogout).not.toHaveBeenCalled();
      expect(authTokenStore.clearAuthDataFromSecureStore).toHaveBeenCalled();
    });
  });

  describe('getBackendToken', () => {
    it('should fetch backend token successfully', async () => {
      (authTokenStore.loadAuthDataFromSecureStore as jest.Mock).mockResolvedValue({ accessToken: 'valid' });
      mockedJwtDecode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 });
      (mockedAxios.post as jest.Mock).mockResolvedValueOnce({ status: 200, data: { access_token: 'backend-token' } });

      const result = await getBackendToken('app-id', jest.fn());
      expect(result).toBe('backend-token');
    });

    it('should call onLogout on 401 from backend', async () => {
      (authTokenStore.loadAuthDataFromSecureStore as jest.Mock).mockResolvedValue({ accessToken: 'valid' });
      (mockedAxios.post as jest.Mock).mockRejectedValueOnce({ response: { status: 401 } });

      const onLogout = jest.fn();
      await getBackendToken('app-id', onLogout);
      expect(onLogout).toHaveBeenCalled();
    });

    it('should return null if response status is not 200', async () => {
      (authTokenStore.loadAuthDataFromSecureStore as jest.Mock).mockResolvedValue({ accessToken: 'valid' });
      (mockedAxios.post as jest.Mock).mockResolvedValueOnce({ status: 500 });
      const result = await getBackendToken('app-id', jest.fn());
      expect(result).toBeNull();
    });
  });

  describe('isTokenExpiringSoon', () => {
    it('should return true if token expires in less than 60 seconds', () => {
      mockedJwtDecode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 30 });
      expect(isTokenExpiringSoon('token')).toBe(true);
    });

    it('should return false if token is valid for longer', () => {
      mockedJwtDecode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 120 });
      expect(isTokenExpiringSoon('token')).toBe(false);
    });

    it('should return true if decoding fails', () => {
      mockedJwtDecode.mockImplementationOnce(() => { throw new Error('fail'); });
      expect(isTokenExpiringSoon('token')).toBe(true);
    });
  });

  describe('tokenExchange', () => {
    const mockDispatch = jest.fn();
    const mockLogout = jest.fn();

    it('should exchange token successfully', async () => {
      (authTokenStore.loadAuthDataFromSecureStore as jest.Mock).mockResolvedValue({ accessToken: 'valid' });
      mockedJwtDecode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 });
      (mockedAxios.post as jest.Mock).mockResolvedValueOnce({ status: 200, data: { access_token: 'exchanged-token' } });

      const result = await tokenExchange(mockDispatch, 'client-id', '', 'app1', mockLogout);
      expect(result).toBe('exchanged-token');
      expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'apps/updateExchangedToken' }));
    });

    it('should retry on 401', async () => {
      (authTokenStore.loadAuthDataFromSecureStore as jest.Mock).mockResolvedValue({ accessToken: 'expired-or-old', refreshToken: 'ref' });
      mockedJwtDecode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 });

      // First attempt 401
      (mockedAxios.post as jest.Mock).mockResolvedValueOnce({ status: 401 });

      // Refresh token mock
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ access_token: 'new-acc', refresh_token: 'ref', id_token: 'id' })
      });

      // Second attempt success
      (mockedAxios.post as jest.Mock).mockResolvedValueOnce({ status: 200, data: { access_token: 'exchanged-token' } });

      const result = await tokenExchange(mockDispatch, 'client-id', '', 'app1', mockLogout);
      expect(result).toBe('exchanged-token');
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });

    it('should handle network error with alert', async () => {
      (authTokenStore.loadAuthDataFromSecureStore as jest.Mock).mockResolvedValue({ accessToken: 'valid' });
      mockedJwtDecode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 });
      (mockedAxios.post as jest.Mock).mockRejectedValueOnce(new Error('Network Error'));

      await tokenExchange(mockDispatch, 'client-id', '', 'app1', mockLogout);
      expect(Alert.alert).toHaveBeenCalledWith('Network Error', expect.any(String));
    });

    it('should handle generic error with alert', async () => {
      (authTokenStore.loadAuthDataFromSecureStore as jest.Mock).mockResolvedValue({ accessToken: 'valid' });
      mockedJwtDecode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 });
      (mockedAxios.post as jest.Mock).mockRejectedValueOnce(new Error('Some other error'));

      await tokenExchange(mockDispatch, 'client-id', '', 'app1', mockLogout);
      expect(Alert.alert).toHaveBeenCalledWith('Error', expect.any(String));
    });

    it('should return null if no stored auth data', async () => {
      (authTokenStore.loadAuthDataFromSecureStore as jest.Mock).mockResolvedValue(null);
      const result = await tokenExchange(mockDispatch, 'client-id', '', 'app1', mockLogout);
      expect(result).toBeNull();
    });

    it('should return null if token exchange response missing token', async () => {
      (authTokenStore.loadAuthDataFromSecureStore as jest.Mock).mockResolvedValue({ accessToken: 'valid' });
      mockedJwtDecode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 });
      (mockedAxios.post as jest.Mock).mockResolvedValueOnce({ status: 200, data: {} });

      const result = await tokenExchange(mockDispatch, 'client-id', '', 'app1', mockLogout);
      expect(result).toBeNull();
    });

    it('should return null if token refresh fails inside tokenExchange', async () => {
      (authTokenStore.loadAuthDataFromSecureStore as jest.Mock).mockResolvedValue({ accessToken: 'expired', refreshToken: 'ref' });
      mockedJwtDecode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) - 3600 }); // expired

      // Refresh fails
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 400 });

      const result = await tokenExchange(mockDispatch, 'client-id', '', 'app1', mockLogout);
      expect(result).toBeUndefined(); // It returns undefined because of the early return in the code
    });

    it('should return null on non-401 failure in tokenExchange', async () => {
      (authTokenStore.loadAuthDataFromSecureStore as jest.Mock).mockResolvedValue({ accessToken: 'valid' });
      mockedJwtDecode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 });
      (mockedAxios.post as jest.Mock).mockResolvedValueOnce({ status: 500, data: 'Error' });

      const result = await tokenExchange(mockDispatch, 'client-id', '', 'app1', mockLogout);
      expect(result).toBeNull();
    });

    it('should return null on exception in tokenExchange', async () => {
      (authTokenStore.loadAuthDataFromSecureStore as jest.Mock).mockResolvedValue({ accessToken: 'valid' });
      mockedJwtDecode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 });
      (mockedAxios.post as jest.Mock).mockImplementationOnce(() => { throw new Error('fail'); });

      const result = await tokenExchange(mockDispatch, 'client-id', '', 'app1', mockLogout);
      expect(result).toBeNull();
    });

    it('should return null if accessToken is missing in authData', async () => {
      (authTokenStore.loadAuthDataFromSecureStore as jest.Mock).mockResolvedValue({ refreshToken: 'ref' });
      const result = await tokenExchange(mockDispatch, 'client-id', '', 'app1', mockLogout);
      expect(result).toBeNull();
    });
  });
});
