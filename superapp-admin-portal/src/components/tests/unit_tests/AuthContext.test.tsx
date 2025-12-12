import { render } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';

// Mock react-oidc-context to capture AuthProvider props and control useAuth return
jest.mock('react-oidc-context', () => {
  const React = require('react');
  let mockAuth: any = {};
  let lastProps: any = null;
  return {
    // The real lib exports { AuthProvider, useAuth }
    AuthProvider: jest.fn((props: any) => {
      lastProps = props;
      return React.createElement(React.Fragment, null, props.children);
    }),
    useAuth: jest.fn(() => mockAuth),
    __setMockAuth: (v: any) => {
      mockAuth = v;
    },
    __getLastProps: () => lastProps,
  };
});

// Import after mock so the module under test uses our mock of react-oidc-context
import { AuthProvider, useAuth } from '../../../lib/auth-context';

const { __setMockAuth, __getLastProps } = jest.requireMock('react-oidc-context');

describe('AuthContext - AuthProvider', () => {
  const setConfigs = (cfg: Partial<Record<string, string>>) => {
    (window as any).configs = cfg;
  };

  beforeEach(() => {
    __setMockAuth({});
    (window as any).configs = undefined;
  });

  it('throws if IDP_CLIENT_ID or IDP_BASE_URL are missing', () => {
    setConfigs({});
    expect(() =>
      render(
        <AuthProvider>
          <div>child</div>
        </AuthProvider>
      )
    ).toThrow(/Missing IDP_CLIENT_ID or IDP_BASE_URL/i);
  });

  it('defaults redirect URLs to window.location.origin when not provided', () => {
    setConfigs({ IDP_CLIENT_ID: 'client123', IDP_BASE_URL: 'https://api.example.io/t/org' });
    render(
      <AuthProvider>
        <div>child</div>
      </AuthProvider>
    );
    const props = __getLastProps();
    expect(props.redirect_uri).toBe(window.location.origin);
    expect(props.post_logout_redirect_uri).toBe(window.location.origin);
  });

  it.each([
    ['root base', 'https://api.example.io/t/org', 'https://api.example.io/t/org'],
    ['root base with trailing slash', 'https://api.example.io/t/org/', 'https://api.example.io/t/org'],
    ['oauth2 base', 'https://api.example.io/t/org/oauth2', 'https://api.example.io/t/org'],
    ['oauth2 base with trailing slash', 'https://api.example.io/t/org/oauth2/', 'https://api.example.io/t/org'],
    ['oauth2 authorize base', 'https://api.example.io/t/org/oauth2/authorize', 'https://api.example.io/t/org'],
  ])('normalizes base url (%s)', (_label, base, root) => {
    setConfigs({
      IDP_CLIENT_ID: 'client123',
      IDP_BASE_URL: base,
      SIGN_IN_REDIRECT_URL: 'https://app.example.io/callback',
      SIGN_OUT_REDIRECT_URL: 'https://app.example.io/logout-cb',
    });

    render(
      <AuthProvider>
        <div>child</div>
      </AuthProvider>
    );

    const props = __getLastProps();
    expect(props.authority).toBe(root);
    expect(props.client_id).toBe('client123');
    expect(props.redirect_uri).toBe('https://app.example.io/callback');
    expect(props.post_logout_redirect_uri).toBe('https://app.example.io/logout-cb');
    expect(props.response_type).toBe('code');
    expect(props.scope).toContain('openid');
    expect(props.scope).toContain('email');
    expect(props.loadUserInfo).toBe(true);
    expect(props.automaticSilentRenew).toBe(false);

    expect(props.metadata).toEqual(
      expect.objectContaining({
        issuer: root,
        authorization_endpoint: `${root}/oauth2/authorize`,
        token_endpoint: `${root}/oauth2/token`,
        userinfo_endpoint: `${root}/oauth2/userinfo`,
        end_session_endpoint: `${root}/oidc/logout`,
      })
    );

    // Verify onSigninCallback strips OIDC params from URL
    const spy = jest.spyOn(window.history, 'replaceState');
    const url = `${window.location.origin}/dashboard?code=abc&state=xyz&session_state=123&foo=bar`;
    window.history.pushState({}, 'test', url);
    expect(window.location.search).toContain('code=abc');
    props.onSigninCallback();
    expect(spy).toHaveBeenCalled();
    const newUrl = new URL(window.location.href);
    expect(newUrl.searchParams.get('code')).toBeNull();
    expect(newUrl.searchParams.get('state')).toBeNull();
    expect(newUrl.searchParams.get('session_state')).toBeNull();
    expect(newUrl.searchParams.get('foo')).toBe('bar');
    spy.mockRestore();
  });
});

describe('AuthContext - useAuth', () => {
  beforeEach(() => {
    (console as any)._error = console.error;
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  it('logs OIDC errors and maps default state', () => {
    __setMockAuth({ error: new Error('boom') });
    const { result } = renderHook(() => useAuth());
    expect(console.error).toHaveBeenCalledWith('OIDC error:', expect.any(Error));
    expect(result.current.state.isAuthenticated).toBe(false);
    expect(result.current.state.isLoading).toBe(false);
  });

  it('maps username preference and exposes signIn/signOut', async () => {
    const signinRedirect = jest.fn();
    const signoutRedirect = jest.fn().mockResolvedValue(undefined);
    __setMockAuth({
      isAuthenticated: true,
      isLoading: false,
      user: { profile: { preferred_username: 'alice', email: 'alice@example.com' }, access_token: 'tok', expired: false },
      signinRedirect,
      signoutRedirect,
    });

    const { result } = renderHook(() => useAuth());
    expect(result.current.state.isAuthenticated).toBe(true);
    expect(result.current.state.username).toBe('alice');
    expect(result.current.state.email).toBe('alice@example.com');

    await act(async () => {
      result.current.signIn();
    });
    expect(signinRedirect).toHaveBeenCalled();

    await act(async () => {
      await result.current.signOut();
    });
    expect(signoutRedirect).toHaveBeenCalled();
  });

  it('getAccessToken returns token when not expired', async () => {
    const signinSilent = jest.fn();
    __setMockAuth({
      user: { profile: {}, access_token: 'abc123', expired: false },
      signinSilent,
    });
    const { result } = renderHook(() => useAuth());
    await expect(result.current.getAccessToken()).resolves.toBe('abc123');
    expect(signinSilent).not.toHaveBeenCalled();
  });

  it('getAccessToken silently renews when expired and still returns token', async () => {
    const signinSilent = jest.fn().mockResolvedValue(undefined);
    __setMockAuth({
      user: { profile: {}, access_token: 'zzz', expired: true },
      signinSilent,
    });
    const { result } = renderHook(() => useAuth());
    await expect(result.current.getAccessToken()).resolves.toBe('zzz');
    expect(signinSilent).toHaveBeenCalled();
  });

  it('getAccessToken ignores silent renew errors and returns existing token', async () => {
    const signinSilent = jest.fn().mockRejectedValue(new Error('nope'));
    __setMockAuth({
      user: { profile: {}, access_token: 'toktok', expired: true },
      signinSilent,
    });
    const { result } = renderHook(() => useAuth());
    await expect(result.current.getAccessToken()).resolves.toBe('toktok');
  });

  it('getAccessToken returns empty string when no user', async () => {
    __setMockAuth({ user: undefined });
    const { result } = renderHook(() => useAuth());
    await expect(result.current.getAccessToken()).resolves.toBe('');
  });
});
