
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

import { BRIDGE_FUNCTION as alertBridgeFunction } from '@/utils/bridgeHandlers/alert';
import { Alert } from 'react-native';

jest.mock('react-native', () => ({
    Alert: {
      alert: jest.fn(),
    },
}));

describe('alert bridge handler', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should call Alert.alert with correct parameters and resolve on button press', () => {
        const resolve = jest.fn();
        const context = { resolve, reject: jest.fn() };
        const params = {
            title: 'Test Title',
            message: 'Test Message',
            buttonText: 'OK',
        };

        alertBridgeFunction.handler(params, context);

        expect(Alert.alert).toHaveBeenCalledWith(
            params.title,
            params.message,
            [
                {
                    text: params.buttonText,
                    onPress: expect.any(Function),
                },
            ],
            { cancelable: false }
        );

        // Simulate button press
        const onPressCallback = (Alert.alert as jest.Mock).mock.calls[0][2][0].onPress;
        onPressCallback();

        expect(context.resolve).toHaveBeenCalledWith(true);
    });
});
