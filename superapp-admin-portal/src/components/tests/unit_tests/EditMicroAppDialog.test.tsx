import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditMicroAppDialog from '../../ui/EditMicroAppDialog';
import type { MicroApp } from '../../../types/microapp.types';

// Mocks
const mockShowNotification = jest.fn();
const mockUpsert = jest.fn();

jest.mock('../../../context', () => ({
  useNotification: () => ({ showNotification: mockShowNotification }),
}));

jest.mock('../../../services', () => ({
  microAppsService: { upsert: (...args: any[]) => mockUpsert(...args) },
}));

const baseMicroApp: MicroApp = {
  appId: 'com.example.app',
  name: 'Example App',
  description: 'An example micro app',
  promoText: '',
  isMandatory: 0,
  iconUrl: 'http://cdn/icon.png',
  bannerImageUrl: '',
  roles: [],
  versions: [],
};

describe('EditMicroAppDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const setup = (microApp: MicroApp = baseMicroApp) => {
    const onClose = jest.fn();
    const onSuccess = jest.fn();
    render(<EditMicroAppDialog open onClose={onClose} onSuccess={onSuccess} microApp={microApp} />);
    return { onClose, onSuccess };
  };

  it('renders with prefilled values and correct switch state', () => {
    setup();
    // Two headings exist due to DialogTitle wrapping; just assert presence by text
    expect(screen.getAllByText(/edit micro app/i).length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/app id/i)).toHaveValue('com.example.app');
    expect(screen.getByLabelText(/app id/i)).toBeDisabled();
    expect(screen.getByLabelText(/name/i)).toHaveValue('Example App');
    expect(screen.getByLabelText(/description/i)).toHaveValue('An example micro app');
    expect(screen.getByLabelText(/promo text/i)).toHaveValue('');
    const mandatory = screen.getByRole('checkbox', { name: /mandatory app/i });
    expect(mandatory).not.toBeChecked();
  });

  it('shows validation errors when required fields are empty', async () => {
    const user = userEvent.setup();
    setup();

    await user.clear(screen.getByLabelText(/name/i));
    await user.clear(screen.getByLabelText(/description/i));
    await user.click(screen.getByRole('button', { name: /update/i }));

    expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/description is required/i)).toBeInTheDocument();
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('submits updates successfully and closes dialog', async () => {
    const user = userEvent.setup();
    const { onClose, onSuccess } = setup();

    await user.clear(screen.getByLabelText(/name/i));
    await user.type(screen.getByLabelText(/name/i), 'Updated Name');
    await user.clear(screen.getByLabelText(/description/i));
    await user.type(screen.getByLabelText(/description/i), 'Updated description');
    await user.type(screen.getByLabelText(/promo text/i), 'New promo');

    // Toggle mandatory on
    await user.click(screen.getByRole('checkbox', { name: /mandatory app/i }));

    mockUpsert.mockResolvedValueOnce(undefined);
    await user.click(screen.getByRole('button', { name: /update/i }));

    expect(mockUpsert).toHaveBeenCalledWith({
      ...baseMicroApp,
      name: 'Updated Name',
      description: 'Updated description',
      promoText: 'New promo',
      isMandatory: 1,
    });
    expect(mockShowNotification).toHaveBeenCalledWith('Micro app updated successfully', 'success');
    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('handles service error and shows error notification', async () => {
    const user = userEvent.setup();
    setup();

    // Make sure required fields are non-empty (already prefilled)
    mockUpsert.mockRejectedValueOnce(new Error('Boom'));
    await user.click(screen.getByRole('button', { name: /update/i }));

    expect(mockShowNotification).toHaveBeenCalledWith('Boom', 'error');
  });

  it('resets values and errors when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const { onClose } = setup();

    // Make fields empty to trigger validation errors
    await user.clear(screen.getByLabelText(/name/i));
    await user.clear(screen.getByLabelText(/description/i));
    await user.click(screen.getByRole('button', { name: /update/i }));
    expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/description is required/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();
    // Values reset to original
    expect(screen.getByLabelText(/name/i)).toHaveValue('Example App');
    expect(screen.getByLabelText(/description/i)).toHaveValue('An example micro app');
  });

  it('disables inputs and buttons while updating', async () => {
    const user = userEvent.setup();
    setup();

    // Prepare a deferred promise to hold loading state
    let resolveFn: (v?: any) => void;
    const promise = new Promise((resolve) => { resolveFn = resolve; });
    // @ts-ignore resolveFn will be set synchronously
    mockUpsert.mockReturnValueOnce(promise);

    await user.click(screen.getByRole('button', { name: /update/i }));

    // Update button shows loading text and is disabled
    expect(screen.getByRole('button', { name: /updating\.+/i })).toBeDisabled();
    // Cancel button disabled
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    // Text fields disabled
    expect(screen.getByLabelText(/name/i)).toBeDisabled();
    expect(screen.getByLabelText(/description/i)).toBeDisabled();
    expect(screen.getByLabelText(/promo text/i)).toBeDisabled();
    // Switch disabled
    expect(screen.getByRole('checkbox', { name: /mandatory app/i })).toBeDisabled();

    // Resolve to avoid hanging test
    // @ts-ignore resolveFn defined above
    resolveFn();
  });
});
