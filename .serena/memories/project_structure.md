# Project Structure

## Root Directory
```
├── backend/           # Go backend service
│   ├── cmd/server/    # Main application entry point
│   ├── internal/      # Internal packages (handlers, services, etc.)
│   ├── pkg/           # Shared packages
│   ├── configs/       # Configuration files
│   └── tests/         # Test files
├── frontend/          # Next.js frontend
│   └── src/           # Source code
│       ├── app/       # Next.js app directory
│       ├── components/ # React components (atomic design)
│       │   ├── atoms/
│       │   ├── molecules/
│       │   ├── organisms/
│       │   └── templates/
│       ├── hooks/     # Custom React hooks
│       ├── lib/       # Utility libraries
│       ├── services/  # API services
│       ├── store/     # Zustand stores
│       └── types/     # TypeScript type definitions
├── infra/             # Infrastructure configuration
│   ├── docker/        # Docker configurations
│   └── firebase/      # Firebase configuration
├── scripts/           # Utility scripts
└── docker-compose.yml # Docker Compose configuration
```

## Component Architecture
The frontend follows atomic design principles:
- **Atoms**: Basic UI elements (Button, Loading, StatusBadge)
- **Molecules**: Simple combinations of atoms
- **Organisms**: Complex UI components
- **Templates**: Page layouts