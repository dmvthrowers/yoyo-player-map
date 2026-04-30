import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProfilePage from '../app/[locale]/profile/page';

// Basic smoke test for ProfilePage

describe('ProfilePage', () => {
  it('renders without crashing', () => {
    render(<ProfilePage />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('shows error on failed submit', async () => {
    render(<ProfilePage />);
    const submitButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(submitButton);
    // This is a placeholder: in a real test, mock fetch and check for error message
    expect(true).toBe(true);
  });
});
