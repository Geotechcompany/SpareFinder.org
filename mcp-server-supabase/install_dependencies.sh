#!/bin/bash

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print status messages
print_status() {
    echo -e "${YELLOW}$1${NC}"
}

# Function to print success messages
print_success() {
    echo -e "${GREEN}$1${NC}"
}

# Function to print error messages
print_error() {
    echo -e "${RED}$1${NC}"
}

# Check if Node.js is installed
print_status "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js v16 or higher."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version)
print_status "Node.js version: $NODE_VERSION"

# Check if npm is installed
print_status "Checking npm installation..."
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    print_status "Creating .env file..."
    cat > .env << EOL
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_DATABASE_URL=postgresql://postgres:password@your-host:5432/postgres
EOL
    print_success ".env file created. Please update it with your Supabase credentials."
fi

# Install dependencies
print_status "Installing project dependencies..."
npm install

# Install Supabase CLI globally (optional)
print_status "Installing Supabase CLI globally..."
npm install -g supabase-cli

# Create migrations directory if it doesn't exist
mkdir -p migrations

# Print completion message
print_success "🎉 SpareFinderAI Database Migration Setup Complete!"
print_status "Next steps:"
print_status "1. Update .env with your Supabase credentials"
print_status "2. Run 'npm run migrate' to apply migrations"

exit 0 