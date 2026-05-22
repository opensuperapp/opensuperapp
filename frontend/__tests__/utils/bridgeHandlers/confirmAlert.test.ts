
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

import { BRIDGE_FUNCTION as confirmAlertBridgeFunction } from '@/utils/bridgeHandlers/confirmAlert';
import { Alert } from 'react-native';

jest.mock('react-native', () => ({
    Alert: {
      alert: jest.fn(),
    },
}));

describe('confirmAlert bridge handler', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should call Alert.alert with correct parameters', () => {
        const context = { resolve: jest.fn(), reject: jest.fn() };
        const params = {
            title: 'Test Title',
            message: 'Test Message',
            cancelButtonText: 'Cancel',
            confirmButtonText: 'OK',
        };

        confirmAlertBridgeFunction.handler(params, context);

        expect(Alert.alert).toHaveBeenCalledWith(
            params.title,
            params.message,
            [
                {
                    text: params.cancelButtonText,
                    style: 'cancel',
                    onPress: expect.any(Function),
                },
                {
                    text: params.confirmButtonText,
                    onPress: expect.any(Function),
                },
            ],
            { cancelable: false }
        );
    });

    it('should resolve with "cancel" on cancel button press', () => {
        const context = { resolve: jest.fn(), reject: jest.fn() };
        const params = {
            title: 'Test Title',
            message: 'Test Message',
            cancelButtonText: 'Cancel',
            confirmButtonText: 'OK',
        };

        confirmAlertBridgeFunction.handler(params, context);

        const cancelButtonPress = (Alert.alert as jest.Mock).mock.calls[0][2][0].onPress;
        cancelButtonPress();

        expect(context.resolve).toHaveBeenCalledWith('cancel');
    });

    it('should resolve with "confirm" on confirm button press', () => {
        const context = { resolve: jest.fn(), reject: jest.fn() };
        const params = {
            title: 'Test Title',
            message: 'Test Message',
            cancelButtonText: 'Cancel',
            confirmButtonText: 'OK',
        };

        confirmAlertBridgeFunction.handler(params, context);

        const confirmButtonPress = (Alert.alert as jest.Mock).mock.calls[0][2][1].onPress;
        confirmButtonPress();

        expect(context.resolve).toHaveBeenCalledWith('confirm');
    });
});
