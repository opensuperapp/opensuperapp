import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from '../../../context/ThemeContext';

function TestConsumer() {
  const { mode, toggleTheme } = useTheme();
  return (
    <div>
      <div aria-label="current-mode">{mode}</div>
      <button onClick={toggleTheme}>Toggle</button>
    </div>
  );
}

describe('ThemeContext', () => {
  const STORAGE_KEY = 'app-theme-mode';

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset storage and spies
    localStorage.clear();
  });

  it('throws if used outside provider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<TestConsumer />)).toThrow(/useTheme must be used within ThemeProvider/i);
    spy.mockRestore();
  });

  it('defaults to light when no saved mode', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockReturnValueOnce(null);
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );
    expect(screen.getByLabelText('current-mode')).toHaveTextContent('light');
  });

  it('initializes from saved dark mode and persists on change', async () => {
    const user = userEvent.setup();
    const getSpy = jest.spyOn(Storage.prototype, 'getItem').mockReturnValueOnce('dark');
    const setSpy = jest.spyOn(Storage.prototype, 'setItem');

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    // Starts dark from storage
    expect(screen.getByLabelText('current-mode')).toHaveTextContent('dark');
    expect(getSpy).toHaveBeenCalledWith(STORAGE_KEY);

    // Toggle to light
    await user.click(screen.getByRole('button', { name: /toggle/i }));
    expect(screen.getByLabelText('current-mode')).toHaveTextContent('light');
    expect(setSpy).toHaveBeenCalledWith(STORAGE_KEY, 'light');

    // Toggle back to dark
    await user.click(screen.getByRole('button', { name: /toggle/i }));
    expect(screen.getByLabelText('current-mode')).toHaveTextContent('dark');
    expect(setSpy).toHaveBeenCalledWith(STORAGE_KEY, 'dark');
  });
});
