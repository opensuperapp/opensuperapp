import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dashboard from '../../ui/Dashboard';

// Mocks for dependencies
const mockNavigate = jest.fn();
let mockAuthState: { state: { username?: string } } = { state: { username: 'john.doe@example.com' } };

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

jest.mock('../../../lib/auth-context', () => ({
  useAuth: () => mockAuthState,
}));

describe('Dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthState = { state: { username: 'john.doe@example.com' } };
  });

  it('greets the user using display name derived from email', () => {
    render(<Dashboard />);
    expect(screen.getByText(/welcome, john.doe!/i)).toBeInTheDocument();
    expect(screen.getByText(/manage your super app ecosystem/i)).toBeInTheDocument();
  });

  it('renders quick action tiles for Micro Apps, Users, and Analytics', () => {
    render(<Dashboard />);
    expect(screen.getByRole('button', { name: /micro apps/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /users/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /analytics/i })).toBeInTheDocument();
  });

  it('navigates to the correct routes when tiles are clicked', async () => {
    const user = userEvent.setup();
    render(<Dashboard />);

    await user.click(screen.getByRole('button', { name: /micro apps/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/microapps');

    await user.click(screen.getByRole('button', { name: /users/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/users');

    await user.click(screen.getByRole('button', { name: /analytics/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/analytics');
  });

  it('falls back to generic username when none provided', () => {
    mockAuthState = { state: { username: undefined } };
    render(<Dashboard />);
    expect(screen.getByText(/welcome, user!/i)).toBeInTheDocument();
  });
});
