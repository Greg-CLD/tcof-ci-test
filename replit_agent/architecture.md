# Architecture

## Overview

This repository contains a web application built with a React frontend and Node.js Express backend. The application appears to be a project management tool focused on the "TCOF" (Technology-Centered Organizational Framework) methodology, with features for creating plans, managing projects, tracking tasks, and evaluating success factors.

The architecture follows a modern full-stack JavaScript/TypeScript approach with a clear separation between client and server components, a PostgreSQL database managed through Drizzle ORM, and a deployment strategy optimized for Replit.

## System Architecture

The system follows a client-server architecture with these key components:

1. **Client**: React-based SPA using React Router (via wouter) for navigation
2. **Server**: Express.js server providing REST API endpoints
3. **Database**: PostgreSQL database (using Neon Serverless via Drizzle ORM)
4. **Build System**: Vite for frontend bundling, esbuild for server bundling

```
                 ┌─────────────────┐
                 │     Client      │
                 │  (React/Vite)   │
                 └───────┬─────────┘
                         │
                         ▼
┌──────────────┐   ┌─────────────────┐   ┌─────────────────┐
│  Browser     │◄──┤  Express.js     │◄──┤  PostgreSQL     │
│  LocalStorage│   │  Server         │   │  (Neon)         │
└──────────────┘   └─────────────────┘   └─────────────────┘
                         │      ▲
                         ▼      │
                   ┌─────────────────┐
                   │     Drizzle     │
                   │     ORM         │
                   └─────────────────┘
```

## Key Components

### Frontend

The frontend is built with React and uses several modern libraries:

1. **UI Framework**: 
   - Uses a customized UI component library based on Radix UI primitives with Shadcn UI styling
   - Tailwind CSS for styling
   - Custom TCOF brand colors and theme configurations

2. **State Management**:
   - React Query (from @tanstack/react-query) for server state management
   - React Context for global state (auth, progress tracking)
   - Local storage for caching certain data like success factors

3. **Routing**:
   - Uses wouter for routing (lightweight alternative to React Router)
   - Protected routes with authentication guards

4. **Features**:
   - Project management dashboard
   - Goal mapping tool
   - Success factor checklist
   - Organization management
   - Task ownership and assignment
   - Email integration for task distribution

### Backend

The backend is an Express.js server with these components:

1. **API Layer**:
   - RESTful endpoints for data operations
   - Session-based authentication
   - Routes organized by resource type (projects, organizations, etc.)

2. **Data Access Layer**:
   - Drizzle ORM for database operations
   - File-based storage for some data (JSON files in the data directory)
   - Relations database for entity relationships

3. **Security**:
   - Password hashing using scrypt
   - Session-based authentication with express-session
   - PostgreSQL session store for persistence

4. **Services**:
   - Factor management service for TCOF success factors
   - Project management
   - Organization management
   - User authentication

### Database Schema

The database uses a PostgreSQL schema with these main tables:

1. **users**: User accounts and authentication
2. **projects**: Project metadata and configuration
3. **outcomes**: Project outcomes and goals
4. **outcome_progress**: Tracking progress on outcomes
5. **organisations**: Organization data
6. **organisation_memberships**: User-organization relationships
7. **plans**: Project plans containing tasks and timelines
8. **goal_maps**, **cynefin_selections**, **tcof_journeys**: Tool-specific data storage

The schema uses UUID primary keys for most entities and enforces referential integrity through foreign key constraints.

## Data Flow

1. **Authentication Flow**:
   - User login via username/password
   - Session creation and storage in PostgreSQL
   - Session cookies for maintaining authentication state

2. **Project Management Flow**:
   - User creates a project
   - Project gets associated with outcomes
   - Progress is tracked on outcomes
   - Tasks are created based on success factors
   - Task ownership is assigned
   - Email distribution of task lists

3. **Organization Management Flow**:
   - Organizations created with members and roles
   - Projects associated with organizations
   - Role-based access control for organization resources

4. **Success Factors Flow**:
   - System loads canonical success factors from database
   - Factors are cached in browser localStorage
   - Factors are used to generate task lists
   - Tasks can be customized and tracked

## External Dependencies

### Frontend Dependencies

- **UI Components**: Radix UI primitives, Shadcn UI design system
- **Drag and Drop**: @dnd-kit for sortable interfaces
- **Form Handling**: react-hook-form, zod for validation
- **Accessibility**: @axe-core/react for accessibility testing

### Backend Dependencies

- **Database**: @neondatabase/serverless for PostgreSQL connectivity
- **ORM**: drizzle-orm for database operations
- **Authentication**: passport.js with local strategy
- **Session**: express-session with connect-pg-simple
- **Payment Processing**: Stripe integration

### Development Dependencies

- **Testing**: Vitest for unit tests, Playwright for E2E tests
- **Build Tools**: Vite, esbuild, TypeScript
- **Code Quality**: ESLint, Prettier (inferred)

## Deployment Strategy

The application is configured for deployment on Replit, with:

1. **Build Process**:
   - Frontend: Vite builds static assets to dist/public
   - Backend: esbuild bundles server code to dist/

2. **Start Commands**:
   - Development: `tsx server/index.ts`
   - Production: `NODE_ENV=production node dist/index.js`

3. **Database Migrations**:
   - Drizzle Kit for schema migrations
   - Manual scripts for data migrations

4. **Environment Configuration**:
   - DATABASE_URL for database connection
   - SESSION_SECRET for session encryption
   - STRIPE_SECRET_KEY for payment processing

5. **CI/CD**:
   - Playwright tests for E2E validation
   - Database seeding for testing environments

## Performance Considerations

1. **Caching Strategy**:
   - Client-side caching of success factors in localStorage
   - Timestamps for cache invalidation

2. **API Optimization**:
   - Selective loading of project data
   - Pagination for large data sets (inferred)

3. **Frontend Performance**:
   - Code splitting by route (Vite default)
   - Optimized bundle size via external dependencies

## Security Considerations

1. **Authentication**:
   - Session-based auth with secure cookies
   - Password hashing with scrypt + salt
   - Timing-safe password comparison

2. **Authorization**:
   - Role-based access for organization resources
   - Project ownership validation
   - API endpoint protection with authentication middleware

3. **Data Protection**:
   - Input validation with zod schemas
   - SQL injection protection via ORM
   - CSRF protection (inferred)

## Future Extensibility

The architecture supports future extensibility through:

1. **Modular Components**:
   - Clear separation between frontend and backend
   - Services organized by domain
   - Component-based UI architecture

2. **API Design**:
   - RESTful endpoints that can be extended
   - Schema-driven data validation

3. **Database Schema**:
   - Relational design with clear entity relationships
   - UUID primary keys for global uniqueness
   - Extensible JSON fields for flexible data storage