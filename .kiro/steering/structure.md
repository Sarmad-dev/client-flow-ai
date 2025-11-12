# Project Structure & Architecture

## File Organization

```
├── app/                    # Expo Router pages
│   ├── (auth)/            # Authentication screens (login, signup)
│   ├── (onboarding)/      # User onboarding flow
│   ├── (tabs)/            # Main app tab navigation
│   ├── _layout.tsx        # Root layout with providers
│   └── index.tsx          # Entry point
├── components/            # Reusable UI components
├── contexts/              # React Context providers
├── hooks/                 # Custom React hooks
├── lib/                   # Utility libraries and configurations
├── types/                 # TypeScript type definitions
├── assets/                # Static assets (images, fonts)
└── supabase/              # Database migrations and functions
```

## Architecture Patterns

### Component Structure

- **Functional components** with TypeScript interfaces
- **Props interfaces** defined inline or exported for reuse
- **StyleSheet** objects at component bottom
- **Theme-aware styling** using `useTheme()` hook

### Data Management

- **React Query** for server state with query keys pattern
- **Custom hooks** for data operations (useClients, useLeads, etc.)
- **Context providers** for global state (auth, theme, subscription)
- **Zod schemas** for form validation and type safety

### File Naming Conventions

- **PascalCase** for components (`ClientCard.tsx`)
- **camelCase** for hooks (`useClients.ts`)
- **kebab-case** for utilities and configs
- **Descriptive names** that indicate purpose

## Code Organization Rules

### Import Order

1. React and React Native imports
2. Third-party libraries
3. Local imports with `@/` alias
4. Type-only imports last

### Component Patterns

- Export component as default function
- Define interfaces before component
- Use functional components with hooks
- Implement proper TypeScript typing
- Follow theme system for colors and spacing

### Hook Patterns

- Prefix with `use` (useClients, useAuth)
- Return objects with consistent naming
- Handle loading and error states
- Use React Query for server operations
- Implement proper TypeScript return types

### Context Patterns

- Separate Provider and hook in same file
- Throw error if hook used outside provider
- Use TypeScript interfaces for context values
- Handle loading states appropriately

## Routing Structure

### App Router Convention

- `(auth)` - Authentication flow (grouped route)
- `(tabs)` - Main app navigation (grouped route)
- `(onboarding)` - User setup flow (grouped route)
- `_layout.tsx` - Layout files for nested routing
- `+not-found.tsx` - 404 error page

### Navigation Patterns

- Use typed routes with Expo Router
- Implement proper back navigation
- Handle deep linking for OAuth flows
- Use stack navigation for modal presentations

## Database Integration

### Supabase Patterns

- Row Level Security (RLS) enabled
- User-scoped data with `user_id` foreign keys
- Real-time subscriptions for live updates
- Proper error handling for database operations

### Query Patterns

- Use React Query with consistent key structure
- Implement optimistic updates where appropriate
- Handle offline scenarios gracefully
- Cache invalidation on mutations
