import { render, screen, within } from '@testing-library/react';
import Footer from '../../common/Footer';

describe('Footer', () => {
  it('renders a footer landmark', () => {
    render(<Footer />);
    const footer = screen.getByRole('contentinfo');
    expect(footer).toBeInTheDocument();
  });

  it('shows the current year in the copyright text', () => {
    render(<Footer />);
    const year = new Date().getFullYear().toString();
    const footer = screen.getByRole('contentinfo');
    const caption = within(footer).getByText(/all rights reserved/i);
    expect(caption.textContent).toContain(year);
  });
});
