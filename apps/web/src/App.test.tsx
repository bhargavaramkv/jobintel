import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from './App';

afterEach(cleanup);

describe('App', () => {
  it('lists commands when "help" is entered', async () => {
    render(<App />);
    await userEvent.type(screen.getByLabelText('Command'), 'help{Enter}');
    expect(await screen.findByText(/status\s+check API and database health/)).toBeTruthy();
  });

  it('reports unknown commands', async () => {
    render(<App />);
    await userEvent.type(screen.getByLabelText('Command'), 'nope{Enter}');
    expect(await screen.findByText(/Unknown command: nope/)).toBeTruthy();
  });
});
