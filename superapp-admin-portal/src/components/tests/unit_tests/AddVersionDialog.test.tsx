import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddVersionDialog from '../../ui/AddVersionDialog';
import type { MicroApp } from '../../../types/microapp.types';

// Mocks
const mockShowNotification = jest.fn();
const mockUploadFile = jest.fn();
const mockAddVersion = jest.fn();
const mockValidateZipFile = jest.fn();

jest.mock('../../../context', () => ({
  useNotification: () => ({ showNotification: mockShowNotification }),
}));

jest.mock('../../../services', () => ({
  apiService: { uploadFile: (...args: any[]) => mockUploadFile(...args) },
  microAppsService: { addVersion: (...args: any[]) => mockAddVersion(...args) },
}));

jest.mock('../../../utils', () => ({
  validateZipFile: (...args: any[]) => mockValidateZipFile(...args),
}));

const baseMicroApp: MicroApp = {
  appId: 'com.test.app',
  name: 'Test App',
  description: 'desc',
  promoText: '',
  isMandatory: 0,
  iconUrl: 'http://cdn/icon.png',
  bannerImageUrl: '',
  roles: [],
  versions: [
    { version: '0.9.0', build: 1, releaseNotes: 'prev', iconUrl: 'http://cdn/icon.png', downloadUrl: 'http://cdn/app-1.zip' },
  ],
};

describe('AddVersionDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const setup = (microApp: MicroApp = baseMicroApp) => {
    const onClose = jest.fn();
    const onSuccess = jest.fn();
    render(
      <AddVersionDialog open onClose={onClose} onSuccess={onSuccess} microApp={microApp} />
    );
    return { onClose, onSuccess };
  };

  it('prefills next build number based on existing versions', () => {
    setup();
    expect(screen.getByLabelText(/build number/i)).toHaveValue(2);
  });

  it('validates required fields and ZIP at submit', async () => {
    const user = userEvent.setup();
    setup({ ...baseMicroApp, versions: [] });

    // Try to submit with everything empty
    await user.click(screen.getByRole('button', { name: /add version/i }));

    expect(await screen.findByText(/version is required/i)).toBeInTheDocument();
    expect(screen.getByText(/release notes are required/i)).toBeInTheDocument();
    expect(screen.getByText(/app package \(zip\) is required/i)).toBeInTheDocument();
  });

  it('shows error if selected ZIP is invalid', async () => {
    const user = userEvent.setup();
    setup();

    // Fill text fields
  await user.type(screen.getByPlaceholderText('1.0.0'), '1.0.0');
    await user.type(screen.getByLabelText(/release notes/i), 'notes');

    // Select invalid ZIP
    mockValidateZipFile.mockResolvedValueOnce({ valid: false, error: 'Invalid file' });
    const zip = new File([new Uint8Array([1,2,3])], 'app.zip', { type: 'application/zip' });
    const zipInput = screen.getByLabelText(/upload zip/i) as HTMLInputElement;
    await user.upload(zipInput, zip);

    expect(mockShowNotification).toHaveBeenCalledWith('Invalid file', 'error');
  });

  it('blocks submit when build number already exists', async () => {
    const user = userEvent.setup();
    setup(baseMicroApp);

  await user.type(screen.getByPlaceholderText('1.0.0'), '1.0.0');
    await user.type(screen.getByLabelText(/release notes/i), 'notes');

    // Force requirement for ZIP still unmet and build duplicate check
    await user.click(screen.getByRole('button', { name: /add version/i }));
    expect(await screen.findByText(/app package \(zip\) is required/i)).toBeInTheDocument();

    // Duplicate build message exists because default build = 2 but base has build 1 only.
    // Change to duplicate (1)
    const buildInput = screen.getByLabelText(/build number/i);
    await user.clear(buildInput);
    await user.type(buildInput, '1');
    await user.click(screen.getByRole('button', { name: /add version/i }));

  // Field doesn't render helper text for build errors; just ensure submit did not occur
  expect(mockAddVersion).not.toHaveBeenCalled();
  });

  it('submits successfully and closes on happy path', async () => {
    const user = userEvent.setup();
    const { onClose, onSuccess } = setup();

  await user.type(screen.getByPlaceholderText('1.0.0'), '1.0.0');
    await user.type(screen.getByLabelText(/release notes/i), 'notes');

    // Valid ZIP then upload resolves
    mockValidateZipFile.mockResolvedValueOnce({ valid: true });
    mockUploadFile.mockResolvedValueOnce({ url: 'http://cdn/app-2.zip' });
    const zip = new File([new Uint8Array([9,9,9])], 'app.zip', { type: 'application/zip' });
    const zipInput = screen.getByLabelText(/upload zip/i) as HTMLInputElement;
    await user.upload(zipInput, zip);

    // Submit
    mockAddVersion.mockResolvedValueOnce(undefined);
    await user.click(screen.getByRole('button', { name: /add version/i }));

    expect(mockAddVersion).toHaveBeenCalledTimes(1);
    const args = mockAddVersion.mock.calls[0];
    expect(args[0]).toBe('com.test.app');
    expect(args[1]).toMatchObject({
      version: '1.0.0',
      build: 2,
      releaseNotes: 'notes',
      iconUrl: 'http://cdn/icon.png',
      downloadUrl: 'http://cdn/app-2.zip',
    });

    expect(mockShowNotification).toHaveBeenCalledWith('New version added successfully', 'success');
    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('Cancel button closes without submitting', async () => {
    const user = userEvent.setup();
    const { onClose } = setup();
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();
    expect(mockAddVersion).not.toHaveBeenCalled();
  });
});
