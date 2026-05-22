import '@testing-library/jest-dom';

// Polyfills for environments where TextEncoder/TextDecoder are missing (e.g., jsdom)
// Needed by react-router and other libs in tests
import { TextEncoder, TextDecoder } from 'util';

// @ts-expect-error - augment global for tests
if (!global.TextEncoder) {
	// @ts-expect-error - assign to global
	global.TextEncoder = TextEncoder;
}
// @ts-expect-error - augment global for tests
if (!global.TextDecoder) {
	// @ts-expect-error - assign to global
	global.TextDecoder = TextDecoder as unknown as typeof global.TextDecoder;
}
