# DEX - Shito Ryu Karate Tournament Manager

## Overview

DEX is a comprehensive tournament management application specifically designed for Shito Ryu Karate competitions, supporting both kumite (sparring) and kata (forms) tournaments. The system enables tournament organizers to create and manage knockout-style tournaments with 2-128 participants.

**Kumite (Sparring) Features:**
- Authentic karate scoring: ippon, wazari, yuko with point values
- Warning system with automatic elimination at 5 warnings
- Senshu (first point advantage) for tie-breaking with mutual exclusion logic
- Customizable rounds (1-20) with timer presets and sound alerts
- Belt color identification (red/blue) for each match
- Decrement buttons for score adjustments

**Kata (Forms) Features:**
- 5-judge scoring system following standard kata rules
- Automatic score calculation (drops highest and lowest, sums middle three)
- Visual score breakdown showing which scores are dropped
- Clear winner determination based on final scores

The application provides a streamlined interface for tournament setup with flexible player counts, type selection (kumite/kata), player registration with automatic belt color assignment, bracket visualization, and real-time match management with professional karate scoring and elimination rules.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development practices
- **Routing**: Wouter for lightweight client-side routing with three main pages (setup, bracket, timer)
- **UI Framework**: shadcn/ui components built on Radix UI primitives for accessible, customizable components
- **Styling**: Tailwind CSS with custom CSS variables for consistent theming and responsive design
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js for RESTful API endpoints
- **Language**: TypeScript throughout for type consistency between frontend and backend
- **Storage**: In-memory storage implementation with interface for future database integration
- **API Structure**: RESTful endpoints for tournaments, players, and matches with proper HTTP status codes
- **Development**: Hot module replacement and development middleware integration

### Data Storage Solutions
- **Current**: In-memory storage using Maps for tournaments, players, and matches
- **Planned**: PostgreSQL database integration with Drizzle ORM for production use
- **Schema**: Well-defined TypeScript interfaces with Zod validation schemas
- **Migration**: Drizzle-kit configured for database migrations and schema management

### Authentication and Authorization
- **Current**: No authentication system implemented (tournament-focused application)
- **Session**: Basic session support configured for future user management
- **Security**: Input validation using Zod schemas to prevent malformed data

### External Dependencies
- **Database**: Neon PostgreSQL (configured but not actively used)
- **Validation**: Zod for runtime type checking and API validation
- **UI Components**: Extensive Radix UI component library for accessibility
- **Development**: Replit-specific plugins for enhanced development experience
- **Icons**: Font Awesome and Lucide React for consistent iconography

The architecture follows a clean separation of concerns with shared TypeScript types between client and server, ensuring type safety across the full stack. The modular design allows for easy feature extension and maintenance while providing a responsive, accessible user interface optimized for tournament management workflows.