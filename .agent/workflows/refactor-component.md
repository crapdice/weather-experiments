---
description: Pipeline for refactoring complex React components to improve performance and maintainability.
---

1. **Analyze Component Responsibilities**
   - Identify logic that can be extracted into custom hooks.
   - Separate sub-components that can be memoized.
   - Check for heavy computations in the render path.

2. **Extract Business Logic**
   - Move non-UI logic to helper functions in a `utils/` file.
   - Create custom hooks for state management or data fetching.

3. **Optimize Rendering**
   - Use `React.memo` for expensive sub-components.
   - Implement `useMemo` for complex data processing.
   - Implement `useCallback` for props passed to memoized children.

4. **Verify Type Safety**
   - Ensure all props and state are strictly typed.
   - Use descriptive interfaces for complex object structures.

5. **Validation & Testing**
   - Run `npm run test` to ensure no regressions.
   - Perform a physical check of the UI on both desktop and mobile views.
   - Verify that the component's bundle size hasn't increased significantly.
