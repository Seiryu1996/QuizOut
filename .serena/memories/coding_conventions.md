# Coding Conventions and Style

## Frontend (TypeScript/React)

### TypeScript Configuration
- **Target**: ES5
- **Strict mode**: Enabled
- **Path mapping**: `@/*` maps to `./src/*`
- **JSX**: Preserve (handled by Next.js)

### React Components
- Use functional components with TypeScript interfaces
- Props interfaces should extend appropriate HTML element attributes when applicable
- Example pattern:
```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ ... }) => { ... }
```

### Styling
- **Framework**: Tailwind CSS
- **Approach**: Utility-first with custom color scheme
- **Custom colors**: primary-*, success-*, danger-* variants
- **Component classes**: Combine base classes with variant/size classes

### File Structure
- Components are organized by atomic design principles
- Each component has corresponding test files in `__tests__` directories
- Use named exports for components

## Backend (Go)

### Package Structure
- **cmd/**: Application entry points
- **internal/**: Private application code (handlers, services, repositories)
- **pkg/**: Public packages that can be imported by external applications
- **configs/**: Configuration files

### Code Organization
- Clean architecture with clear separation of concerns
- Dependency injection pattern
- Context-based request handling
- Proper error handling and logging

### Import Style
- Standard library imports first
- Third-party imports second  
- Local imports last
- Group imports with blank lines between groups

## General Conventions
- **Language**: Code comments and UI text in Japanese
- **Error Handling**: Proper error propagation and logging
- **Testing**: Comprehensive test coverage with both unit and integration tests