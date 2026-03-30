# Production Environment Variables

**CRITICAL**: Set these environment variables in your production deployment (Vercel, Netlify, etc.)

## Required API Keys

### EIA API Key (Strategic Reserve Data)
```
EIA_API_KEY=VhDcsSa1FuMvhz8ZAG5yWQEnGy5xXadKrUOP2qYj
```
- **Source**: Already provided and working
- **Used for**: Strategic Petroleum Reserve real-time data
- **Status**: ✅ Active

### FRED API Key (Economic Indicators)  
```
FRED_API_KEY=61cf53e2891a727efe4e48f18f6545f2
```
- **Source**: Federal Reserve Economic Data (free)
- **Used for**: GDP, unemployment, inflation, treasury yields
- **Status**: ✅ Active

## Optional/Legacy Keys

### Database (if using)
```
DATABASE_URL=postgresql://...
JWT_SECRET=wildcatter-jwt-secret-change-in-production
```

### Alpha Vantage (if needed)
```
ALPHA_VANTAGE_API_KEY=N0MCU7BU2TGX0274
```

## Deployment Instructions

### Vercel
1. Go to project settings → Environment Variables
2. Add each key/value pair above
3. Deploy

### Other Platforms
1. Set environment variables in your platform's config
2. Ensure all keys are available at build time
3. Restart/redeploy after adding keys

## Error Handling
- Missing API keys will show "API UNAVAILABLE" in widgets
- No crashes or build failures if keys are missing
- Graceful degradation to empty states