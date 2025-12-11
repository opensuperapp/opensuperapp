jest.mock('react-native/Libraries/Utilities/Platform', () => ({
    OS: 'ios',
    select: jest.fn(),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
  })),
  useLocalSearchParams: jest.fn(() => ({})),
  useSegments: jest.fn(() => []),
  usePathname: jest.fn(() => '/'),
  Stack: {
    Screen: 'StackScreen',
  },
  Tabs: {
    Screen: 'TabsScreen',
  },
  Slot: 'Slot',
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
}));

// Mock expo-font
jest.mock('expo-font', () => ({
  loadAsync: jest.fn(() => Promise.resolve()),
  isLoaded: jest.fn(() => true),
  useFonts: jest.fn(() => [true, null]),
}));

// Mock expo-splash-screen
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
  hideAsync: jest.fn(() => Promise.resolve()),
}));

// Mock expo-screen-orientation
jest.mock('expo-screen-orientation', () => ({
  lockAsync: jest.fn(() => Promise.resolve()),
  OrientationLock: {
    PORTRAIT_UP: 1,
  },
}));

// Mock react-native-webview
jest.mock('react-native-webview', () => ({
  WebView: 'WebView',
}));

// Mock expo-auth-session
jest.mock('expo-auth-session/providers/google', () => ({
  useAuthRequest: jest.fn(() => [
    null,
    null,
    jest.fn(),
  ]),
}));

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// Mock react-native-app-auth
jest.mock('react-native-app-auth', () => ({
  authorize: jest.fn(() => Promise.resolve()),
  refresh: jest.fn(() => Promise.resolve()),
  logout: jest.fn(() => Promise.resolve()),
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({ top: 0, bottom: 0, left: 0, right: 0 })),
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
}));

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialIcons: 'MaterialIcons',
  FontAwesome: 'FontAwesome',
}));

// Mock react-native Platform
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
    OS: 'ios',
    select: jest.fn(select => select.ios),
}));

// Mock react-native Alert
jest.mock('react-native/Libraries/Alert/Alert', () => ({
    alert: jest.fn(),
}));

// Mock expo-constants
jest.mock('expo-constants', () => ({
    manifest: {
        extra: {
            ASGARDEO_CONFIG: {
                CLIENT_ID: 'test-client-id',
                REDIRECT_URI: 'test-redirect-uri',
                SIGN_OUT_REDIRECT_URI: 'test-sign-out-redirect-uri',
                BASE_URL: 'test-base-url',
                SCOPE: 'test-scope',
            },
        },
    },
}));


// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
};

// Set up global test timeout
jest.setTimeout(10000);
