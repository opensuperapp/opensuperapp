import { render, screen } from '@testing-library/react';
import ComingSoon from '../../../pages/ComingSoon';

describe('ComingSoon page', () => {
  it('renders heading and message', () => {
    render(<ComingSoon />);
    expect(screen.getByRole('heading', { level: 4, name: /coming soon/i })).toBeInTheDocument();
    expect(
      screen.getByText(/this feature is under development and will be available soon\./i)
    ).toBeInTheDocument();
  });

  it('renders the construction icon', () => {
    render(<ComingSoon />);
    // MUI icons render as <svg>, check presence of an svg in the page
    const svgs = screen.getAllByTestId(/svg|.*icon.*/i, { exact: false });
    // If no data-testid is present, fall back to querying for <svg> elements
    const hasIcon = svgs.length > 0 || document.querySelectorAll('svg').length > 0;
    expect(hasIcon).toBe(true);
  });
});
