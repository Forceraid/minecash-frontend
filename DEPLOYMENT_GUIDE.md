# MineCash Deployment Guide

## 🚀 Complete Project Deployment

### Prerequisites
- GitHub repository connected
- Supabase project set up
- Discord bot token ready

---

## Step 1: Deploy Backend Server

### Option A: Railway (Recommended)
1. Go to [Railway.app](https://railway.app)
2. Connect your GitHub repository
3. Select the `backend` folder
4. Set environment variables:
   ```
   SUPABASE_URL=https://avpgfvdloupgfckpqxuq.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   PORT=3000
   ```
5. Deploy and note the URL (e.g., `https://minecash-backend.railway.app`)

### Option B: Render
1. Go to [Render.com](https://render.com)
2. Create new Web Service
3. Connect GitHub repository
4. Set build command: `npm install`
5. Set start command: `npm start`
6. Set environment variables (same as above)

---

## Step 2: Deploy Frontend to Vercel

1. Go to [Vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Set environment variables:
   ```
   VITE_SUPABASE_URL=https://avpgfvdloupgfckpqxuq.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key
   VITE_WEBSOCKET_URL=wss://your-backend-domain.railway.app
   ```
4. Deploy

---

## Step 3: Update Supabase Environment Variables

1. Go to your Supabase dashboard
2. Navigate to Settings > API
3. Set environment variables:
   ```
   DISCORD_BOT_URL=https://minecash-discord-bot.onrender.com
   DISCORD_BOT_SECRET=your_discord_bot_secret
   ```

---

## Step 4: Test Everything

### Frontend Tests
- [ ] Discord login works
- [ ] User profile loads
- [ ] GC balance displays
- [ ] Support ticket creation works
- [ ] Casino games load (even if backend not fully implemented)

### Backend Tests
- [ ] WebSocket connection works
- [ ] API endpoints respond
- [ ] Database connections work
- [ ] Real-time features function

### Discord Bot Tests
- [ ] Ticket creation works
- [ ] User checking works
- [ ] Admin commands work

---

## Environment Variables Reference

### Frontend (Vercel)
```
VITE_SUPABASE_URL=https://avpgfvdloupgfckpqxuq.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_WEBSOCKET_URL=wss://your-backend-domain.railway.app
```

### Backend (Railway/Render)
```
SUPABASE_URL=https://avpgfvdloupgfckpqxuq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
PORT=3000
```

### Supabase Edge Functions
```
DISCORD_BOT_URL=https://minecash-discord-bot.onrender.com
DISCORD_BOT_SECRET=your_discord_bot_secret
```

---

## Post-Deployment Checklist

- [ ] All environment variables set
- [ ] Frontend loads without errors
- [ ] Discord authentication works
- [ ] WebSocket connections establish
- [ ] Database operations work
- [ ] Discord bot responds
- [ ] Support tickets create successfully
- [ ] Admin dashboard accessible (if admin user)

---

## Troubleshooting

### Common Issues:
1. **WebSocket Connection Failed**: Check `VITE_WEBSOCKET_URL` environment variable
2. **Discord Login Issues**: Verify Discord OAuth2 app settings
3. **Database Errors**: Check Supabase environment variables
4. **CORS Errors**: Ensure backend CORS settings include your frontend domain

### Support:
- Check Vercel/Railway/Render logs for errors
- Verify all environment variables are set correctly
- Test each service individually before full integration 