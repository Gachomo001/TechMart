#!/bin/bash

# TechMart M-Pesa Deployment Script
# This script helps deploy the M-Pesa integration to production

set -e  # Exit on any error

echo "🚀 TechMart M-Pesa Deployment"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Supabase CLI is installed
check_supabase_cli() {
    if ! command -v supabase &> /dev/null; then
        print_error "Supabase CLI is not installed. Please install it first:"
        echo "npm install -g supabase"
        exit 1
    fi
    print_success "Supabase CLI is installed"
}

# Check if .env file exists
check_env_file() {
    if [ ! -f ".env" ]; then
        print_warning ".env file not found. Creating template..."
        cat > .env << EOF
# Development Mode
VITE_NODE_ENV=development

# M-Pesa Configuration
VITE_MPESA_RECEIVER_NUMBER=your_mpesa_number

# App Configuration
VITE_APP_URL=http://localhost:5173
EOF
        print_success "Created .env template. Please update with your M-Pesa number."
    else
        print_success ".env file found"
    fi
}

# Build for production
build_production() {
    print_status "Building for production..."
    npm run build
    print_success "Production build completed"
}

# Test the integration
test_integration() {
    print_status "Testing integration..."
    
    # Start development server
    print_status "Starting development server..."
    npm run dev &
    DEV_PID=$!
    
    # Wait for server to start
    sleep 5
    
    print_success "Development server started at http://localhost:5173"
    print_status "Please test the following:"
    echo "1. Visit http://localhost:5173"
    echo "2. Add items to cart"
    echo "3. Go through checkout"
    echo "4. Test M-Pesa payments"
    echo "5. Verify payment callbacks work"
    
    # Keep server running
    wait $DEV_PID
}

# Main deployment function
main() {
    case "$1" in
        "dev")
            print_status "Setting up development environment..."
            check_supabase_cli
            check_env_file
            test_integration
            ;;
        "prod")
            print_status "Setting up production environment..."
            check_supabase_cli
            check_env_file
            build_production
            print_success "Production setup completed!"
            print_status "Next steps:"
            echo "1. Update .env.production with production M-Pesa number"
            echo "2. Deploy to your hosting platform"
            ;;
        "test")
            test_integration
            ;;
        *)
            echo "Usage: $0 {dev|prod|test}"
            echo ""
            echo "Commands:"
            echo "  dev    - Set up development environment"
            echo "  prod   - Set up production environment"
            echo "  test   - Test the integration"
            echo ""
            echo "Examples:"
            echo "  $0 dev    # Set up development environment"
            echo "  $0 prod   # Set up production environment"
            echo "  $0 test   # Test the integration"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@" 