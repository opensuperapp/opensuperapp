export default {
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
};
