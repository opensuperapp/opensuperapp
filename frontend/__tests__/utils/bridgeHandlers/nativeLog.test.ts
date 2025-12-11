
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

import { BRIDGE_FUNCTION as nativeLogBridgeFunction } from '@/utils/bridgeHandlers/nativeLog';

describe('nativeLog bridge handler', () => {
    const originalDev = __DEV__;
    let consoleInfoSpy: jest.SpyInstance;
    let consoleWarnSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
        consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
        consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        Object.defineProperty(global, '__DEV__', {
            value: originalDev,
            configurable: true,
        });
        jest.restoreAllMocks();
    });

    it('should not log anything if __DEV__ is false', () => {
        Object.defineProperty(global, '__DEV__', {
            value: false,
            configurable: true,
        });

        const context = { resolve: jest.fn(), reject: jest.fn() };
        const params = { level: 'info', message: 'Test Info' };

        nativeLogBridgeFunction.handler(params, context);

        expect(consoleInfoSpy).not.toHaveBeenCalled();
        expect(consoleWarnSpy).not.toHaveBeenCalled();
        expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should log an info message', () => {
        Object.defineProperty(global, '__DEV__', {
            value: true,
            configurable: true,
        });

        const context = { resolve: jest.fn(), reject: jest.fn() };
        const params = { level: 'info', message: 'Test Info' };

        nativeLogBridgeFunction.handler(params, context);

        expect(consoleInfoSpy).toHaveBeenCalledWith('[Micro App] Test Info.', '');
    });

    it('should log a warn message', () => {
        Object.defineProperty(global, '__DEV__', {
            value: true,
            configurable: true,
        });

        const context = { resolve: jest.fn(), reject: jest.fn() };
        const params = { level: 'warn', message: 'Test Warn' };

        nativeLogBridgeFunction.handler(params, context);

        expect(consoleWarnSpy).toHaveBeenCalledWith('[Micro App] Test Warn.', '');
    });

    it('should log an error message', () => {
        Object.defineProperty(global, '__DEV__', {
            value: true,
            configurable: true,
        });

        const context = { resolve: jest.fn(), reject: jest.fn() };
        const params = { level: 'error', message: 'Test Error' };

        nativeLogBridgeFunction.handler(params, context);

        expect(consoleErrorSpy).toHaveBeenCalledWith('[Micro App] Test Error.', '');
    });

    it('should log data if provided', () => {
        Object.defineProperty(global, '__DEV__', {
            value: true,
            configurable: true,
        });

        const context = { resolve: jest.fn(), reject: jest.fn() };
        const params = { level: 'info', message: 'Test Info', data: { foo: 'bar' } };

        nativeLogBridgeFunction.handler(params, context);

        expect(consoleInfoSpy).toHaveBeenCalledWith('[Micro App] Test Info.', { foo: 'bar' });
    });
});
