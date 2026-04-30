import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PlayersPage from '../app/[locale]/players/page';

describe('PlayersPage', () => {
  it('renders without crashing', () => {
    render(<PlayersPage />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});
