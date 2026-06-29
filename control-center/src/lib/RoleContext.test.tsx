import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RoleProvider, useRole } from './RoleContext';
import type { Session } from '@supabase/supabase-js';

vi.mock('./api', () => ({
  getUserRole: vi.fn(),
}));

import { getUserRole } from './api';
const mockGetUserRole = vi.mocked(getUserRole);

function TestConsumer() {
  const { role, isAdmin, loading } = useRole();
  return (
    <div>
      <span data-testid="role">{role}</span>
      <span data-testid="admin">{isAdmin ? 'yes' : 'no'}</span>
      <span data-testid="loading">{loading ? 'yes' : 'no'}</span>
    </div>
  );
}

const fakeSession = { user: { id: 'user-123' } } as Session;

describe('RoleContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides admin role when getUserRole returns admin', async () => {
    mockGetUserRole.mockResolvedValue('admin');

    render(
      <RoleProvider session={fakeSession}>
        <TestConsumer />
      </RoleProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('no');
    });

    expect(screen.getByTestId('role').textContent).toBe('admin');
    expect(screen.getByTestId('admin').textContent).toBe('yes');
  });

  it('defaults to viewer on error', async () => {
    mockGetUserRole.mockRejectedValue(new Error('fail'));

    render(
      <RoleProvider session={fakeSession}>
        <TestConsumer />
      </RoleProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('no');
    });

    expect(screen.getByTestId('role').textContent).toBe('viewer');
    expect(screen.getByTestId('admin').textContent).toBe('no');
  });

  it('throws when useRole is used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow(
      'useRole must be used within a RoleProvider',
    );
    spy.mockRestore();
  });
});
