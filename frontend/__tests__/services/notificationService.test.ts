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
import * as Notifications from 'expo-notifications';
import {
    requestNotificationPermissions,
    getDevicePushToken,
    registerNotificationListeners,
    configureNotificationChannels,
    scheduleLocalNotification,
    cancelAllNotifications,
    getBadgeCount,
    setBadgeCount,
    clearBadgeCount,
    getExpoPushToken,
} from '@/services/notificationService';
import { Platform } from 'react-native';

let capturedHandler: any;
jest.mock('expo-notifications', () => ({
    setNotificationHandler: jest.fn((options) => {
        capturedHandler = options.handleNotification;
    }),
    getPermissionsAsync: jest.fn(),
    requestPermissionsAsync: jest.fn(),
    getDevicePushTokenAsync: jest.fn(),
    addNotificationReceivedListener: jest.fn(),
    addNotificationResponseReceivedListener: jest.fn(),
    setNotificationChannelAsync: jest.fn(),
    scheduleNotificationAsync: jest.fn(),
    cancelAllScheduledNotificationsAsync: jest.fn(),
    getBadgeCountAsync: jest.fn(),
    setBadgeCountAsync: jest.fn(),
    AndroidImportance: {
        MAX: 5,
        HIGH: 4,
    },
    SchedulableTriggerInputTypes: {
        TIME_INTERVAL: 'timeInterval',
    },
}));

jest.mock('react-native', () => ({
    Platform: {
        OS: 'ios',
    },
}));

describe('notificationService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('requestNotificationPermissions', () => {
        it('should return true if already granted', async () => {
            (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
            const result = await requestNotificationPermissions();
            expect(result).toBe(true);
        });

        it('should request permissions if not granted', async () => {
            (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'undetermined' });
            (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
            const result = await requestNotificationPermissions();
            expect(result).toBe(true);
            expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
        });

        it('should return false if permissions denied', async () => {
            (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
            (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
            const result = await requestNotificationPermissions();
            expect(result).toBe(false);
        });
    });

    describe('getDevicePushToken', () => {
        it('should return token data', async () => {
            (Notifications.getDevicePushTokenAsync as jest.Mock).mockResolvedValue({ data: 'token123' });
            const result = await getDevicePushToken();
            expect(result).toBe('token123');
        });

        it('should return null on error', async () => {
            (Notifications.getDevicePushTokenAsync as jest.Mock).mockRejectedValue(new Error('error'));
            const result = await getDevicePushToken();
            expect(result).toBeNull();
        });
    });

    describe('registerNotificationListeners', () => {
        it('should add listeners and return cleanup function', () => {
            const mockSub = { remove: jest.fn() };
            (Notifications.addNotificationReceivedListener as jest.Mock).mockReturnValue(mockSub);
            (Notifications.addNotificationResponseReceivedListener as jest.Mock).mockReturnValue(mockSub);

            const cleanup = registerNotificationListeners(jest.fn(), jest.fn());
            expect(Notifications.addNotificationReceivedListener).toHaveBeenCalled();
            expect(Notifications.addNotificationResponseReceivedListener).toHaveBeenCalled();

            cleanup();
            expect(mockSub.remove).toHaveBeenCalledTimes(2);
        });
    });

    describe('configureNotificationChannels', () => {
        it('should not set channels on iOS', async () => {
            Platform.OS = 'ios';
            await configureNotificationChannels();
            expect(Notifications.setNotificationChannelAsync).not.toHaveBeenCalled();
        });

        it('should set channels on Android', async () => {
            Platform.OS = 'android';
            await configureNotificationChannels();
            expect(Notifications.setNotificationChannelAsync).toHaveBeenCalled();
        });
    });

    describe('scheduleLocalNotification', () => {
        it('should schedule notification successfully', async () => {
            (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue('notificaiton-id');
            const result = await scheduleLocalNotification({ title: 'T', body: 'B' });
            expect(result).toBe('notificaiton-id');
            expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({
                content: expect.objectContaining({ title: 'T' })
            }));
        });
    });

    describe('cancelAllNotifications', () => {
        it('should call cancelAllScheduledNotificationsAsync', async () => {
            await cancelAllNotifications();
            expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
        });
    });

    describe('badge counts', () => {
        it('getBadgeCount should return count', async () => {
            (Notifications.getBadgeCountAsync as jest.Mock).mockResolvedValue(5);
            const result = await getBadgeCount();
            expect(result).toBe(5);
        });

        it('setBadgeCount should call setBadgeCountAsync', async () => {
            await setBadgeCount(10);
            expect(Notifications.setBadgeCountAsync).toHaveBeenCalledWith(10);
        });

        it('clearBadgeCount should set count to 0', async () => {
            await clearBadgeCount();
            expect(Notifications.setBadgeCountAsync).toHaveBeenCalledWith(0);
        });
    });

    describe('Notification callbacks', () => {
        it('should trigger onNotificationReceived', () => {
            const callback = jest.fn();
            registerNotificationListeners(callback, undefined);

            const listener = (Notifications.addNotificationReceivedListener as jest.Mock).mock.calls[0][0];
            listener({ content: { title: 'h' } });
            expect(callback).toHaveBeenCalled();
        });

        it('should trigger onNotificationTapped', () => {
            const callback = jest.fn();
            registerNotificationListeners(undefined, callback);

            const listener = (Notifications.addNotificationResponseReceivedListener as jest.Mock).mock.calls[0][0];
            listener({ notification: { content: { title: 'h' } } });
            expect(callback).toHaveBeenCalled();
        });

        it('should handle handleNotification', async () => {
            if (capturedHandler) {
                const result = await capturedHandler();
                expect(result.shouldShowAlert).toBe(true);
            }
        });
    });

    describe('getExpoPushToken', () => {
        it('should return null (deprecated)', async () => {
            const result = await getExpoPushToken();
            expect(result).toBeNull();
        });
    });
});
