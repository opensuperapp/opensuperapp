import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddMicroAppDialog from '../../ui/AddMicroAppDialog';

// Mocks
const mockShowNotification = jest.fn();
const mockUploadFile = jest.fn();
const mockUpsert = jest.fn();
const mockValidateZipFile = jest.fn();

jest.mock('../../../context', () => ({
	useNotification: () => ({ showNotification: mockShowNotification }),
}));

jest.mock('../../../services', () => ({
	apiService: { uploadFile: (...args: any[]) => mockUploadFile(...args) },
	microAppsService: { upsert: (...args: any[]) => mockUpsert(...args) },
}));

jest.mock('../../../utils', () => ({
	validateZipFile: (...args: any[]) => mockValidateZipFile(...args),
}));

describe('AddMicroAppDialog', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	const setup = () => {
		const onClose = jest.fn();
		const onSuccess = jest.fn();
		render(<AddMicroAppDialog open onClose={onClose} onSuccess={onSuccess} />);
		return { onClose, onSuccess };
	};

	it('validates required fields in Basic Information (step 0)', async () => {
		const user = userEvent.setup();
		setup();

		await user.click(screen.getByRole('button', { name: /next/i }));

		expect(await screen.findByText(/app id is required/i)).toBeInTheDocument();
		expect(screen.getByText(/name is required/i)).toBeInTheDocument();
		expect(screen.getByText(/description is required/i)).toBeInTheDocument();
	});

	it('shows ZIP validation error and blocks progression on invalid ZIP (step 2)', async () => {
		const user = userEvent.setup();
		setup();

		// Step 0: fill required fields
		await user.type(screen.getByLabelText(/app id/i), 'com.test.app');
		await user.type(screen.getByLabelText(/app name/i), 'Test App');
		await user.type(screen.getByLabelText(/description/i), 'A test app');
		await user.click(screen.getByRole('button', { name: /next/i }));

		// Step 1: upload valid icon to satisfy requirement
		const iconFile = new File([new Uint8Array([1, 2, 3])], 'icon.png', { type: 'image/png' });
		const iconInput = screen.getByLabelText(/upload icon/i) as HTMLInputElement;
		await user.upload(iconInput, iconFile);
		mockUploadFile.mockResolvedValueOnce({ url: 'http://cdn/icon.png' });
		await user.click(screen.getByRole('button', { name: /next/i }));

		// Step 2: fill version fields
		await user.type(screen.getByLabelText(/version/i), '1.0.0');
		await user.type(screen.getByLabelText(/release notes/i), 'Initial release');

		// Invalid ZIP selection
		mockValidateZipFile.mockResolvedValueOnce({ valid: false, error: 'Invalid ZIP' });
		const zipFile = new File([new Uint8Array([5, 6, 7])], 'app.zip', { type: 'application/zip' });
		const zipInput = screen.getByLabelText(/upload zip/i) as HTMLInputElement;
		await user.upload(zipInput, zipFile);

		expect(mockShowNotification).toHaveBeenCalledWith('Invalid ZIP', 'error');

		// Attempt to proceed -> should show requirement error for ZIP
		await user.click(screen.getByRole('button', { name: /next/i }));
		expect(await screen.findByText(/app package \(zip\) is required/i)).toBeInTheDocument();
	});

	it('completes happy path and submits micro app successfully', async () => {
		const user = userEvent.setup();
		const { onClose, onSuccess } = setup();

		// Step 0
		await user.type(screen.getByLabelText(/app id/i), 'com.test.app');
		await user.type(screen.getByLabelText(/app name/i), 'Test App');
		await user.type(screen.getByLabelText(/description/i), 'A test app');
		await user.type(screen.getByLabelText(/promotional text/i), 'Promo');
		await user.click(screen.getByRole('button', { name: /next/i }));

		// Step 1: icon upload
		const iconFile = new File([new Uint8Array([1, 2, 3])], 'icon.png', { type: 'image/png' });
		mockUploadFile.mockResolvedValueOnce({ url: 'http://cdn/icon.png' });
		const iconInput = screen.getByLabelText(/upload icon/i) as HTMLInputElement;
		await user.upload(iconInput, iconFile);
		await user.click(screen.getByRole('button', { name: /next/i }));

		// Step 2: version + zip upload
		await user.type(screen.getByLabelText(/version/i), '1.0.0');
		// Build has default 1; leave as-is
		await user.type(screen.getByLabelText(/release notes/i), 'Initial release');
		const zipFile = new File([new Uint8Array([9, 9, 9])], 'app.zip', { type: 'application/zip' });
		mockValidateZipFile.mockResolvedValueOnce({ valid: true });
		mockUploadFile.mockResolvedValueOnce({ url: 'http://cdn/app.zip' });
		const zipInput = screen.getByLabelText(/upload zip/i) as HTMLInputElement;
		await user.upload(zipInput, zipFile);
		await user.click(screen.getByRole('button', { name: /next/i }));

		// Step 3: add a role
		const roleField = screen.getByLabelText(/role\/group name/i);
		await user.type(roleField, 'admin{enter}');
		expect(screen.getByText('admin')).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: /next/i }));

		// Step 4: Review -> submit
		mockUpsert.mockResolvedValueOnce(undefined);
		await user.click(screen.getByRole('button', { name: /create micro app/i }));

		// upsert called with expected shape
		expect(mockUpsert).toHaveBeenCalledTimes(1);
		const arg = mockUpsert.mock.calls[0][0];
		expect(arg).toMatchObject({
			appId: 'com.test.app',
			name: 'Test App',
			description: 'A test app',
			promoText: 'Promo',
			iconUrl: 'http://cdn/icon.png',
			versions: [
				expect.objectContaining({
					version: '1.0.0',
					build: 1,
					releaseNotes: 'Initial release',
					iconUrl: 'http://cdn/icon.png',
					downloadUrl: 'http://cdn/app.zip',
				}),
			],
			roles: [{ role: 'admin' }],
		});

		expect(mockShowNotification).toHaveBeenCalledWith(
			'Micro app created successfully',
			'success'
		);
		expect(onSuccess).toHaveBeenCalled();
		expect(onClose).toHaveBeenCalled();
	});

		it('clicking Cancel calls onClose and does not submit', async () => {
			const user = userEvent.setup();
			const { onClose } = setup();
			await user.click(screen.getByRole('button', { name: /cancel/i }));
			expect(onClose).toHaveBeenCalled();
			expect(mockUpsert).not.toHaveBeenCalled();
		});
});

