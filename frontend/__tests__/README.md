# Testing Guide

## Overview

This document provides guidelines for testing the SuperApp Mobile frontend.

## Testing Stack

- **Test Runner**: Jest (v29+)
- **Testing Library**: @testing-library/react-native (v12.4+)
- **Test Environment**: jest-expo preset for React Native/Expo
- **Coverage**: Jest coverage with configurable thresholds

## Test Structure

```
frontend/
├── __tests__/
│   ├── hooks/           # Unit tests for custom hooks (ViewModels)
│   ├── components/      # Component tests
│   ├── context/slices   # Redux Slices tests
│   ├── services/        # Service layer tests
│   ├── utils/           # Utility function tests
└── jest.setup.js        # Global test configuration
```

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests in CI mode
npm run test:ci

# Update snapshots
npm run test:update

# Run specific test file
npx jest path/to/test.test.ts

# Run tests matching a pattern
npx jest --testNamePattern="useFeed"
```

## Writing Tests

### 1. Hook Tests (ViewModels)

Hooks are the core of our MVVM architecture. They contain business logic and should be thoroughly tested.

```typescript
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useMyHook } from '@/hooks/useMyHook';

describe('useMyHook', () => {
  it('should return initial state', () => {
    const { result } = renderHook(() => useMyHook());
    
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('should handle async operations', async () => {
    const { result } = renderHook(() => useMyHook());
    
    await act(async () => {
      result.current.fetchData();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });
});
```

### 2. Component Tests (Views)

Components should be presentational. Test rendering and user interactions.

```typescript
import { render, screen, fireEvent } from '@testing-library/react-native';
import { MyComponent } from '@/components/MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent title="Test" />);
    
    expect(screen.getByText('Test')).toBeTruthy();
  });

  it('should handle user interactions', () => {
    const mockOnPress = jest.fn();
    render(<MyComponent onPress={mockOnPress} />);
    
    fireEvent.press(screen.getByRole('button'));
    expect(mockOnPress).toHaveBeenCalled();
  });
});
```

### 3. Redux Integration Tests

Use the custom `renderWithProviders` helper for components that need Redux state.

```typescript
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import { MyConnectedComponent } from '@/components/MyConnectedComponent';

describe('MyConnectedComponent', () => {
  it('should access Redux state', () => {
    const preloadedState = {
      auth: {
        accessToken: 'mock-token',
        user: { id: '1', name: 'Test User' },
      },
    };

    const { getByText } = renderWithProviders(
      <MyConnectedComponent />,
      { preloadedState }
    );

    expect(getByText('Test User')).toBeTruthy();
  });
});
```

### 4. Service/Utility Tests

Test pure functions and service methods.

```typescript
import { formatDate, parseData } from '@/utils/helpers';

describe('Helper Utilities', () => {
  describe('formatDate', () => {
    it('should format date correctly', () => {
      const result = formatDate('2025-01-01');
      expect(result).toBe('Jan 1, 2025');
    });

    it('should handle invalid dates', () => {
      const result = formatDate('invalid');
      expect(result).toBe('Invalid Date');
    });
  });
});
```

## Mocking Guidelines

### 1. External Modules

Mock external dependencies in `jest.setup.js` or individual test files.

```typescript
// jest.setup.js
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));
```

### 2. API Calls

Mock service functions to avoid real network requests.

```typescript
import * as authService from '@/services/authService';

jest.mock('@/services/authService');

const mockAuthService = authService as jest.Mocked<typeof authService>;

mockAuthService.login.mockResolvedValue({ token: 'mock-token' });
```

### 3. AsyncStorage

AsyncStorage is automatically mocked in `jest.setup.js`.

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Will use the mock automatically
await AsyncStorage.setItem('key', 'value');
```

## Coverage Requirements

We maintain the following minimum coverage thresholds:

- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

### Viewing Coverage

```bash
npm run test:coverage
```

Coverage reports are generated in `coverage/` directory:
- `coverage/lcov-report/index.html` - Interactive HTML report
- `coverage/coverage-summary.json` - JSON summary

## Best Practices

### 1. Test Isolation

- Each test should be independent
- Use `beforeEach` to reset state
- Clean up timers, subscriptions, and mocks

```typescript
beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});
```

### 2. Descriptive Test Names

Use clear, behavior-focused test names.

```typescript
// ✅ Good
it('should display error message when login fails', () => {});

// ❌ Bad
it('test login', () => {});
```

### 3. AAA Pattern

Follow Arrange-Act-Assert pattern.

```typescript
it('should increment counter', () => {
  // Arrange
  const { result } = renderHook(() => useCounter());
  
  // Act
  act(() => {
    result.current.increment();
  });
  
  // Assert
  expect(result.current.count).toBe(1);
});
```

### 4. Test User Behavior, Not Implementation

Focus on what the user experiences, not internal implementation details.

```typescript
// ✅ Good - tests user behavior
expect(screen.getByText('Welcome')).toBeTruthy();

// ❌ Bad - tests implementation
expect(component.state.isLoggedIn).toBe(true);
```

### 5. Avoid Over-Mocking

Only mock what's necessary. Prefer integration tests when possible.

### 6. Async Testing

Always use `await` and `waitFor` for async operations.

```typescript
await waitFor(() => {
  expect(result.current.loading).toBe(false);
});
```

## Test Data Factories

Use the mock data factories in `__tests__/utils/mockData.ts`:

```typescript
import { createMockMicroApp, createMockUser } from '@/__tests__/utils/mockData';

const mockApp = createMockMicroApp({ appId: 'custom-id' });
const mockUser = createMockUser({ email: 'test@example.com' });
```

## Debugging Tests

### Running Specific Tests

```bash
# Run only tests with "login" in the name
npx jest --testNamePattern="login"

# Run tests in a specific file
npx jest __tests__/hooks/useFeed.test.ts

# Run with verbose output
npx jest --verbose
```

### Debug Mode

```typescript
// Add console.log in tests (note: mocked by default)
console.log = jest.fn(); // Remove this line temporarily
console.log(result.current);

// Use screen.debug() to see component tree
screen.debug();
```

## Common Issues & Solutions

### 1. Timer Issues

```typescript
// Use fake timers for setTimeout/setInterval
jest.useFakeTimers();
jest.advanceTimersByTime(1000);
jest.useRealTimers();
```

### 2. Async Issues

```typescript
// Always await async operations
await act(async () => {
  await result.current.fetchData();
});

await waitFor(() => {
  expect(result.current.data).toBeDefined();
});
```

### 3. State Updates

```typescript
// Wrap state updates in act()
act(() => {
  result.current.updateState();
});
```

## CI/CD Integration

Tests run automatically on:
- Pre-commit hook (related tests only)
- Pull request creation
- Push to main branch

### Pre-commit Hook

```bash
# Runs automatically via lint-staged
jest --bail --findRelatedTests --passWithNoTests
```

## Contributing

When adding new features:

1. Write tests alongside your code
2. Ensure all tests pass: `npm test`
3. Check coverage: `npm run test:coverage`
4. Follow existing test patterns
5. Update this documentation if needed

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Expo Testing Guide](https://docs.expo.dev/develop/unit-testing/)

## Support

For questions or issues with tests:
- Check existing test files for examples
- Review this documentation
- Ask in team discussions
- Reference the official documentation links above
