import React, { useMemo } from "react";
import { isDev } from "../utils/env";
import { AuthProvider as OidcProvider, useAuth as useOidc } from "react-oidc-context";

type AuthState = {
  isAuthenticated: boolean;
  isLoading: boolean;
  username?: string;
  email?: string;
  roles?: string[];
};

type AuthContextValue = {
  state: AuthState;
  signIn: () => void;
  signOut: () => Promise<void>;
  getAccessToken: () => Promise<string>;
};

function getConfigs() {
  const c: any = (window as any).configs ?? {};
  const clientId = c.IDP_CLIENT_ID as string | undefined;
  let baseUrl = c.IDP_BASE_URL as string | undefined;
  const redirectUri = (c.SIGN_IN_REDIRECT_URL as string | undefined) ?? window.location.origin;
  const postLogoutRedirectUri = (c.SIGN_OUT_REDIRECT_URL as string | undefined) ?? redirectUri;
  if (!clientId || !baseUrl) {
    // Allow e2e bypass in dev to run without full configs
  if (isDev() && typeof window !== 'undefined' && window.localStorage?.getItem('e2e-auth') === '1') {
      // Provide harmless defaults; these won't be used when bypass is active
      baseUrl = baseUrl ?? window.location.origin;
      return { clientId: clientId ?? 'e2e-client', root: window.location.origin, oauth2Base: `${window.location.origin}/oauth2`, oidcBase: `${window.location.origin}/oidc`, redirectUri, postLogoutRedirectUri };
    }
    throw new Error("Missing IDP_CLIENT_ID or IDP_BASE_URL in public/config.js");
  }
  // Normalize: accept base as either issuer root or oauth2 endpoint
  // Examples:
  //  - https://api.<your-idp>.io/t/org
  //  - https://api.<your-idp>.io/t/org/
  //  - https://api.<your-idp>.io/t/org/oauth2
  //  - https://api.<your-idp>.io/t/org/oauth2/authorize
  const withoutAuthz = baseUrl.replace(/\/?oauth2\/?authorize$/, "");
  const withoutOauth2 = withoutAuthz.replace(/\/?oauth2\/?$/, "");
  const root = withoutOauth2.replace(/\/$/, "");
  const oauth2Base = `${root}/oauth2`;
  const oidcBase = `${root}/oidc`;
  return { clientId, root, oauth2Base, oidcBase, redirectUri, postLogoutRedirectUri };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { clientId, root, oauth2Base, oidcBase, redirectUri, postLogoutRedirectUri } = getConfigs();

  // Provide metadata directly (avoids relying on .well-known URL format)
  const metadata = {
    issuer: root,
    authorization_endpoint: `${oauth2Base}/authorize`,
    token_endpoint: `${oauth2Base}/token`,
    userinfo_endpoint: `${oauth2Base}/userinfo`,
    end_session_endpoint: `${oidcBase}/logout`,
  } as const;

  const onSigninCallback = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("code");
    url.searchParams.delete("state");
    url.searchParams.delete("session_state");
    window.history.replaceState({}, document.title, url.toString());
  };

  return (
    <OidcProvider
      authority={root}
      metadata={metadata}
      client_id={clientId}
      redirect_uri={redirectUri}
      post_logout_redirect_uri={postLogoutRedirectUri}
      response_type="code"
      scope="openid profile email groups"
  loadUserInfo={true}
  automaticSilentRenew={false}
      onSigninCallback={onSigninCallback}
    >
      {children}
    </OidcProvider>
  );
}

export function useAuth(): AuthContextValue {
  const bypass = isDev() && typeof window !== 'undefined' && window.localStorage?.getItem('e2e-auth') === '1';

  const auth = useOidc();
  if (!bypass && auth.error) {
    // Surface any initialization or callback errors in console
    // (kept lightweight to avoid UI changes)
    // eslint-disable-next-line no-console
    console.error("OIDC error:", auth.error);
  }
  const state: AuthState = bypass
    ? {
        isAuthenticated: true,
        isLoading: false,
        username: 'e2e-user',
        email: 'e2e@example.com',
        roles: ((): string[] => {
          try {
            const raw = window.localStorage.getItem('e2e-roles') || '';
            return raw
              .split(/[ ,]+/)
              .map((r) => r.trim())
              .filter(Boolean);
          } catch {
            return [];
          }
        })(),
      }
    : {
        isAuthenticated: !!auth.isAuthenticated,
        isLoading: !!auth.isLoading,
        username:
          (auth.user?.profile as any)?.preferred_username ||
          (auth.user?.profile as any)?.username ||
          (auth.user?.profile as any)?.email,
        email: (auth.user?.profile as any)?.email,
        roles: ((): string[] => {
          const g = (auth.user?.profile as any)?.groups;
          if (!g) return [];
          if (Array.isArray(g)) return g as string[];
          if (typeof g === 'string') return [g];
          return [];
        })(),
      };

  async function getAccessToken() {
    if (bypass) {
      return 'e2e-token';
    }
    // If user exists and token is expired, try silent renew
    if (auth.user && auth.user.expired) {
      try {
        await auth.signinSilent();
      } catch {
        // fall through; token might still be present
      }
    }
    return auth.user?.access_token || "";
  }

  const signIn = () => {
    if (bypass) {
      window.localStorage.setItem('e2e-auth', '1');
      return;
    }
    // library will build PKCE and redirect
    auth.signinRedirect();
  };

  const signOut = async () => {
    if (bypass) {
      window.localStorage.removeItem('e2e-auth');
      try {
        window.location.assign('/');
      } catch {}
      return;
    }
    await auth.signoutRedirect();
  };

  return useMemo(
    () => ({ state, signIn, signOut, getAccessToken }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bypass, state.isAuthenticated, state.isLoading, state.username, state.email]
  );
}
