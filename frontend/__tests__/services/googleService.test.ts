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
import googleAuthenticationService, {
  refreshAccessToken,
  uploadToGoogleDrive,
  restoreGoogleDriveBackup,
  listAppDataFiles,
  isAuthenticatedWithGoogle,
  removeGoogleAuthState,
  getGoogleUserInfo,
} from '@/services/googleService';
import SecureStorage from '@/utils/secureStorage';

jest.mock('@/utils/secureStorage');
jest.mock('react-native', () => ({
  Platform: {
    select: jest.fn(({ ios, android, default: def }) => ios || android || def),
  },
}));

// Mock Constants
jest.mock('@/constants/Constants', () => ({
  GOOGLE_ACCESS_TOKEN_KEY: 'google_access_token',
  GOOGLE_USER_INFO_KEY: 'google_user_info',
  GOOGLE_USER_INFO_URL: 'http://google-user-info',
  GOOGLE_DRIVE_UPLOAD_URL: 'http://google-upload',
  GOOGLE_DRIVE_LIST_FILES_URL: 'http://google-list',
  GOOGLE_DRIVE_FILE_DOWNLOAD_URL: (id: string) => `http://google-download/${id}`,
  GOOGLE_TOKEN_INFO_URL: (token: string) => `http://google-token-info/${token}`,
  GOOGLE_IOS_CLIENT_ID: 'ios-client-id',
  GOOGLE_TOKEN_URL: 'http://google-token',
  GOOGLE_REFRESH_TOKEN_KEY: 'google_refresh_token',
}));

global.fetch = jest.fn();

describe('googleService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('refreshAccessToken', () => {
    it('should refresh access token successfully', async () => {
      (SecureStorage.getItem as jest.Mock).mockResolvedValueOnce('refresh-token');
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ access_token: 'new-access-token' }),
      });

      const result = await refreshAccessToken();
      expect(result).toBe('new-access-token');
      expect(SecureStorage.setItem).toHaveBeenCalledWith('google_access_token', 'new-access-token');
    });

    it('should throw error if no refresh token found', async () => {
      (SecureStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
      await expect(refreshAccessToken()).rejects.toThrow('No refresh token found');
    });

    it('should throw error if fetch fails', async () => {
      (SecureStorage.getItem as jest.Mock).mockResolvedValueOnce('refresh-token');
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        text: jest.fn().mockResolvedValue('Invalid Grant'),
      });

      await expect(refreshAccessToken()).rejects.toThrow('Failed to refresh token: Invalid Grant');
    });
  });

  describe('googleAuthenticationService', () => {
    it('should handle successful google authentication', async () => {
      const mockResponse = {
        type: 'success',
        authentication: {
          accessToken: 'google-access-token',
          refreshToken: 'google-refresh-token',
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ email: 'test@gmail.com', name: 'Test User' }),
      });

      const result = await googleAuthenticationService(mockResponse as any);

      expect(result.status).toBe(true);
      expect(result.userInfo?.email).toBe('test@gmail.com');
      expect(SecureStorage.setItem).toHaveBeenCalledWith('google_access_token', 'google-access-token');
      expect(SecureStorage.setItem).toHaveBeenCalledWith('google_refresh_token', 'google-refresh-token');
    });

    it('should handle authentication failed response', async () => {
      const result = await googleAuthenticationService({ type: 'failed' } as any);
      expect(result.status).toBe(false);
      expect(result.error).toBe('Authentication failed');
    });
  });

  describe('uploadToGoogleDrive', () => {
    it('should upload data successfully', async () => {
      (SecureStorage.getItem as jest.Mock).mockResolvedValueOnce('valid-token');
      // getValidAccessToken calls fetch for validation
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ expires_in: 3600 }),
      });
      // upload fetch
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify({ id: 'file-id' })),
      });

      const result = await uploadToGoogleDrive({ foo: 'bar' });
      expect(result.id).toBe('file-id');
    });
  });

  describe('restoreGoogleDriveBackup', () => {
    it('should restore latest backup', async () => {
      (SecureStorage.getItem as jest.Mock).mockResolvedValueOnce('valid-token');
      // getValidAccessToken calls fetch for validation
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ expires_in: 3600 }),
      });
      // list files fetch
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          files: [
            { id: '1', createdTime: '2023-01-01T00:00:00Z' },
            { id: '2', createdTime: '2023-01-02T00:00:00Z' },
          ],
        }),
      });
      // download file fetch
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ restoredData: 'yay' }),
      });

      const result = await restoreGoogleDriveBackup();
      expect(result.restoredData).toBe('yay');
    });

    it('should throw error if no files found', async () => {
      (SecureStorage.getItem as jest.Mock).mockResolvedValueOnce('valid-token');
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ expires_in: 3600 }),
      });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ files: [] }),
      });

      await expect(restoreGoogleDriveBackup()).rejects.toThrow('No backup files found in Google Drive');
    });
  });

  describe('isAuthenticatedWithGoogle', () => {
    it('should return true if token is valid', async () => {
      (SecureStorage.getItem as jest.Mock).mockResolvedValueOnce('token');
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ expires_in: 100 }),
      });

      const result = await isAuthenticatedWithGoogle();
      expect(result).toBe(true);
    });

    it('should return false if no token', async () => {
      (SecureStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
      const result = await isAuthenticatedWithGoogle();
      expect(result).toBe(false);
    });
  });

  describe('removeGoogleAuthState', () => {
    it('should remove items from secure storage', async () => {
      await removeGoogleAuthState();
      expect(SecureStorage.removeItem).toHaveBeenCalledTimes(3);
    });
  });

  describe('getGoogleUserInfo', () => {
    it('should return parsed user info', async () => {
      (SecureStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify({ name: 'Bob' }));
      const result = await getGoogleUserInfo();
      expect(result.name).toBe('Bob');
    });

    it('should throw error if no user info found', async () => {
      (SecureStorage.getItem as jest.Mock).mockResolvedValue(null);
      await expect(getGoogleUserInfo()).rejects.toThrow('No user info found');
    });

    it('should log error on JSON parse failure', async () => {
      (SecureStorage.getItem as jest.Mock).mockResolvedValue('invalid-json');
      await expect(getGoogleUserInfo()).rejects.toThrow();
    });
  });

  describe('isAuthenticatedWithGoogle additional paths', () => {
    it('should refresh token if initial check returns not ok', async () => {
      (SecureStorage.getItem as jest.Mock).mockResolvedValue('old-token');
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: false }) // Initial check fails
        .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({ access_token: 'new-token' }) }); // Refresh check

      (SecureStorage.getItem as jest.Mock).mockResolvedValueOnce('new-token'); // After refresh

      const result = await isAuthenticatedWithGoogle();
      expect(result).toBe(true);
    });

    it('should return false on exception', async () => {
      (SecureStorage.getItem as jest.Mock).mockRejectedValue(new Error('fail'));
      const result = await isAuthenticatedWithGoogle();
      expect(result).toBe(false);
    });
  });

  describe('removeGoogleAuthState error handling', () => {
    it('should catch and log errors', async () => {
      (SecureStorage.removeItem as jest.Mock).mockRejectedValue(new Error('fail'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      await removeGoogleAuthState();
      expect(consoleSpy).toHaveBeenCalledWith('Failed to remove Google auth state:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('listAppDataFiles', () => {
    it('should list files successfully', async () => {
      (SecureStorage.getItem as jest.Mock).mockResolvedValue('valid-token');
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({ expires_in: 3600 }) }) // getValidAccessToken check
        .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({ files: [{ id: '1', name: 'f1' }] }) }); // actual list calls

      const files = await listAppDataFiles();
      expect(files).toHaveLength(1);
      expect(files[0].id).toBe('1');
    });

    it('should throw error if fetch fails', async () => {
      (SecureStorage.getItem as jest.Mock).mockResolvedValue('valid-token');
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({ expires_in: 3600 }) }) // getValidAccessToken success
        .mockResolvedValueOnce({
          ok: false,
          text: jest.fn().mockResolvedValue('API Error')
        }); // actual list calls failure

      await expect(listAppDataFiles()).rejects.toThrow('Failed to list files: API Error');
    });

    it('should catch error in removeGoogleAuthState', async () => {
      (SecureStorage.removeItem as jest.Mock).mockRejectedValue(new Error('fail'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      await removeGoogleAuthState();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('restoreGoogleDriveBackup additional error paths', () => {
    it('should throw if list fails', async () => {
      (SecureStorage.getItem as jest.Mock).mockResolvedValue('token');
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({ expires_in: 3600 }) })
        .mockResolvedValueOnce({ ok: false, text: jest.fn().mockResolvedValue('error') });

      await expect(restoreGoogleDriveBackup()).rejects.toThrow('Failed to fetch backup files: error');
    });

    it('should throw if download fails', async () => {
      (SecureStorage.getItem as jest.Mock).mockResolvedValue('token');
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({ expires_in: 3600 }) })
        .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({ files: [{ id: '1', createdTime: 'now' }] }) })
        .mockResolvedValueOnce({ ok: false, text: jest.fn().mockResolvedValue('down err') });

      await expect(restoreGoogleDriveBackup()).rejects.toThrow('Failed to download backup file: down err');
    });

    it('should throw if parse fails', async () => {
      (SecureStorage.getItem as jest.Mock).mockResolvedValue('token');
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({ expires_in: 3600 }) })
        .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({ files: [{ id: '1', createdTime: 'now' }] }) })
        .mockResolvedValueOnce({ ok: true, json: jest.fn().mockImplementation(() => { throw new Error('parse fail'); }) });

      await expect(restoreGoogleDriveBackup()).rejects.toThrow('Failed to parse backup content as JSON');
    });
  });
});
