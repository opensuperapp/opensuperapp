import { shouldRefreshToken, isRefreshTokenNearExpiry } from '../tokenRefreshManager';
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

    it('returns false when token is not near expiry', async () => {
      const now = 1000000;
      const expiresAt = now + (60 * 60 * 1000);
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

    it('returns true when token is at 80% of lifetime', async () => {
      const now = 1000000;
      const tokenLifetime = 60 * 60 * 1000;
      const expiresAt = now + tokenLifetime;
      const timeElapsed = tokenLifetime * 0.801;
      jest.spyOn(authTokenStore, 'loadAuthDataFromSecureStore').mockResolvedValue({
        accessToken: 'token',
        idToken: 'id_token',
        refreshToken: 'refresh_token',
        expiresAt,
      });
      jest.setSystemTime(now + timeElapsed);
      const result = await shouldRefreshToken();
      expect(result).toBe(true);
    });

    it('returns true when token is beyond 80% of lifetime', async () => {
      const now = 1000000;
      const tokenLifetime = 60 * 60 * 1000;
      const expiresAt = now + tokenLifetime;
      const timeElapsed = tokenLifetime * 0.9;
      jest.spyOn(authTokenStore, 'loadAuthDataFromSecureStore').mockResolvedValue({
        accessToken: 'token',
        idToken: 'id_token',
        refreshToken: 'refresh_token',
        expiresAt,
      });
      jest.setSystemTime(now + timeElapsed);
      const result = await shouldRefreshToken();
      expect(result).toBe(true);
    });
  });

  describe('isRefreshTokenNearExpiry', () => {
    it('returns false when no refresh token', async () => {
      jest.spyOn(authTokenStore, 'loadAuthDataFromSecureStore').mockResolvedValue({
        accessToken: 'token',
        idToken: 'id_token',
        refreshToken: null,
      });
      const result = await isRefreshTokenNearExpiry();
      expect(result).toBe(false);
    });

    it('returns true when refresh token expires in 7 days', async () => {
      const now = 1000000;
      const expiresAt = now + (7 * 24 * 60 * 60 * 1000);
      (jwtDecode as jest.Mock).mockReturnValue({ exp: Math.floor(expiresAt / 1000) });
      jest.spyOn(authTokenStore, 'loadAuthDataFromSecureStore').mockResolvedValue({
        refreshToken: 'refresh_token',
      });
      jest.setSystemTime(now);
      const result = await isRefreshTokenNearExpiry();
      expect(result).toBe(true);
    });

    it('returns false when refresh token has 30 days remaining', async () => {
      const now = 1000000;
      const expiresAt = now + (30 * 24 * 60 * 60 * 1000);
      (jwtDecode as jest.Mock).mockReturnValue({ exp: Math.floor(expiresAt / 1000) });
      jest.spyOn(authTokenStore, 'loadAuthDataFromSecureStore').mockResolvedValue({
        refreshToken: 'refresh_token',
      });
      jest.setSystemTime(now);
      const result = await isRefreshTokenNearExpiry();
      expect(result).toBe(false);
    });

    it('returns false when jwt decode fails', async () => {
      (jwtDecode as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });
      jest.spyOn(authTokenStore, 'loadAuthDataFromSecureStore').mockResolvedValue({
        refreshToken: 'invalid_token',
      });
      const result = await isRefreshTokenNearExpiry();
      expect(result).toBe(false);
    });
  });
});
