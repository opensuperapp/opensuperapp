import { shouldRefreshToken } from '../tokenRefreshManager';
import * as authService from '@/services/authService';
import * as authTokenStore from '@/utils/authTokenStore';
import { jwtDecode } from 'jwt-decode';

jest.mock('@/services/authService');
jest.mock('@/utils/authTokenStore');
jest.mock('jwt-decode', () => ({
  jwtDecode: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    multiGet: jest.fn(),
    multiSet: jest.fn(),
    multiRemove: jest.fn(),
    clear: jest.fn(),
    getAllKeys: jest.fn(),
    flushGetRequests: jest.fn(),
  },
}));

jest.mock('redux-persist', () => ({
  persistStore: jest.fn(() => ({ _persist: { version: -1, hydrated: true } })),
  persistReducer: jest.fn((config, reducer) => reducer),
  createTransform: jest.fn((inbound, outbound, config) => ({ inbound, outbound, config })),
}));

jest.mock('expo-secure-store', () => ({
  deleteItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

jest.mock('@notifee/react-native', () => ({
  createChannel: jest.fn(),
  deleteChannel: jest.fn(),
  displayNotification: jest.fn(),
  cancelNotification: jest.fn(),
  cancelAllNotifications: jest.fn(),
  requestPermission: jest.fn(),
  getInitialNotification: jest.fn(),
  setNotificationCategories: jest.fn(),
  onBackgroundEvent: jest.fn(),
  onForegroundEvent: jest.fn(),
}));

describe('tokenRefreshManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(1000000);
    (jwtDecode as jest.Mock).mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('shouldRefreshToken', () => {
    it('returns false when no auth data', async () => {
      jest.spyOn(authTokenStore, 'loadAuthDataFromSecureStore').mockResolvedValue(null);
      const result = await shouldRefreshToken();
      expect(result).toBe(false);
    });

    it('returns false when token is not near expiry (3600s lifetime)', async () => {
      const now = 1000000;
      const iat = Math.floor(now / 1000);
      const exp = iat + 3600;
      const expiresAt = exp * 1000;
      (jwtDecode as jest.Mock).mockReturnValue({ iat, exp });
      jest.spyOn(authTokenStore, 'loadAuthDataFromSecureStore').mockResolvedValue({
        accessToken: 'valid_token',
        idToken: 'id_token',
        refreshToken: 'refresh_token',
        expiresAt,
      });
      jest.setSystemTime(now);
      const result = await shouldRefreshToken();
      expect(result).toBe(false);
    });

    it('returns true when token is at 80% of lifetime (3600s)', async () => {
      const now = 1000000;
      const iat = Math.floor(now / 1000);
      const exp = iat + 3600;
      const expiresAt = exp * 1000;
      const timeElapsed = 3600 * 0.801;
      (jwtDecode as jest.Mock).mockReturnValue({ iat, exp });
      jest.spyOn(authTokenStore, 'loadAuthDataFromSecureStore').mockResolvedValue({
        accessToken: 'token',
        idToken: 'id_token',
        refreshToken: 'refresh_token',
        expiresAt,
      });
      jest.setSystemTime(now + (timeElapsed * 1000));
      const result = await shouldRefreshToken();
      expect(result).toBe(true);
    });

    it('returns true when token is beyond 80% of lifetime (3600s)', async () => {
      const now = 1000000;
      const iat = Math.floor(now / 1000);
      const exp = iat + 3600;
      const expiresAt = exp * 1000;
      const timeElapsed = 3600 * 0.9;
      (jwtDecode as jest.Mock).mockReturnValue({ iat, exp });
      jest.spyOn(authTokenStore, 'loadAuthDataFromSecureStore').mockResolvedValue({
        accessToken: 'token',
        idToken: 'id_token',
        refreshToken: 'refresh_token',
        expiresAt,
      });
      jest.setSystemTime(now + (timeElapsed * 1000));
      const result = await shouldRefreshToken();
      expect(result).toBe(true);
    });

    it('returns false when token is not near expiry (7200s lifetime)', async () => {
      const now = 1000000;
      const iat = Math.floor(now / 1000);
      const exp = iat + 7200;
      const expiresAt = exp * 1000;
      (jwtDecode as jest.Mock).mockReturnValue({ iat, exp });
      jest.spyOn(authTokenStore, 'loadAuthDataFromSecureStore').mockResolvedValue({
        accessToken: 'valid_token',
        idToken: 'id_token',
        refreshToken: 'refresh_token',
        expiresAt,
      });
      jest.setSystemTime(now);
      const result = await shouldRefreshToken();
      expect(result).toBe(false);
    });

    it('returns true when token is at 80% of lifetime (7200s)', async () => {
      const now = 1000000;
      const iat = Math.floor(now / 1000);
      const exp = iat + 7200;
      const expiresAt = exp * 1000;
      const timeElapsed = 7200 * 0.801;
      (jwtDecode as jest.Mock).mockReturnValue({ iat, exp });
      jest.spyOn(authTokenStore, 'loadAuthDataFromSecureStore').mockResolvedValue({
        accessToken: 'token',
        idToken: 'id_token',
        refreshToken: 'refresh_token',
        expiresAt,
      });
      jest.setSystemTime(now + (timeElapsed * 1000));
      const result = await shouldRefreshToken();
      expect(result).toBe(true);
    });

    it('falls back to 3600s when JWT decode fails', async () => {
      const now = 1000000;
      const expiresAt = now + (60 * 60 * 1000);
      (jwtDecode as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });
      jest.spyOn(authTokenStore, 'loadAuthDataFromSecureStore').mockResolvedValue({
        accessToken: 'invalid_token',
        idToken: 'id_token',
        refreshToken: 'refresh_token',
        expiresAt,
      });
      jest.setSystemTime(now);
      const result = await shouldRefreshToken();
      expect(result).toBe(false);
    });
  });
});
