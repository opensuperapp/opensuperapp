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
import { renderHook, act } from '@testing-library/react-native';
import { useMicroApp } from '@/hooks/useMicroApp';
import { WebViewMessageEvent } from 'react-native-webview';
import { ALLOWED_BRIDGE_METHODS_CONFIG_KEY } from '@/constants/Constants';

jest.mock('react-redux', () => ({
  useDispatch: () => jest.fn(),
  useSelector: jest.fn((selector) => selector({
    apps: {
      apps: [{
        appId: 'test-app-id',
        configs: [
          {
            microAppId: 'test-app-id',
            configKey: require('@/constants/Constants').ALLOWED_BRIDGE_METHODS_CONFIG_KEY,
            configValue: ['test-topic', 'token', 'qrRequest'],
            isActive: 1,
          }
        ],
      }],
    },
  })),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('react-native-webview', () => ({
  WebView: () => null,
}));

jest.mock('expo-auth-session/providers/google', () => ({
  useAuthRequest: () => [null, null, jest.fn()],
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/services/authService', () => ({
  tokenExchange: jest.fn(() => Promise.resolve('test-token')),
  logout: jest.fn(),
}));

jest.mock('@/services/googleService', () => jest.fn(() => Promise.resolve({ status: true, userInfo: {} })));

jest.mock('@/utils/bridgeRegistry', () => ({
  getBridgeHandler: jest.fn(() => jest.fn()),
  getResolveMethod: jest.fn(),
  getRejectMethod: jest.fn(),
}));

describe('useMicroApp', () => {
  const params = {
    webViewUri: 'https://example.com',
    appName: 'Test App',
    clientId: 'test-client-id',
    exchangedToken: 'test-exchanged-token',
    appId: 'test-app-id',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with the correct state', () => {
    const { result } = renderHook(() => useMicroApp(params));

    expect(result.current.isScannerVisible).toBe(false);
    expect(result.current.hasError).toBe(false);
    expect(result.current.webUri).toBe('');
    expect(result.current.isDeveloper).toBe(false);
    expect(result.current.isTotp).toBe(false);
  });

  it('should handle messages from webview', async () => {
    const { result } = renderHook(() => useMicroApp(params));
    const event = {
      nativeEvent: {
        data: JSON.stringify({ topic: 'test-topic', data: { foo: 'bar' }, requestId: '123' }),
      },
    } as WebViewMessageEvent;

    await act(async () => {
      await result.current.onMessage(event);
    });

    expect(require('@/utils/bridgeRegistry').getBridgeHandler).toHaveBeenCalledWith('test-topic');
  });

  it('should block bridge methods not in allowedBridgeMethods list', async () => {
    const { result } = renderHook(() => useMicroApp(params));
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    const bridgeRegistry = require('@/utils/bridgeRegistry');
    
    const event = {
      nativeEvent: {
        data: JSON.stringify({ topic: 'unauthorized-method', data: { foo: 'bar' }, requestId: '123' }),
      },
    } as WebViewMessageEvent;

    await act(async () => {
      await result.current.onMessage(event);
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('Bridge method not allowed:', 'unauthorized-method');
    expect(bridgeRegistry.getBridgeHandler).not.toHaveBeenCalled();
    
    consoleErrorSpy.mockRestore();
  });

  it('should allow bridge methods in allowedBridgeMethods list', async () => {
    const { result } = renderHook(() => useMicroApp(params));
    const bridgeRegistry = require('@/utils/bridgeRegistry');
    const mockHandler = jest.fn();
    bridgeRegistry.getBridgeHandler.mockReturnValue(mockHandler);
    
    const event = {
      nativeEvent: {
        data: JSON.stringify({ topic: 'token', data: { foo: 'bar' }, requestId: '123' }),
      },
    } as WebViewMessageEvent;

    await act(async () => {
      await result.current.onMessage(event);
    });

    expect(bridgeRegistry.getBridgeHandler).toHaveBeenCalledWith('token');
    expect(mockHandler).toHaveBeenCalled();
  });

  it('should block all methods when allowedBridgeMethods is empty array', async () => {
    const useSelector = require('react-redux').useSelector;
    useSelector.mockImplementation((selector: any) => selector({
      apps: {
        apps: [{
          appId: 'test-app-id',
          configs: [
            {
              microAppId: 'test-app-id',
              configKey: ALLOWED_BRIDGE_METHODS_CONFIG_KEY,
              configValue: [],
              isActive: 1,
            }
          ],
        }],
      },
    }));

    const { result } = renderHook(() => useMicroApp(params));
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    const bridgeRegistry = require('@/utils/bridgeRegistry');
    
    const event = {
      nativeEvent: {
        data: JSON.stringify({ topic: 'token', data: { foo: 'bar' }, requestId: '123' }),
      },
    } as WebViewMessageEvent;

    await act(async () => {
      await result.current.onMessage(event);
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('Bridge method not allowed:', 'token');
    expect(bridgeRegistry.getBridgeHandler).not.toHaveBeenCalled();
    
    consoleErrorSpy.mockRestore();
    
    // Reset mock for other tests
    useSelector.mockImplementation((selector: any) => selector({
      apps: {
        apps: [{
          appId: 'test-app-id',
          configs: [
            {
              microAppId: 'test-app-id',
              configKey: ALLOWED_BRIDGE_METHODS_CONFIG_KEY,
              configValue: ['test-topic', 'token', 'qrRequest'],
              isActive: 1,
            }
          ],
        }],
      },
    }));
  });
  
  it('should block all methods when allowedBridgeMethods config is not found (undefined)', async () => {
    const useSelector = require('react-redux').useSelector;
    useSelector.mockImplementation((selector: any) => selector({
      apps: {
        apps: [{
          appId: 'test-app-id',
          configs: [], // No config for allowedBridgeMethods
        }],
      },
    }));

    const { result } = renderHook(() => useMicroApp(params));
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    const bridgeRegistry = require('@/utils/bridgeRegistry');
    
    const event = {
      nativeEvent: {
        data: JSON.stringify({ topic: 'token', data: { foo: 'bar' }, requestId: '123' }),
      },
    } as WebViewMessageEvent;

    await act(async () => {
      await result.current.onMessage(event);
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('Bridge method not allowed:', 'token');
    expect(bridgeRegistry.getBridgeHandler).not.toHaveBeenCalled();
    
    consoleErrorSpy.mockRestore();
    
    // Reset mock for other tests
    useSelector.mockImplementation((selector: any) => selector({
      apps: {
        apps: [{
          appId: 'test-app-id',
          configs: [
            {
              microAppId: 'test-app-id',
              configKey: ALLOWED_BRIDGE_METHODS_CONFIG_KEY,
              configValue: ['test-topic', 'token', 'qrRequest'],
              isActive: 1,
            }
          ],
        }],
      },
    }));
  });
});