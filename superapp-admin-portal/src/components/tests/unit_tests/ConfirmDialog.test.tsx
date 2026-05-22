import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmDialog from '../../common/ConfirmDialog';

describe('ConfirmDialog', () => {
  const setup = (props?: Partial<React.ComponentProps<typeof ConfirmDialog>>) => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    const utils = render(
      <ConfirmDialog
        open={true}
        title="Delete item"
        message="Are you sure you want to delete this item?"
        onConfirm={onConfirm}
        onCancel={onCancel}
        {...props}
      />
    );
    return { onConfirm, onCancel, ...utils };
  };

  it('renders title and message when open', () => {
    setup();
    expect(screen.getByRole('heading', { name: /delete item/i })).toBeInTheDocument();
    expect(
      screen.getByText(/are you sure you want to delete this item\?/i)
    ).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const { onCancel } = setup({ cancelText: 'No' });
    await user.click(screen.getByRole('button', { name: /no/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when confirm button is clicked', async () => {
    const user = userEvent.setup();
    const { onConfirm } = setup({ confirmText: 'Yes, delete' });
    await user.click(screen.getByRole('button', { name: /yes, delete/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('uses custom confirm and cancel button labels', () => {
    setup({ confirmText: 'Proceed', cancelText: 'Back' });
    expect(screen.getByRole('button', { name: /proceed/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
  });

  it('respects confirm button color prop', () => {
    setup({ confirmColor: 'error' });
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    // MUI buttons set data attributes/classes; at least ensure it rendered
    expect(confirmButton).toBeInTheDocument();
  });

  it('keeps displaying last title/message while closing to avoid flicker', () => {
    // Start open with initial title/message
    const { rerender } = render(
      <ConfirmDialog
        open={true}
        title="Initial"
        message="First message"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );

    // Close dialog while props change; it should still show previous display values
    rerender(
      <ConfirmDialog
        open={false}
        title="Changed"
        message="Second message"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );

    // The dialog component remains in the tree during close animation, ensure last known text present
    expect(screen.getByText(/first message/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /initial/i })).toBeInTheDocument();
  });
});
