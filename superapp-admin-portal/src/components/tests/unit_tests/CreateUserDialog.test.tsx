import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateUserDialog from '../../ui/CreateUserDialog';

const mockShowNotification = jest.fn();
const mockCreateUser = jest.fn();
const mockCreateBulkUsers = jest.fn();

jest.mock('../../../context', () => ({
  useNotification: () => ({ showNotification: mockShowNotification }),
}));

jest.mock('../../../services', () => ({
  usersService: {
    createUser: (...args: any[]) => mockCreateUser(...args),
    createBulkUsers: (...args: any[]) => mockCreateBulkUsers(...args),
  },
}));

describe('CreateUserDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const setup = () => {
    const onClose = jest.fn();
    const onSuccess = jest.fn();
    render(<CreateUserDialog open onClose={onClose} onSuccess={onSuccess} />);
    return { onClose, onSuccess };
  };

  it('switches between Single User and Bulk Add tabs', async () => {
    const user = userEvent.setup();
    setup();

    // Single tab visible initially
    expect(screen.getByRole('tab', { name: /single user/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /bulk add/i })).toHaveAttribute('aria-selected', 'false');

    // Switch to Bulk Add
    await user.click(screen.getByRole('tab', { name: /bulk add/i }));
    expect(screen.getByRole('tab', { name: /bulk add/i })).toHaveAttribute('aria-selected', 'true');
  });

  it('validates single user required fields and email', async () => {
    const user = userEvent.setup();
    setup();

    // Submit empty single user form
    await user.click(screen.getByRole('button', { name: /create user/i }));
    expect(mockShowNotification).toHaveBeenCalledWith('Please fill in all required fields', 'error');
    mockShowNotification.mockClear();

    // Fill required with invalid email
    await user.type(screen.getByLabelText(/email/i), 'not-an-email');
    await user.type(screen.getByLabelText(/first name/i), 'John');
    await user.type(screen.getByLabelText(/last name/i), 'Doe');
    await user.click(screen.getByRole('button', { name: /create user/i }));
    expect(mockShowNotification).toHaveBeenCalledWith('Please enter a valid email address', 'error');
  });

  it('submits single user successfully', async () => {
    const user = userEvent.setup();
    const { onClose, onSuccess } = setup();

    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/first name/i), 'John');
    await user.type(screen.getByLabelText(/last name/i), 'Doe');

    mockCreateUser.mockResolvedValueOnce(undefined);
    await user.click(screen.getByRole('button', { name: /create user/i }));

    expect(mockCreateUser).toHaveBeenCalledWith({
      workEmail: 'john@example.com',
      firstName: 'John',
      lastName: 'Doe',
      userThumbnail: '',
      location: '',
    });
    expect(mockShowNotification).toHaveBeenCalledWith('User created successfully', 'success');
    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('validates bulk users required fields, email, and duplicate emails', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('tab', { name: /bulk add/i }));

    // Submit empty bulk
    await user.click(screen.getByRole('button', { name: /create 1 users/i }));
    expect(mockShowNotification).toHaveBeenCalledWith('Please fill in all required fields for user 1', 'error');
    mockShowNotification.mockClear();

    // Fill with invalid email
    await user.type(screen.getByLabelText(/email/i), 'invalid');
    await user.type(screen.getByLabelText(/first name/i), 'A');
    await user.type(screen.getByLabelText(/last name/i), 'B');
    await user.click(screen.getByRole('button', { name: /create 1 users/i }));
    expect(mockShowNotification).toHaveBeenCalledWith('Please enter a valid email address for user 1', 'error');
    mockShowNotification.mockClear();

  // Add another user and create duplicate emails
  await user.clear(screen.getAllByLabelText(/email/i)[0]);
  await user.type(screen.getAllByLabelText(/email/i)[0], 'dup@example.com');
    await user.click(screen.getByRole('button', { name: /add another user/i }));

    const panels = screen.getAllByText(/user \d+/i);
    const container = panels[1].closest('div')!.parentElement!; // second user card container
  const withinSecond = within(container);
  await user.type(withinSecond.getByLabelText(/email/i), 'dup@example.com');
    await user.type(withinSecond.getByLabelText(/first name/i), 'Jane');
    await user.type(withinSecond.getByLabelText(/last name/i), 'Doe');

    await user.click(screen.getByRole('button', { name: /create 2 users/i }));
    expect(mockShowNotification).toHaveBeenCalledWith('Duplicate email addresses found', 'error');
  });

  it('submits bulk users successfully', async () => {
    const user = userEvent.setup();
    const { onClose, onSuccess } = setup();
    await user.click(screen.getByRole('tab', { name: /bulk add/i }));

  await user.type(screen.getByLabelText(/email/i), 'a@example.com');
    await user.type(screen.getByLabelText(/first name/i), 'A');
    await user.type(screen.getByLabelText(/last name/i), 'One');

    await user.click(screen.getByRole('button', { name: /add another user/i }));

    const panels = screen.getAllByText(/user \d+/i);
    const second = panels[1].closest('div')!.parentElement!;
  const withinSecond = within(second);
  await user.type(withinSecond.getByLabelText(/email/i), 'b@example.com');
    await user.type(withinSecond.getByLabelText(/first name/i), 'B');
    await user.type(withinSecond.getByLabelText(/last name/i), 'Two');

    mockCreateBulkUsers.mockResolvedValueOnce(undefined);
    await user.click(screen.getByRole('button', { name: /create 2 users/i }));

    expect(mockCreateBulkUsers).toHaveBeenCalledWith([
      {
        workEmail: 'a@example.com',
        firstName: 'A',
        lastName: 'One',
        userThumbnail: '',
        location: '',
      },
      {
        workEmail: 'b@example.com',
        firstName: 'B',
        lastName: 'Two',
        userThumbnail: '',
        location: '',
      },
    ]);
    expect(mockShowNotification).toHaveBeenCalledWith('2 users created successfully', 'success');
    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('Cancel closes dialog and does not submit', async () => {
    const user = userEvent.setup();
    const { onClose } = setup();
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();
    expect(mockCreateUser).not.toHaveBeenCalled();
    expect(mockCreateBulkUsers).not.toHaveBeenCalled();
  });
});
