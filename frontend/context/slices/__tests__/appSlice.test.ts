import appsReducer, { MicroApp, resetApps, setApps } from '@/context/slices/appSlice';

describe('appSlice - resetApps', () => {
  const mockApp: MicroApp = {
    name: 'Test App',
    description: 'Test Description',
    promoText: 'Test Promo',
    appId: 'test-app-1',
    iconUrl: 'https://example.com/icon.png',
    bannerImageUrl: 'https://example.com/banner.png',
    isMandatory: 0,
    versions: [
      {
        version: '1.0.0',
        build: 1,
        releaseNotes: 'Test notes',
        downloadUrl: 'https://example.com/download',
        iconUrl: 'https://example.com/icon.png',
      },
    ],
    status: 'DOWNLOADED',
    webViewUri: 'https://example.com/webview',
    clientId: 'client-id',
    exchangedToken: 'token',
    exchangedIdToken: 'id-token',
    displayMode: 'fullscreen',
  };

  it('should clear apps array when resetApps is dispatched', () => {
    const initialState = {
      apps: [mockApp],
      downloading: ['app-id-1'],
      downloadProgress: { 'app-id-1': 50 },
    };

    const state = appsReducer(initialState, resetApps());

    expect(state.apps).toEqual([]);
    expect(state.downloading).toEqual([]);
    expect(state.downloadProgress).toEqual({});
  });

  it('should handle resetApps on empty state', () => {
    const initialState = {
      apps: [],
      downloading: [],
      downloadProgress: {},
    };

    const state = appsReducer(initialState, resetApps());

    expect(state.apps).toEqual([]);
    expect(state.downloading).toEqual([]);
    expect(state.downloadProgress).toEqual({});
  });

  it('should handle resetApps after setApps', () => {
    const state1 = appsReducer(
      { apps: [], downloading: [], downloadProgress: {} },
      setApps([mockApp])
    );

    expect(state1.apps).toHaveLength(1);
    expect(state1.apps[0]).toEqual(mockApp);

    const state2 = appsReducer(state1, resetApps());

    expect(state2.apps).toEqual([]);
    expect(state2.downloading).toEqual([]);
    expect(state2.downloadProgress).toEqual({});
  });
});
