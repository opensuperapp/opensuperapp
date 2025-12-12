import { render, screen } from '@testing-library/react';
import App from '../../../App';

jest.mock('../../../lib/auth-context', () => ({
  useAuth: () => ({
    state: { isLoading: false, isAuthenticated: false },
    signIn: jest.fn(),
    getAccessToken: jest.fn(),
    signOut: jest.fn(),
  }),
}));

jest.mock('../../../context', () => ({
  useNotification: () => ({ showNotification: jest.fn() }),
}));

// Mock services to avoid importing Vite-specific code using import.meta.env
jest.mock('../../../services', () => ({
  apiService: {
    setTokenGetter: jest.fn(),
    setSignOut: jest.fn(),
    reset: jest.fn(),
  },
}));

// Mock barrel exports used by App to avoid pulling modules that rely on import.meta
jest.mock('../../../index', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
  Loading: () => <div role="progressbar" />,
}));

// Mock pages to avoid deep imports that may use import.meta.env
jest.mock('../../../pages/MicroApps', () => () => <div data-testid="page-microapps" />);
jest.mock('../../../pages/Users', () => () => <div data-testid="page-users" />);
jest.mock('../../../pages/ComingSoon', () => () => <div data-testid="page-comingsoon" />);

describe('App integration (unauthenticated)', () => {
  it('shows the Login screen when not authenticated', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { name: /superapp admin portal/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });
});
