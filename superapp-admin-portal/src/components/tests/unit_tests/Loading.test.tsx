import { render, screen } from '@testing-library/react';
import Loading from '../../common/Loading';

describe('Loading', () => {
  it('renders a circular progress indicator', () => {
    render(<Loading />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
