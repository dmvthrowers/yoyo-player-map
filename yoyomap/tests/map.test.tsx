import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import MapClient from '../app/[locale]/map/MapClient';
import MapInfoPanel from '../app/[locale]/map/MapInfoPanel';

// Basic smoke test for MapClient

describe('MapClient', () => {
  it('renders without crashing', () => {
    render(<MapClient />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});

describe('MapInfoPanel', () => {
  it('renders without crashing', () => {
    render(<MapInfoPanel />);
    expect(screen.getByTestId('info-panel')).toBeInTheDocument();
  });
});
