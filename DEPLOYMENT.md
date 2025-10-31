# Worker App Deployment Guide

## Prerequisites

1. **Install PM2 globally** (if not already installed):
```bash
npm install -g pm2
```

2. **Install dependencies**:
```bash
npm install
```

3. **Build the application**:
```bash
npm run build
```

## PM2 Deployment Commands

### Initial Setup

1. **Start the application**:
```bash
pm2 start ecosystem.config.js --env production
```

2. **Save PM2 configuration** (to restart on server reboot):
```bash
pm2 save
pm2 startup
# Follow the instructions printed by the command above
```

### Daily Operations

**View application status**:
```bash
pm2 status
pm2 list
```

**View logs**:
```bash
pm2 logs worker-app          # View real-time logs
pm2 logs worker-app --lines 100  # View last 100 lines
pm2 logs worker-app --err    # View only errors
```

**Restart application**:
```bash
pm2 restart worker-app
```

**Stop application**:
```bash
pm2 stop worker-app
```

**Delete from PM2**:
```bash
pm2 delete worker-app
```

**Monitor resource usage**:
```bash
pm2 monit
```

### Update Deployment

When you have new code to deploy:

```bash
# 1. Pull latest code
git pull origin 003-worker-progress-tracking

# 2. Install new dependencies (if any)
npm install

# 3. Build the application
npm run build

# 4. Restart with PM2
pm2 restart worker-app

# 5. Check status
pm2 status
pm2 logs worker-app --lines 50
```

### Quick Update Script

Create `deploy.sh` in project root:

```bash
#!/bin/bash
echo "🚀 Deploying Worker App..."

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin 003-worker-progress-tracking

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build application
echo "🔨 Building application..."
npm run build

# Restart with PM2
echo "♻️  Restarting application..."
pm2 restart worker-app

# Show status
echo "✅ Deployment complete!"
pm2 status
pm2 logs worker-app --lines 20
```

Make it executable:
```bash
chmod +x deploy.sh
```

Then deploy with:
```bash
./deploy.sh
```

## Environment Variables

Make sure to set up environment variables before starting:

Create `.env.local` file:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
NEXT_PUBLIC_ADMIN_API_URL=http://localhost:3000
```

## Troubleshooting

**Application won't start:**
```bash
pm2 logs worker-app --err
pm2 describe worker-app
```

**Port already in use:**
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9
# Or use fuser
fuser -k 3001/tcp
```

**Check PM2 is running on startup:**
```bash
pm2 startup
pm2 save
```

**Reset PM2 if issues:**
```bash
pm2 kill
pm2 resurrect
```

## Advanced Configuration

### Multiple Instances (Load Balancing)

Edit `ecosystem.config.js`:
```javascript
instances: 2,  // Change from 1 to 2 or more
exec_mode: 'cluster',  // Change from 'fork' to 'cluster'
```

### Auto-restart on file changes (Development)

```bash
pm2 start ecosystem.config.js --watch
```

### Memory monitoring

```bash
pm2 start ecosystem.config.js --max-memory-restart 500M
```

## Monitoring

**PM2 Web Dashboard** (optional):
```bash
pm2 install pm2-server-monit
```

**PM2 Plus** (optional, requires account):
```bash
pm2 link <secret_key> <public_key>
```

## Backup Strategy

Before deploying:
```bash
# Backup current version
cp -r /path/to/worker-app /path/to/worker-app-backup-$(date +%Y%m%d)

# Or use git
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

## Rollback

If deployment fails:
```bash
# Rollback to previous version
git log --oneline -5  # Find previous commit
git checkout <previous-commit-hash>
npm install
npm run build
pm2 restart worker-app
```

Or restore from backup:
```bash
cd /path/to/parent-directory
rm -rf worker-app
cp -r worker-app-backup-20241031 worker-app
cd worker-app
pm2 restart worker-app
```
