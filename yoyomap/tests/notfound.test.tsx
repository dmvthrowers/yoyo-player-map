import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import NotFound from '../app/[locale]/not-found';

describe('NotFound', () => {
  it('renders not found message', () => {
    render(<NotFound />);
    expect(screen.getByText(/not found/i)).toBeInTheDocument();
  });
});
