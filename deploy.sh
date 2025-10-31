#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Worker App Deployment Script${NC}"
echo "=================================="
echo ""

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}❌ PM2 is not installed!${NC}"
    echo "Install it with: npm install -g pm2"
    exit 1
fi

# Pull latest code
echo -e "${YELLOW}📥 Step 1/5: Pulling latest code...${NC}"
git pull origin 003-worker-progress-tracking
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Git pull failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Code updated${NC}"
echo ""

# Install dependencies
echo -e "${YELLOW}📦 Step 2/5: Installing dependencies...${NC}"
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ npm install failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Build application
echo -e "${YELLOW}🔨 Step 3/5: Building application...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Build successful${NC}"
echo ""

# Check if app is running
echo -e "${YELLOW}🔍 Step 4/5: Checking PM2 status...${NC}"
pm2 describe worker-app > /dev/null 2>&1

if [ $? -eq 0 ]; then
    # App exists, restart it
    echo "Found running application, restarting..."
    pm2 restart worker-app
else
    # App doesn't exist, start it
    echo "Application not found, starting for first time..."
    pm2 start ecosystem.config.js --env production
    pm2 save
fi

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ PM2 operation failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Application restarted${NC}"
echo ""

# Show status
echo -e "${YELLOW}📊 Step 5/5: Checking status...${NC}"
pm2 status worker-app
echo ""

# Show recent logs
echo -e "${BLUE}📝 Recent logs (last 20 lines):${NC}"
pm2 logs worker-app --lines 20 --nostream

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "${BLUE}📱 Application running on: http://localhost:3001${NC}"
echo ""
echo "Useful commands:"
echo "  pm2 logs worker-app       - View logs"
echo "  pm2 monit                 - Monitor resources"
echo "  pm2 restart worker-app    - Restart app"
echo "  pm2 stop worker-app       - Stop app"
