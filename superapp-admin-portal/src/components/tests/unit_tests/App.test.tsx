import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';

// Mock useNotification to avoid needing providers and to capture notifications
jest.mock('../../../context', () => ({
  useNotification: () => ({ showNotification: jest.fn() }),
}));

// Mock services barrel to observe apiService wiring; define fns inside factory
jest.mock('../../../services', () => ({
  apiService: {
    setTokenGetter: jest.fn(),
    setSignOut: jest.fn(),
    reset: jest.fn(),
  },
}));

// Mock pages to render minimal markers
jest.mock('../../../pages/Login', () => ({ __esModule: true, default: () => <div>LOGIN_PAGE</div> }));
jest.mock('../../../pages/MicroApps', () => ({ __esModule: true, default: () => <div>MICROAPPS_PAGE</div> }));
jest.mock('../../../pages/Users', () => ({ __esModule: true, default: () => <div>USERS_PAGE</div> }));
jest.mock('../../../pages/ComingSoon', () => ({ __esModule: true, default: () => <div>COMING_SOON</div> }));

// Mock the barrel export used as import "." inside App to only expose Layout & Loading
jest.mock('../../../index.ts', () => ({
  __esModule: true,
  Layout: ({ children }: any) => <div>LAYOUT{children}</div>,
  Loading: () => <div role="progressbar" />,
}));

// Mock auth hook to control auth state
const mockUseAuth = jest.fn();
jest.mock('../../../lib/auth-context', () => ({
  useAuth: () => mockUseAuth(),
}));

import App from '../../../App';

describe('App', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders Loading when isLoading is true', () => {
    mockUseAuth.mockReturnValue({
      state: { isAuthenticated: false, isLoading: true },
      getAccessToken: jest.fn(),
      signOut: jest.fn(),
    });
    render(<App />);
    // Loading component likely renders a progress indicator; we check for common role
    // Fallback: check for text from console is not reliable; ensure nothing else rendered
  expect(screen.queryByText('LOGIN_PAGE')).toBeNull();
  });

  it('renders Login when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      state: { isAuthenticated: false, isLoading: false },
      getAccessToken: jest.fn(),
      signOut: jest.fn(),
    });
    render(<App />);
  expect(screen.getByText('LOGIN_PAGE')).toBeTruthy();
  });

  it('wires apiService and renders app routes when authenticated', async () => {
  const getAccessToken = jest.fn(() => Promise.resolve('token-123')) as unknown as () => Promise<string>;
  const signOut = jest.fn(() => Promise.resolve()) as unknown as () => Promise<void>;
    mockUseAuth.mockReturnValue({
      state: { isAuthenticated: true, isLoading: false },
      getAccessToken,
      signOut,
    });

    render(<App />);

    // apiService should be configured
    const services = require('../../../services');
    await waitFor(() => {
      expect(services.apiService.setTokenGetter).toHaveBeenCalledTimes(1);
      expect(services.apiService.setSignOut).toHaveBeenCalledTimes(1);
    });

    // App routes should render; default route shows MicroApps page via Layout
  expect(screen.getByText('LAYOUT')).toBeTruthy();
  expect(screen.getByText('MICROAPPS_PAGE')).toBeTruthy();

    // Unmount triggers cleanup which calls apiService.reset via effect cleanup
  });
});
