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
} from '@/services/authService';
import SecureStorage from '@/utils/secureStorage';

jest.mock('axios');
jest.mock('@/utils/secureStorage');
jest.mock('react-native-app-auth');
jest.mock('jwt-decode', () => ({
  jwtDecode: jest.fn().mockImplementation((token) => ({
    email: 'test@example.com',
    exp: Math.floor(Date.now() / 1000) + 3600,
  })),
}));

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

      (SecureStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(mockAuthData)
      );

      const result = await loadAuthData();

      expect(SecureStorage.getItem).toHaveBeenCalledWith('authData');
      expect(result).toEqual(mockAuthData);
    });

    it('should return null if no auth data exists', async () => {
      (SecureStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await loadAuthData();

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      (SecureStorage.getItem as jest.Mock).mockRejectedValue(
        new Error('Storage error')
      );

      await expect(loadAuthData()).rejects.toThrow('Storage error');
    });
  });

  describe('processNativeAuthResult', () => {
    it('should process auth result successfully', async () => {
      const mockAuthResult = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        idToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20ifQ.test',
        accessTokenExpirationDate: new Date(Date.now() + 3600000).toISOString(),
      };

      const result = await processNativeAuthResult(mockAuthResult as any);

      expect(result).toBeDefined();
      expect(result?.accessToken).toBe('new-access-token');
      expect(result?.refreshToken).toBe('new-refresh-token');
    });

    it('should handle missing tokens', async () => {
      const mockAuthResult = {
        accessToken: '',
        refreshToken: '',
        idToken: '',
      };

      const result = await processNativeAuthResult(mockAuthResult as any);

      expect(result).toBeNull();
    });
  });
});
