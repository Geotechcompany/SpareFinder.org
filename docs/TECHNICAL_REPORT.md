# SpareFinder.org - Comprehensive Technical Report

**Project:** SpareFinder - AI-Powered Industrial Spare Parts Identification Platform  
**Client:** GeoTech Company  
**Report Date:** January 2025  
**Status:** Production Ready

---

## Executive Summary

SpareFinder.org is a modern, full-stack SaaS platform that leverages artificial intelligence to identify and analyze industrial spare parts from uploaded images. The system combines multiple AI technologies, real-time web scraping, and comprehensive analysis capabilities to provide users with detailed part information, specifications, and supplier contacts.

---

## 1. Programming Languages

### Primary Languages

| Language | Usage | Version | Purpose |
|----------|-------|---------|---------|
| **TypeScript** | Frontend & Backend | 5.5.3 | Primary development language for type-safe code |
| **JavaScript** | Frontend & Backend | ES2020+ | Supporting scripts and configurations |
| **Python** | AI Service | 3.11 | AI analysis crew, image processing, and ML operations |
| **SQL** | Database | PostgreSQL 16 | Database schema, migrations, and queries |
| **HTML/CSS** | Frontend | HTML5/CSS3 | Markup and styling |

### Language Distribution
- **TypeScript/JavaScript**: ~85% (Frontend React app + Backend Express API)
- **Python**: ~12% (AI Analysis Crew service)
- **SQL**: ~3% (Database schemas and migrations)

---

## 2. Frontend Technology Stack

### Core Framework
- **React** 18.3.1 - Modern UI library with hooks and functional components
- **Vite** 5.4.19 - Next-generation build tool and development server
- **TypeScript** 5.5.3 - Type-safe JavaScript with enhanced developer experience

### UI Framework & Styling
- **Tailwind CSS** 3.4.11 - Utility-first CSS framework
- **shadcn/ui** - High-quality React component library built on Radix UI
- **Radix UI** - Unstyled, accessible component primitives
  - Accordion, Alert Dialog, Avatar, Checkbox, Dialog, Dropdown Menu
  - Hover Card, Label, Menubar, Navigation Menu, Popover, Progress
  - Radio Group, Scroll Area, Select, Separator, Slider, Switch
  - Tabs, Toast, Toggle, Tooltip
- **Framer Motion** 12.17.0 - Production-ready motion library for React
- **Lucide React** 0.462.0 - Beautiful icon library

### State Management & Data Fetching
- **React Query (TanStack Query)** 5.56.2 - Powerful data synchronization for React
- **React Context API** - Global state management (Auth, Theme, Subscription)
- **React Hook Form** 7.53.0 - Performant forms with easy validation
- **Zod** 3.23.8 - TypeScript-first schema validation

### Routing & Navigation
- **React Router DOM** 6.26.2 - Declarative routing for React applications

### Authentication
- **Clerk** 5.58.1 - Complete authentication and user management solution
- **Supabase Auth UI** 0.4.7 - Pre-built authentication components

### Data Visualization
- **Recharts** 2.15.3 - Composable charting library built on React components

### PDF Generation
- **jsPDF** 3.0.1 - Client-side PDF generation
- **html2canvas** 1.4.1 - Screenshot capture for PDF conversion

### Additional Libraries
- **Axios** 1.9.0 - HTTP client for API requests
- **date-fns** 3.6.0 - Modern JavaScript date utility library
- **uuid** 11.1.0 - UUID generation
- **react-markdown** 9.1.0 - Markdown renderer for React
- **remark-gfm** 4.0.1 - GitHub Flavored Markdown support
- **sonner** 1.7.4 - Toast notifications
- **next-themes** 0.3.0 - Theme switching (light/dark mode)

### 3D Graphics (Optional)
- **Three.js** 0.180.0 - 3D graphics library
- **@react-three/fiber** 8.18.0 - React renderer for Three.js
- **ogl** 1.0.11 - Minimal WebGL library

### Development Tools
- **ESLint** 9.9.0 - Code linting and quality assurance
- **Jest** 30.0.4 - JavaScript testing framework
- **TypeScript ESLint** 8.0.1 - TypeScript-specific linting rules
- **PostCSS** 8.4.47 - CSS transformation tool
- **Autoprefixer** 10.4.20 - CSS vendor prefixing

---

## 3. Backend Technology Stack

### Core Framework
- **Node.js** 18+ - JavaScript runtime environment
- **Express.js** 4.18.2 - Fast, unopinionated web framework
- **TypeScript** 5.3.3 - Type-safe backend development

### Database & ORM
- **Supabase** 2.89.0 - Open-source Firebase alternative
  - PostgreSQL database (hosted)
  - Real-time subscriptions
  - Row Level Security (RLS)
  - Storage buckets for file uploads
  - Authentication integration

### Authentication & Security
- **Clerk** - Primary authentication provider
- **JWT (jsonwebtoken)** 9.0.2 - JSON Web Token implementation
- **JOSE** 6.1.0 - JavaScript Object Signing and Encryption
- **bcryptjs** 2.4.3 - Password hashing
- **Helmet** 7.1.0 - Security headers middleware
- **CORS** 2.8.5 - Cross-Origin Resource Sharing

### File Processing
- **Multer** 1.4.5-lts.1 - Multipart/form-data handling for file uploads
- **Sharp** 0.32.6 - High-performance image processing
- **Form-Data** 4.0.3 - Form data encoding

### Payment Processing
- **Stripe** 18.3.0 - Payment processing and subscription management

### Email Services
- **Nodemailer** 6.9.13 - Email sending library
- **SMTP Integration** - Gmail and Hostinger SMTP support

### Validation & Utilities
- **Zod** 4.0.0 - Schema validation
- **Express Validator** 7.0.1 - Request validation middleware
- **UUID** 9.0.1 - Unique identifier generation

### Logging & Monitoring
- **Winston** 3.17.0 - Logging library
- **Morgan** 1.10.0 - HTTP request logger middleware

### Performance
- **Compression** 1.7.4 - Response compression middleware

### Development Tools
- **tsx** 4.6.2 - TypeScript execution for Node.js
- **ESLint** 8.56.0 - Code linting
- **Jest** 29.7.0 - Testing framework

---

## 4. AI & Machine Learning Stack

### AI Framework
- **CrewAI** 0.80.0 - Multi-agent AI framework for collaborative AI agents
- **CrewAI Tools** 0.14.0 - Additional tools and utilities for CrewAI

### AI Models & APIs
- **OpenAI GPT-4o** - Advanced vision model for image analysis
- **OpenAI API Client** 1.99.6 - Official OpenAI Python SDK
- **LangChain OpenAI** 0.2.14 - LangChain integration for OpenAI models
- **Anthropic Claude** 0.52.1 - Alternative AI model via Anthropic API
- **Google GenAI** 1.55.0 - Google's generative AI models
- **LiteLLM** 1.74.15 - Unified interface for multiple LLM providers

### AI Service Framework
- **FastAPI** 0.115.0 - Modern, fast web framework for building APIs
- **Uvicorn** 0.30.3 - Lightning-fast ASGI server
- **WebSockets** 14.2 - Real-time bidirectional communication

### Image Processing
- **Pillow (PIL)** 10.1.0 - Python Imaging Library for image manipulation
- **ReportLab** 4.0.7 - PDF generation library

### AI Agent Architecture
The system implements a multi-agent AI crew with specialized roles:
1. **Image Analysis Agent** - GPT-4o Vision for visual part identification
2. **Part Identifier Agent** - Manufacturer and part number identification
3. **Technical Research Agent** - Specifications and technical details
4. **Supplier Finder Agent** - Supplier discovery and contact information
5. **Report Generator Agent** - Comprehensive PDF report creation
6. **Email Agent** - Automated email delivery system

---

## 5. Database & Storage

### Primary Database
- **PostgreSQL** 16 - Advanced open-source relational database
- **Supabase PostgreSQL** - Managed PostgreSQL instance with:
  - Row Level Security (RLS) policies
  - Real-time subscriptions
  - Automatic backups
  - Connection pooling

### Database Features
- **Row Level Security (RLS)** - Fine-grained access control
- **Real-time Subscriptions** - Live data updates via WebSockets
- **PostgREST** 2.25.1 - RESTful API auto-generation from PostgreSQL

### Storage
- **Supabase Storage** - Object storage for:
  - User-uploaded images
  - Generated PDF reports
  - Analysis results
- **S3-Compatible API** - Supabase storage uses S3-compatible interface

### Database Tools
- **SQL Migrations** - Version-controlled schema changes
- **Database Logging Service** - Custom service for audit trails

---

## 6. External Services & APIs

### Authentication Services
- **Clerk** - Complete authentication platform
  - User management
  - Social login (Google, GitHub)
  - Session management
  - Multi-factor authentication support

### Payment Services
- **Stripe** - Payment processing
  - Subscription management
  - Webhook handling
  - Payment method management
  - Invoice generation

### Cloud Services
- **Supabase** - Backend-as-a-Service
  - Database hosting
  - Authentication
  - Storage
  - Real-time features

### Email Services
- **Gmail SMTP** - Email delivery for reports
- **Hostinger SMTP** - Alternative email service
- **Nodemailer** - Email sending infrastructure

### AI Services
- **OpenAI API** - GPT-4o Vision for image analysis
- **Anthropic API** - Claude model access
- **Google GenAI** - Google's generative AI

---

## 7. Development & Build Tools

### Build Tools
- **Vite** 5.4.19 - Frontend build tool and dev server
- **TypeScript Compiler** - Type checking and compilation
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixing

### Package Managers
- **npm** - Node Package Manager
- **pip** - Python Package Installer

### Code Quality
- **ESLint** - JavaScript/TypeScript linting
- **TypeScript ESLint** - TypeScript-specific linting
- **Prettier** (implicit) - Code formatting

### Testing
- **Jest** 30.0.4 - JavaScript testing framework
- **ts-jest** 29.4.0 - TypeScript preprocessor for Jest

### Version Control
- **Git** - Distributed version control system

---

## 8. Deployment & Infrastructure

### Frontend Deployment
- **Netlify** - Static site hosting and CDN
  - Automatic deployments from Git
  - Edge functions support
  - Custom domain (sparefinder.org)
  - SSL/TLS certificates

### Backend Deployment
- **Render** - Cloud platform for backend services
  - Node.js runtime
  - Automatic scaling
  - Health checks
  - Environment variable management

### AI Service Deployment
- **Render** - Docker container deployment
  - Python 3.11 runtime
  - Docker containerization
  - Health monitoring
  - Auto-scaling capabilities

### Containerization
- **Docker** - Container platform
  - Multi-stage builds
  - Optimized images
  - Health checks
- **Docker Compose** - Multi-container orchestration

### Infrastructure Configuration
- **render.yaml** - Render platform configuration
- **netlify.toml** - Netlify deployment configuration
- **Dockerfile** (multiple) - Container definitions

### Environment Management
- **Environment Variables** - Secure configuration management
- **.env files** - Local development configuration
- **Platform-specific env vars** - Production environment settings

---

## 9. Architecture Patterns

### Frontend Architecture
- **Component-Based Architecture** - Modular React components
- **Context API Pattern** - Global state management
- **Custom Hooks** - Reusable logic ex