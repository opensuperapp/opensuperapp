import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Header from '../../common/Header';
import { MemoryRouter } from 'react-router-dom';

// Mocks
const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
  useNavigate: () => mockNavigate,
  };
});

const mockShowNotification = jest.fn();
const mockSignOut = jest.fn();

jest.mock('../../../lib/auth-context', () => ({
  useAuth: () => ({
    state: { email: 'john.doe@example.com' },
  signOut: mockSignOut,
  }),
}));

jest.mock('../../../context', () => ({
  useNotification: () => ({ showNotification: mockShowNotification }),
  useTheme: () => ({ mode: 'dark', toggleTheme: jest.fn() }),
}));

describe('Header', () => {
  beforeEach(() => {
  mockNavigate.mockClear();
  mockShowNotification.mockClear();
  mockSignOut.mockClear();
    jest.useRealTimers();
  });

  it('renders title and navigates home when clicked', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/users"]}>
        <Header />
      </MemoryRouter>
    );

    const title = screen.getByRole('heading', { name: /superapp admin portal/i });
    await user.click(title);
  expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('shows breadcrumbs for nested routes and navigates when a breadcrumb is clicked', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/microapps/sub"]}>
        <Header />
      </MemoryRouter>
    );

    // First breadcrumb (link/button) should be "Micro Apps"
    const crumb = screen.getByRole('button', { name: /micro apps/i });
    expect(crumb).toBeInTheDocument();
    // Last segment should be plain text (not a button)
    expect(screen.getByText('sub')).toBeInTheDocument();

    await user.click(crumb);
  expect(mockNavigate).toHaveBeenCalledWith('/microapps');
  });

  it('does not show breadcrumbs on the home page', () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Header />
      </MemoryRouter>
    );
    // No breadcrumb button should exist on home
    expect(screen.queryByRole('button', { name: /micro apps|users|analytics/i })).toBeNull();
  });

  it('toggles theme when the theme button is clicked', async () => {
    const user = userEvent.setup();
    // Override theme mock to capture toggleTheme
    const toggleTheme = jest.fn();
  (jest.requireMock('../../../context') as any).useTheme = () => ({ mode: 'dark', toggleTheme });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Header />
      </MemoryRouter>
    );

    // On home, first button is the theme toggle; second is the avatar/menu button
    const buttons = screen.getAllByRole('button');
    await user.click(buttons[0]);
    expect(toggleTheme).toHaveBeenCalled();
  });

  it('shows user info and handles logout via menu', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Header />
      </MemoryRouter>
    );

    // Display name and initials based on email
    expect(screen.getByText('john.doe')).toBeInTheDocument();
    expect(screen.getByText('JO')).toBeInTheDocument();

    // Open menu via avatar button (second button on home)
    const buttons = screen.getAllByRole('button');
    await user.click(buttons[1]);

    // Menu should display username and Sign Out
    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    const signOutItem = screen.getByRole('menuitem', { name: /sign out/i });
    await user.click(signOutItem);

    // Notification then delayed signOut
  expect(mockShowNotification).toHaveBeenCalledWith('Signing out...', 'info');
  expect(mockSignOut).not.toHaveBeenCalled();

    // Advance timers to trigger signOut
    jest.advanceTimersByTime(500);
  expect(mockSignOut).toHaveBeenCalled();
  });
});
