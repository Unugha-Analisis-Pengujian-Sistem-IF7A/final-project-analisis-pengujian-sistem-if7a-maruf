# Unit Tests

This folder contains all the unit tests for the application.

## Structure

- `components/`: Tests for reusable UI components.
- `pages/`: Tests for page-level components and routing.
- `services/`: Tests for API services and logic.
- `utils/`: Tests for utility functions.
- `hooks/`: Tests for custom React hooks.

## Running Tests

To run all tests:
```bash
npm run test
```

To run tests in watch mode (default):
```bash
npm run test
```

To run a specific test file:
```bash
npm run test src/tests/components/Button.test.tsx
```

## Best Practices

- Use `@testing-library/react` for component testing.
- Focus on user interactions and accessibility (a11y).
- Mock external services using `vi.mock` from `vitest`.
