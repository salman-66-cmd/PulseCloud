import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Badge } from '../components/common/Badge';

describe('Badge Component', () => {
  it('renders healthy status variant correctly', () => {
    render(<Badge variant="healthy">Healthy</Badge>);
    expect(screen.getByText('Healthy')).toBeInTheDocument();
  });

  it('renders down status variant correctly', () => {
    render(<Badge variant="down">Down</Badge>);
    expect(screen.getByText('Down')).toBeInTheDocument();
  });
});
