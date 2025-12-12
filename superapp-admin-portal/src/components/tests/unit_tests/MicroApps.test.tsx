import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MicroApps from '../../../pages/MicroApps';

// Mocks
const mockGetAll = jest.fn();
const mockDelete = jest.fn();
jest.mock('../../../services', () => ({
  microAppsService: {
    getAll: (...args: any[]) => mockGetAll(...args),
    delete: (...args: any[]) => mockDelete(...args),
  },
}));

// Mock components re-exported via src/index to avoid transitive imports (e.g., utils using import.meta)
jest.mock('../../../index', () => ({
  __esModule: true,
  ConfirmDialog: () => null,
  EditMicroAppDialog: () => null,
  AddVersionDialog: () => null,
}));

const mockShowNotification = jest.fn();
jest.mock('../../../context', () => ({
  useNotification: () => ({ showNotification: mockShowNotification }),
}));

// Mock AddMicroAppDialog to a lightweight component that exposes `open`
jest.mock('../../../components/ui/AddMicroAppDialog', () => ({
  __esModule: true,
  default: (props: any) => (
    <div data-testid="add-microapp-dialog" data-open={props.open}>
      AddMicroAppDialog
      <button onClick={() => props.onSuccess && props.onSuccess()}>success</button>
      <button onClick={() => props.onClose && props.onClose()}>close</button>
    </div>
  ),
}));

// Provide simple samples
function makeApp(partial?: Partial<any>) {
  return {
    appId: 'app-1',
    name: 'Calendar',
    description: 'Org events and holidays',
    iconUrl: '',
    isMandatory: 1,
    roles: [
      { role: 'viewer' },
      { role: 'editor' },
      { role: 'admin' },
      { role: 'auditor' },
    ],
    versions: [
      { version: '1.0.0', build: 10, releaseNotes: 'Initial', downloadUrl: 'https://example.com/pkg1.zip' },
      { version: '1.1.0', build: 12, releaseNotes: 'Improvements' },
    ],
    ...partial,
  };
}

describe('MicroApps page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading spinner first, then empty state and opens Add dialog from CTA', async () => {
    // Resolve to empty list
    mockGetAll.mockResolvedValueOnce([]);
    const user = userEvent.setup();

    render(<MicroApps />);

    // Loading spinner visible immediately
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    // After fetch, empty state shown
    expect(await screen.findByText(/no micro apps yet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add your first app/i })).toBeInTheDocument();

    // Click CTA opens mocked AddMicroAppDialog
    await user.click(screen.getByRole('button', { name: /add your first app/i }));
    const dialog = screen.getByTestId('add-microapp-dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('data-open', 'true');
  });

  it('header Add Micro App button opens Add dialog', async () => {
    mockGetAll.mockResolvedValueOnce([]);
    const user = userEvent.setup();
    render(<MicroApps />);
    await screen.findByText(/no micro apps yet/i);

    // The header button is labeled "Add Micro App"
    await user.click(screen.getByRole('button', { name: /add micro app/i }));
    const dialog = screen.getByTestId('add-microapp-dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('data-open', 'true');
  });

  it('renders list with cards and toggles versions section', async () => {
    mockGetAll.mockResolvedValueOnce([makeApp()]);
    const user = userEvent.setup();

    render(<MicroApps />);

    // After load, card content present
    expect(await screen.findByRole('heading', { name: /micro apps/i })).toBeInTheDocument();
    expect(screen.getByText('Calendar')).toBeInTheDocument();
    expect(screen.getByText(/org events and holidays/i)).toBeInTheDocument();
    // Chip texts
    expect(screen.getByText(/mandatory/i)).toBeInTheDocument();
    expect(screen.getByText(/2 versions?/i)).toBeInTheDocument();

    // Versions collapsed initially; click to show
    const toggle = screen.getByRole('button', { name: /show versions \(2\)/i });
    await user.click(toggle);
    // Now version items appear
    expect(await screen.findByText(/version 1\.0\.0/i)).toBeInTheDocument();
    expect(screen.getByText(/build 10/i)).toBeInTheDocument();
    expect(screen.getByText(/download package/i)).toHaveAttribute('href', expect.stringContaining('example.com'));
  });

  it('shows error notification if fetch fails', async () => {
    const err = new Error('Service down');
    mockGetAll.mockRejectedValueOnce(err);
    render(<MicroApps />);
    await waitFor(() => {
  expect(mockShowNotification).toHaveBeenCalledWith('Service down', 'error');
    });
  });
});
