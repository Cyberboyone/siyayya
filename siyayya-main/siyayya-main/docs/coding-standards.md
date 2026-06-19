# Coding Standards & Best Practices

To maintain a healthy, scalable codebase, all contributors must adhere to these standards.

## 1. TypeScript

*   **Strict Mode**: `strict` is enabled in `tsconfig.json`. Do not disable it.
*   **No `any`**: Avoid using `any`. Define interfaces or types for all data structures, especially API responses and Firestore documents.
*   **Export Types**: Keep global types in `src/types/index.ts`. Feature-specific types should live in `src/features/<feature>/types.ts`.

## 2. React Components

*   **Functional Components**: Always use functional components and hooks. No class components.
*   **Props**: Define an `interface <ComponentName>Props` above the component definition.
*   **File Naming**: PascalCase for components (e.g., `ProductCard.tsx`).
*   **Export**: Use named exports. Avoid default exports except for page-level components required by `React.lazy()`.

## 3. Styling (Tailwind CSS)

*   **Utility-First**: Use Tailwind utility classes for all styling.
*   **Shadcn UI**: For base interactive elements (Buttons, Inputs, Dialogs), use the pre-configured `shadcn/ui` components in `src/components/ui`.
*   **Dynamic Classes**: Use the `cn()` utility (`clsx` + `tailwind-merge`) from `src/lib/utils.ts` when combining dynamic Tailwind classes to prevent style conflicts.

## 4. State Management

*   **Local State**: Use `useState` for UI toggles (e.g., dropdown open/close).
*   **Server State**: Use `react-query` (`useQuery`, `useMutation`) for fetching, caching, and updating Firestore data. Do not store server data in global state managers.
*   **Global UI State**: Use `Zustand` for app-wide UI state (e.g., shopping cart, current theme).

## 5. Firebase Usage

*   **Abstraction**: Do not call `getDocs` or `updateDoc` directly inside UI components. Abstract these calls into custom hooks (e.g., `src/hooks/use-queries.ts`) or service files (e.g., `src/features/messaging/services/chatService.ts`).
*   **Environment Variables**: Always use `VITE_FIREBASE_*` variables for client-side init.

## 6. Accessibility (a11y)

*   **Semantic HTML**: Use proper tags (`<button>` not `<div onClick>`, `<nav>`, `<main>`).
*   **Aria Labels**: Provide `aria-label` for icon-only buttons.
*   **Keyboard Navigation**: Ensure all interactive elements are reachable via `Tab` and triggerable via `Enter`/`Space`.
