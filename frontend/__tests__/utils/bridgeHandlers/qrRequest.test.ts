
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

import { BRIDGE_FUNCTION as qrRequestBridgeFunction } from '@/utils/bridgeHandlers/qrRequest';

describe('qrRequest bridge handler', () => {
    it('should set the qrScanCallback and show the scanner', () => {
        const setScannerVisible = jest.fn();
        const resolve = jest.fn();
        const context = {
            qrScanCallback: null,
            setScannerVisible,
            resolve,
            reject: jest.fn(),
        };

        qrRequestBridgeFunction.handler({}, context);

        expect(context.setScannerVisible).toHaveBeenCalledWith(true);
        expect(context.qrScanCallback).toBeInstanceOf(Function);

        // Simulate a QR code scan
        const scannedQrCode = 'test-qr-code';
        if (context.qrScanCallback) {
            context.qrScanCallback(scannedQrCode);
        }

        expect(context.resolve).toHaveBeenCalledWith(scannedQrCode);
    });
});
