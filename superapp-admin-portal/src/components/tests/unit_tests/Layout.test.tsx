import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Layout from '../../layout/Layout';

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock Header and Footer to avoid deep rendering
jest.mock('../../common/Header', () => () => <div data-testid="header" />);
jest.mock('../../common/Footer', () => () => <div data-testid="footer" />);

describe('Layout', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders header, footer, and children', () => {
    render(
      <MemoryRouter>
        <Layout>
          <div>Child Content</div>
        </Layout>
      </MemoryRouter>
    );
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('footer')).toBeInTheDocument();
    expect(screen.getByText('Child Content')).toBeInTheDocument();
  });

  it('navigates home when clicking the logo', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Layout>
          <div />
        </Layout>
      </MemoryRouter>
    );

    const logo = screen.getByAltText('App Icon');
    await user.click(logo);
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('navigates to menu item paths when clicked', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Layout>
          <div />
        </Layout>
      </MemoryRouter>
    );

  // Select the menu list directly (MUI permanent Drawer doesn't expose a 'presentation' role)
  const list = screen.getByRole('list');
    const items = within(list).getAllByRole('button');

    // Click each list item and verify path
    await user.click(items[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    await user.click(items[1]);
    expect(mockNavigate).toHaveBeenCalledWith('/users');
    await user.click(items[2]);
    expect(mockNavigate).toHaveBeenCalledWith('/analytics');
  });
});
