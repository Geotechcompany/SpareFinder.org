#!/bin/bash

# Setup Email Notifications for SpareFinder AI
# This script helps configure email notifications after successful part analysis

echo "🚀 Setting up Email Notifications for SpareFinder AI"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if we're in the correct directory
if [ ! -f "package.json" ] || [ ! -d "backend" ]; then
    print_error "Please run this script from the root of your SpareFinder AI project"
    exit 1
fi

print_step "1. Installing Node.js dependencies..."

# Install backend dependencies
cd backend
if [ ! -f "package.json" ]; then
    print_error "Backend package.json not found"
    exit 1
fi

npm install
if [ $? -eq 0 ]; then
    print_status "Backend dependencies installed successfully"
else
    print_error "Failed to install backend dependencies"
    exit 1
fi

cd ..

print_step "2. Checking environment configuration..."

# Check if .env file exists
if [ ! -f "backend/.env" ]; then
    print_warning "Backend .env file not found. Creating from template..."
    cp env.template backend/.env
    print_status "Created backend/.env from template"
fi

print_step "3. Database migration for email templates..."

print_status "📧 Email template migration file created at:"
print_status "   backend/database/migrations/008_add_analysis_complete_email_template.sql"
echo
print_warning "⚠️  MANUAL STEP REQUIRED:"
echo "   1. Go to your Supabase Dashboard"
echo "   2. Open SQL Editor"
echo "   3. Run the migration file above"
echo

print_step "4. SMTP Configuration Required"
echo
print_warning "🔧 You need to configure SMTP settings in backend/.env:"
echo
echo "Required environment variables:"
echo "  SMTP_HOST=smtp.gmail.com"
echo "  SMTP_PORT=587"
echo "  SMTP_USER=your-email@gmail.com"
echo "  SMTP_PASS=your-app-password"
echo "  SMTP_SECURE=false"
echo "  FRONTEND_URL=http://localhost:5173"
echo

print_step "5. Gmail Setup Instructions (if using Gmail)"
echo
echo "For Gmail SMTP:"
echo "  1. Enable 2-Factor Authentication on your Google account"
echo "  2. Go to Google Account Settings → Security → App passwords"
echo "  3. Generate an app password for 'Mail'"
echo "  4. Use the app password as SMTP_PASS (not your regular password)"
echo

print_step "6. Testing Email Configuration"
echo
echo "After configuring SMTP settings:"
echo "  1. Start your backend server: cd backend && npm run dev"
echo "  2. Upload an image for analysis"
echo "  3. Check your email for the analysis complete notification"
echo

print_step "7. Admin Configuration"
echo
print_status "Email templates and system settings are managed through:"
echo "  • Admin Dashboard → Email SMTP Management"
echo "  • System Settings → Email Configuration"
echo "  • Database: email_templates table"
echo

print_status "✅ Email notifications setup complete!"
echo
print_warning "📋 Next Steps:"
echo "  1. Configure SMTP settings in backend/.env"
echo "  2. Run the database migration in Supabase"
echo "  3. Test email delivery with a part analysis"
echo "  4. Configure user notification preferences"
echo
print_status "📖 For detailed documentation, see: EMAIL_NOTIFICATIONS_IMPLEMENTATION.md"
echo

# Check if nodemailer is installed
if cd backend && npm list nodemailer > /dev/null 2>&1; then
    print_status "✅ nodemailer dependency is installed"
else
    print_warning "⚠️  nodemailer may not be installed. Run: cd backend && npm install"
fi

cd ..

echo
print_status "🎉 Setup completed! Check the documentation for configuration details." 