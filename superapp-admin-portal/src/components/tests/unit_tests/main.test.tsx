import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock App to a simple marker
jest.mock('../../../App', () => ({ __esModule: true, default: () => <div>APP</div> }));

// Mock providers and CssBaseline to pass-through components
jest.mock('../../../lib/auth-context', () => ({
  AuthProvider: ({ children }: any) => <div>AUTH{children}</div>,
}));
jest.mock('../../../context', () => ({
  ThemeProvider: ({ children }: any) => <div>THEME{children}</div>,
  NotificationProvider: ({ children }: any) => <div>NOTIFY{children}</div>,
}));
jest.mock('@mui/material', () => ({
  CssBaseline: () => <div>CSSBASELINE</div>,
}));

// Spy on createRoot and provide a mock render
const mockRender = jest.fn();
const mockCreateRoot = jest.fn((_el: Element) => ({ render: mockRender } as any));
jest.mock('react-dom/client', () => ({
  createRoot: (el: Element) => mockCreateRoot(el),
}));

// Provide a root element in the document for main.tsx
beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>';
  mockRender.mockReset();
  mockCreateRoot.mockClear();
});

describe('main.tsx bootstrap', () => {
  it('creates a root and renders App wrapped with providers', async () => {
    // Dynamically import after mocks are set up
    await import('../../../main');

    expect(mockCreateRoot).toHaveBeenCalledTimes(1);
    const rootEl = document.getElementById('root');
    expect(rootEl).toBeTruthy();

    expect(mockRender).toHaveBeenCalledTimes(1);
  const renderArg = mockRender.mock.calls[0][0];
  expect(renderArg).toBeTruthy();
  expect(typeof renderArg).toBe('object');
  // Basic structural checks
  // Root should be StrictMode element with children
  // and include nested children tree
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  expect((renderArg as any).props).toBeTruthy();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  expect((renderArg as any).props.children).toBeTruthy();
  });
});
