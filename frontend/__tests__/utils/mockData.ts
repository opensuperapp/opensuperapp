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
export const createMockMicroApp = (overrides = {}) => ({
  appId: 'test-app-1',
  appName: 'Test App',
  description: 'A test application',
  iconUrl: 'https://example.com/icon.png',
  bannerUrl: 'https://example.com/banner.png',
  category: 'Productivity',
  publisher: 'Test Publisher',
  rating: 4.5,
  downloads: 1000,
  size: '2.5 MB',
  version: '1.0.0',
  lastUpdated: '2025-01-01',
  permissions: ['camera', 'storage'],
  screenshots: ['https://example.com/screenshot1.png'],
  ...overrides,
});

export const createMockMicroAppVersion = (overrides = {}) => ({
  version: '1.0.0',
  buildNumber: 1,
  releaseDate: '2025-01-01',
  downloadUrl: 'https://example.com/download',
  fileSize: 2500000,
  minSdkVersion: 21,
  changelog: ['Initial release'],
  ...overrides,
});

export const createMockNewsFeedItem = (overrides = {}) => ({
  id: '1',
  title: 'Test News',
  description: 'Test news description',
  imageUrl: 'https://example.com/news.jpg',
  link: 'https://example.com/news/1',
  publishedDate: '2025-01-01T00:00:00Z',
  source: 'Test Source',
  ...overrides,
});

export const createMockEventsFeedItem = (overrides = {}) => ({
  id: '1',
  title: 'Test Event',
  description: 'Test event description',
  imageUrl: 'https://example.com/event.jpg',
  link: 'https://example.com/event/1',
  startDate: '2025-01-15T10:00:00Z',
  endDate: '2025-01-15T12:00:00Z',
  location: 'Test Location',
  organizer: 'Test Organizer',
  ...overrides,
});

export const createMockArticle = (overrides = {}) => ({
  id: '1',
  title: 'Test Article',
  content: 'Test article content',
  author: 'Test Author',
  publishedDate: '2025-01-01T00:00:00Z',
  imageUrl: 'https://example.com/article.jpg',
  category: 'Technology',
  tags: ['test', 'article'],
  readTime: 5,
  ...overrides,
});

/**
 * Mock user data
 */
export const createMockUser = (overrides = {}) => ({
  userId: 'test-user-123',
  email: 'test@example.com',
  name: 'Test User',
  avatar: 'https://example.com/avatar.jpg',
  ...overrides,
});

/**
 * Mock authentication tokens
 */
export const createMockAuthTokens = (overrides = {}) => ({
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  idToken: 'mock-id-token',
  expiresIn: 3600,
  ...overrides,
});

/**
 * Mock Redux state
 */
export const createMockRootState = (overrides = {}) => ({
  microApps: {
    apps: [],
    loading: false,
    error: null,
  },
  userConfig: {
    installedApps: [],
    preferences: {},
    loading: false,
  },
  auth: {
    accessToken: null,
    user: null,
    isAuthenticated: false,
  },
  ...overrides,
});

/**
 * Delay utility for async tests
 */
export const wait = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Mock navigation props
 */
export const createMockNavigation = () => ({
  navigate: jest.fn(),
  goBack: jest.fn(),
  push: jest.fn(),
  pop: jest.fn(),
  replace: jest.fn(),
  reset: jest.fn(),
  setParams: jest.fn(),
  dispatch: jest.fn(),
  isFocused: jest.fn(() => true),
  canGoBack: jest.fn(() => true),
  addListener: jest.fn(),
  removeListener: jest.fn(),
});
