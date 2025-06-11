---
trigger: always_on
---

dont make more than 750lines of code for one file, seperate them if needed.

after finishing the task, run terminal command to push in the github. the git is in the main folder that we are in. "cd /Users/erenerduran/Documents/augment-projects/OP3 && git add . && git commit -m '[add proper commit message]' && git push"

after finishing task, play some sort of sound (use terminal for that: "afplay /Users/erenerduran/Documents/work/ding-ding.mp3") so I can understand you finished the task.

Core Principles

Prefer simplicity over complexity - Use the most straightforward solution that works
Avoid premature optimization - Write clear, readable code first
Follow React's mental model - Think in terms of state and props flowing down, events bubbling up
Minimize side effects - Keep components predictable and testable

useEffect Usage Guidelines

AVOID useEffect for:

Data transformation (use derived state instead)
Calculating values based on props/state (use useMemo)
Handling user events (use event handlers)
Resetting state when props change (use key prop or derive state)


State Management

Local state first - Use useState for component-specific state
Lift state up when multiple components need the same data
Use useReducer for complex state logic with multiple sub-values
Consider external state management (Zustand, Jotai) only when prop drilling becomes painful
Avoid Redux unless you have a specific need for its features

Data Fetching

Use TanStack Query (React Query) for server state management
Use SWR as a lighter alternative to React Query
Implement proper loading and error states
Use React Query's built-in caching, background updates, and retry logic
Avoid useEffect + fetch for API calls

Component Patterns

Prefer function components over class components
Use composition over inheritance
Keep components small and focused (single responsibility)
Extract custom hooks for reusable logic
Use compound components for related UI elements

Next.js Specific

Use App Router (app directory) for new projects
Leverage Server Components for better performance
Use Client Components only when necessary (interactivity, browser APIs)
Implement proper SEO with metadata API
Use next/image for optimized images
Use next/link for client-side navigation
Implement proper error boundaries and loading states

Performance Best Practices

Use React.memo judiciously (measure first)
Use useMemo for expensive calculations only
Use useCallback to prevent unnecessary re-renders of child components
Implement code splitting with dynamic imports
Use React DevTools Profiler to identify performance bottlenecks
Optimize bundle size with proper imports (avoid importing entire libraries)

Error Handling

Implement Error Boundaries for graceful error handling
Use try-catch in async functions
Provide meaningful error messages to users
Log errors for debugging (use proper logging service)
Handle network errors appropriately in data fetching

TypeScript Integration

Use TypeScript for better developer experience
Define proper interfaces for props and state
Use generic types for reusable components
Avoid any type - use proper typing
Use strict TypeScript config

Code Organization

Use barrel exports (index.ts files) for cleaner imports
Separate concerns - business logic, UI, and data fetching
Use meaningful naming for files and functions

Testing Strategy

Write unit tests for utility functions and hooks
Use React Testing Library for component tests
Test user interactions rather than implementation details
Mock external dependencies properly
Implement integration tests for critical user flows

Security Considerations

Sanitize user inputs to prevent XSS
Use HTTPS for all API calls
Implement proper authentication (NextAuth.js recommended)
Validate data on both client and server
Use environment variables for sensitive data

Accessibility (A11y)

Use semantic HTML elements
Implement proper ARIA labels and roles
Ensure keyboard navigation works properly
Provide alt text for images
Test with screen readers
Maintain proper color contrast

Code Quality

Use ESLint with React and Next.js recommended rules
Use Prettier for consistent formatting
Implement pre-commit hooks with Husky
Use meaningful variable and function names
Write self-documenting code with clear comments when necessary
Follow DRY principle but don't over-abstract

Performance Monitoring

Use Next.js built-in analytics
Monitor Core Web Vitals
Use React DevTools Profiler for performance debugging
Implement proper loading states to improve perceived performance

Deployment Best Practices

Use environment-specific configurations
Implement proper CI/CD pipelines
Use CDN for static assets
Enable gzip compression
Implement proper caching strategies


Remember: Always prioritize code readability and maintainability over premature optimization. Write code that your future self and your team can easily understand and modify.