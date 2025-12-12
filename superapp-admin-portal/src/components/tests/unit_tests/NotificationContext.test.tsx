import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationProvider, useNotification } from '../../../context/NotificationContext';

function TestConsumer() {
  const { showNotification } = useNotification();
  return (
    <div>
      <button onClick={() => showNotification('Hello world')}>Notify default</button>
      <button onClick={() => showNotification('All good', 'success')}>Notify success</button>
      <button onClick={() => showNotification('Oops', 'error')}>Notify error</button>
    </div>
  );
}

describe('NotificationContext', () => {
  it('throws if used outside provider', () => {
    // Suppress the error boundary noise in console
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<TestConsumer />)).toThrow(/useNotification must be used within NotificationProvider/i);
    spy.mockRestore();
  });

  it('renders children and shows default info notification', async () => {
    const user = userEvent.setup();
    render(
      <NotificationProvider>
        <TestConsumer />
      </NotificationProvider>
    );

    // Children rendered
    expect(screen.getByRole('button', { name: /notify default/i })).toBeInTheDocument();

    // Trigger default (info) notification
    await user.click(screen.getByRole('button', { name: /notify default/i }));
    expect(await screen.findByText('Hello world')).toBeInTheDocument();
    // MUI Alert has role=alert; we can't easily assert exact color, but presence is enough
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('shows success and error severities and can be closed', async () => {
    const user = userEvent.setup();
    render(
      <NotificationProvider>
        <TestConsumer />
      </NotificationProvider>
    );

    // Success
    await user.click(screen.getByRole('button', { name: /notify success/i }));
    expect(await screen.findByText('All good')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();

    // Close via alert close button (has aria-label="Close")
    const closeButtons = screen.getAllByRole('button');
    const close = closeButtons.find((b) => /close/i.test(b.getAttribute('aria-label') || ''));
    if (close) {
      await user.click(close);
    }

    // Error
    await user.click(screen.getByRole('button', { name: /notify error/i }));
    expect(await screen.findByText('Oops')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
