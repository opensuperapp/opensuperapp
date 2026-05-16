export const persistStore = jest.fn(() => ({ _persist: { version: -1, hydrated: true } }));
export const persistReducer = jest.fn((config, reducer) => reducer);
export const createTransform = jest.fn((inbound, outbound, config) => ({ inbound, outbound, config }));
