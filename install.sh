#!/bin/bash
set -euo pipefail

echo "========================================="
echo "  ScriptGPT Installer"
echo "========================================="
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

check_prerequisites() {
    echo -e "${BLUE}Checking prerequisites...${NC}"
    
    if ! command -v node &> /dev/null; then
        echo -e "${RED}Node.js is not installed.${NC}"
        echo "Please install Node.js 18+: https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        echo -e "${RED}Node.js 18+ is required. Current: $(node -v)${NC}"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}npm is not installed.${NC}"
        exit 1
    fi
    
    if ! command -v psql &> /dev/null; then
        echo -e "${YELLOW}PostgreSQL client (psql) not found.${NC}"
        echo "Make sure PostgreSQL is installed and running."
        echo "You can use: brew install postgresql (macOS) or apt install postgresql (Linux)"
    fi
    
    echo -e "${GREEN}Node.js $(node -v) and npm found.${NC}"
}

setup_env() {
    echo ""
    echo -e "${BLUE}Setting up environment...${NC}"
    
    if [ ! -f .env ]; then
        cp .env.example .env
        
        JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | xxd -p | tr -d '\n')
        
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/your-secret-jwt-key-change-this/$JWT_SECRET/" .env
        else
            sed -i "s/your-secret-jwt-key-change-this/$JWT_SECRET/" .env
        fi
        
        echo -e "${GREEN}Created .env with secure JWT secret.${NC}"
    else
        echo -e "${YELLOW}.env already exists. Skipping.${NC}"
    fi
}

setup_database() {
    echo ""
    echo -e "${BLUE}Database Setup${NC}"
    echo "You need a PostgreSQL database running."
    echo "Options:"
    echo "  1. Local PostgreSQL"
    echo "  2. Neon (https://neon.tech) - Free tier"
    echo "  3. Supabase (https://supabase.com) - Free tier"
    echo ""
    read -p "Enter your PostgreSQL DATABASE_URL: " DB_URL
    
    if [ -n "$DB_URL" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|DATABASE_URL=.*|DATABASE_URL=\"$DB_URL\"|" .env
        else
            sed -i "s|DATABASE_URL=.*|DATABASE_URL=\"$DB_URL\"|" .env
        fi
        echo -e "${GREEN}Database URL configured.${NC}"
    fi
}

setup_gemini() {
    echo ""
    echo -e "${BLUE}ScriptGPT AI Configuration${NC}"
    echo "Get your Gemini API key from: https://aistudio.google.com/apikey"
    echo ""
    read -p "Enter your Gemini API key (or press Enter to skip): " GEMINI_KEY
    
    if [ -n "$GEMINI_KEY" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/ADMIN_GEMINI_KEY=/ADMIN_GEMINI_KEY=$GEMINI_KEY/" .env
        else
            sed -i "s/ADMIN_GEMINI_KEY=/ADMIN_GEMINI_KEY=$GEMINI_KEY/" .env
        fi
        echo -e "${GREEN}Gemini API key configured.${NC}"
    else
        echo -e "${YELLOW}Skipped. Configure later in Admin Panel.${NC}"
    fi
}

install_dependencies() {
    echo ""
    echo -e "${BLUE}Installing dependencies...${NC}"
    
    echo -e "${BLUE}Installing root dependencies...${NC}"
    npm install
    
    echo -e "${BLUE}Installing API dependencies...${NC}"
    cd api && npm install && cd ..
    
    echo -e "${BLUE}Installing client dependencies...${NC}"
    cd client && npm install && cd ..
    
    echo -e "${GREEN}Dependencies installed.${NC}"
}

setup_database_schema() {
    echo ""
    echo -e "${BLUE}Setting up database schema...${NC}"
    
    cd api
    npx prisma generate
    npx prisma db push
    npx tsx src/utils/seed.ts
    cd ..
    
    echo -e "${GREEN}Database schema created and seeded.${NC}"
}

print_summary() {
    echo ""
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}  ScriptGPT is ready!${NC}"
    echo -e "${GREEN}=========================================${NC}"
    echo ""
    echo -e "${BLUE}Start development:${NC}"
    echo "  npm run dev"
    echo ""
    echo -e "${BLUE}Or start separately:${NC}"
    echo "  npm run dev:server   # API on port 3001"
    echo "  npm run dev:client   # Frontend on port 5173"
    echo ""
    echo -e "${BLUE}Default Admin Account:${NC}"
    echo "  Email:    admin@scriptgpt.com"
    echo "  Password: admin123"
    echo ""
    echo -e "${YELLOW}IMPORTANT: Change the admin password after first login!${NC}"
    echo ""
    echo -e "${BLUE}Deploy to Vercel:${NC}"
    echo "  1. Push to GitHub"
    echo "  2. Import project at https://vercel.com"
    echo "  3. Set environment variables in Vercel dashboard"
    echo ""
}

check_prerequisites
setup_env
setup_database
setup_gemini
install_dependencies
setup_database_schema
print_summary
