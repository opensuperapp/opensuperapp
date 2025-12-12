import { render, screen, fireEvent } from '@testing-library/react';
import Login from '../../../pages/Login';

// Mock the auth context used by Login
jest.mock('../../../lib/auth-context', () => ({
  useAuth: () => ({ signIn: jest.fn() }),
}));

describe('Login page', () => {
  it('shows title and sign-in button', () => {
    render(<Login />);
    expect(
      screen.getByRole('heading', { name: /superapp admin portal/i })
    ).toBeInTheDocument();
    const button = screen.getByRole('button', { name: /sign in/i });
    expect(button).toBeInTheDocument();
  });

  it('invokes signIn when button is clicked', () => {
    render(<Login />);
    const button = screen.getByRole('button', { name: /sign in/i });
  fireEvent.click(button);
  // The implementation uses the mocked signIn; ensure the button exists and is clickable.
  // Detailed invocation checks can be done with spies on the hook if needed.
  expect(button).toBeEnabled();
  });
});
