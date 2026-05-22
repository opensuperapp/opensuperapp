import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Users from '../../../pages/Users';

// Service mocks
const mockGetAll = jest.fn();
const mockDeleteUser = jest.fn();
jest.mock('../../../services', () => ({
  usersService: {
    getAll: (...args: any[]) => mockGetAll(...args),
    deleteUser: (...args: any[]) => mockDeleteUser(...args),
  },
}));

// Mock re-exports from src/index to avoid pulling code using import.meta
jest.mock('../../../index', () => ({
  __esModule: true,
  CreateUserDialog: (props: any) => (
    <div data-testid="create-user-dialog" data-open={props.open}>
      CreateUserDialog
      <button onClick={() => props.onSuccess?.()}>ok</button>
      <button onClick={() => props.onClose?.()}>close</button>
    </div>
  ),
  ConfirmDialog: (props: any) => (
    <div data-testid="confirm-dialog" data-open={props.open}>
      ConfirmDialog
      <button onClick={() => props.onConfirm?.()}>confirm</button>
      <button onClick={() => props.onCancel?.()}>cancel</button>
    </div>
  ),
}));

// Notification mock
const mockShowNotification = jest.fn();
jest.mock('../../../context', () => ({
  useNotification: () => ({ showNotification: mockShowNotification }),
}));

function makeUser(partial?: Partial<any>) {
  return {
    firstName: 'Alice',
    lastName: 'Smith',
    workEmail: 'alice@example.com',
    location: 'New York',
    userThumbnail: '',
    ...partial,
  };
}

describe('Users page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading then empty state and CTA opens Create dialog', async () => {
    mockGetAll.mockResolvedValueOnce([]);
    const user = userEvent.setup();

    render(<Users />);

    // Loading spinner
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    // Empty state
    expect(await screen.findByText(/no users yet/i)).toBeInTheDocument();
    const cta = screen.getByRole('button', { name: /add first user/i });
    await user.click(cta);

    const dlg = screen.getByTestId('create-user-dialog');
    expect(dlg).toBeInTheDocument();
    expect(dlg).toHaveAttribute('data-open', 'true');
  });

  it('header Add User button opens Create dialog', async () => {
    mockGetAll.mockResolvedValueOnce([]);
    const user = userEvent.setup();

    render(<Users />);
    await screen.findByText(/no users yet/i);

    const btn = screen.getByRole('button', { name: /add user/i });
    await user.click(btn);

    const dlg = screen.getByTestId('create-user-dialog');
    expect(dlg).toHaveAttribute('data-open', 'true');
  });

  it('renders users, supports search and location filters, and shows filtered count', async () => {
    const u1 = makeUser();
    const u2 = makeUser({ firstName: 'Bob', lastName: 'Jones', workEmail: 'bob@example.com', location: 'San Francisco' });
    mockGetAll.mockResolvedValueOnce([u1, u2]);
    const user = userEvent.setup();

    render(<Users />);

    // Table rows visible
    expect(await screen.findByRole('heading', { name: /users/i })).toBeInTheDocument();
    expect(screen.getByText(/alice smith/i)).toBeInTheDocument();
    expect(screen.getByText(/bob jones/i)).toBeInTheDocument();

    // Search for Alice
    const search = screen.getByPlaceholderText(/search by name or email/i);
    await user.type(search, 'alice');

    // Only Alice remains
    await waitFor(() => {
      expect(screen.getByText(/alice smith/i)).toBeInTheDocument();
      expect(screen.queryByText(/bob jones/i)).not.toBeInTheDocument();
    });
    expect(screen.getByText(/showing 1 of 2 users/i)).toBeInTheDocument();

    // Clear search
    await user.clear(search);

  // Location filter: choose San Francisco
  const locationTrigger = screen.getByText(/all locations/i);
  await user.click(locationTrigger);
    const option = await screen.findByRole('option', { name: /san francisco/i });
    await user.click(option);

    await waitFor(() => {
      expect(screen.getByText(/bob jones/i)).toBeInTheDocument();
      expect(screen.queryByText(/alice smith/i)).not.toBeInTheDocument();
    });
    expect(screen.getByText(/showing 1 of 2 users/i)).toBeInTheDocument();

    // Apply non-matching search to show the filtered-empty row
    await user.type(search, 'zzz');
  const [, tbody] = screen.getAllByRole('rowgroup');
  expect(await within(tbody!).findByText(/no users found matching your filters/i)).toBeInTheDocument();
  });

  it('delete flow: opens confirm, calls API, shows success and refreshes', async () => {
    const u = makeUser();
    mockGetAll.mockResolvedValueOnce([u]);
    mockDeleteUser.mockResolvedValueOnce(undefined);
    // After deletion, refetch returns empty
    mockGetAll.mockResolvedValueOnce([]);

    const user = userEvent.setup();
    render(<Users />);

    // Row present
    expect(await screen.findByText(/alice smith/i)).toBeInTheDocument();

    // Click delete icon
    const delBtn = screen.getByRole('button', { name: /delete user/i });
    await user.click(delBtn);

    const confirm = screen.getByTestId('confirm-dialog');
    expect(confirm).toHaveAttribute('data-open', 'true');

    // Confirm deletion
    await user.click(within(confirm).getByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      expect(mockDeleteUser).toHaveBeenCalledWith('alice@example.com');
      expect(mockShowNotification).toHaveBeenCalledWith('User deleted successfully', 'success');
    });

    // getAll called twice: initial + refresh
    expect(mockGetAll).toHaveBeenCalledTimes(2);

    // Empty state after refresh
    expect(await screen.findByText(/no users yet/i)).toBeInTheDocument();
  });

  it('shows error notification if initial fetch fails', async () => {
    mockGetAll.mockRejectedValueOnce(new Error('oops'));

    render(<Users />);

    await waitFor(() => {
      expect(mockShowNotification).toHaveBeenCalledWith('Failed to load users', 'error');
    });
  });
});
