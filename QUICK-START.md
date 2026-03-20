# TP Manage Sync - Quick Start Guide

## Easiest Way to Test Locally

### Option 1: Start Everything with One Command (Recommended)

From the X12-UI directory, run:

```powershell
cd C:\GitHub\X12-UI
.\start-dev.ps1
```

This will:
1. ✅ Start .NET backend in a new window on `http://localhost:3100`
2. ✅ Start Angular frontend in a new window on `http://localhost:4200`
3. ✅ Automatically open your browser to `http://localhost:4200`

**That's it!** Both services will start in separate windows.

---

## Manual Start (If Needed)

### Terminal 1 - Start Backend First
```powershell
cd C:\GitHub\X12-UI\scripts
.\start-backend.ps1
```
Wait for: `Now listening on: http://localhost:3100`

### Terminal 2 - Start Frontend
```powershell
cd C:\GitHub\X12-UI\scripts
.\start-frontend.ps1
```
Wait for: `✔ Compiled successfully` 

### Terminal 3 - Access Application
```powershell
start http://localhost:4200
```

---

## Testing TP Manage Sync

Once both services are running:

1. **Login** to X12-UI with your credentials
2. **Navigate** to: **Utilities → TP Sync**
3. **You should see** the TP Manage Sync connect page with:
   - Source Server:Port (default: `lp-itfdevvp2:6973`)
   - Source Namespace (default: `EDIPAYER`)
   - Destination Server:Port (default: `lp-itfdevvp1:6972`)
   - Destination Namespace (default: `MISC`)
4. **Click Connect** to fetch trading partner data
5. **Select rows** and perform sync operations

---

## Available Launcher Scripts

| Script | Purpose |
|--------|---------|
| `start-dev.ps1` | Start both backend + frontend together (recommended) |
| `scripts/start-backend.ps1` | Start only .NET backend |
| `scripts/start-frontend.ps1` | Start only Angular frontend |

---

## Command Options

### Start Backend Only
```powershell
.\start-dev.ps1 -BackendOnly
```

### Start Frontend Only
```powershell
.\start-dev.ps1 -FrontendOnly
```

### Start Both (Default)
```powershell
.\start-dev.ps1
```

---

## Troubleshooting

### Error: "Cannot find .NET"
- Install .NET SDK: https://dotnet.microsoft.com/
- Verify: `dotnet --version`

### Error: "ng command not found"
- Install dependencies: `npm install`
- Install Angular CLI: `npm install -g @angular/cli`
- Verify: `ng version`

### Port 3100 Already in Use
- Check: `netstat -ano | findstr :3100`
- Kill process: `taskkill /PID <PID> /F`
- Or change port via environment variable: `$env:API_PORT = "3101"`

### Port 4200 Already in Use
- Use alternate port: `ng serve --port 4201`

### Backend Won't Connect to IRIS
- Verify IRIS database is running
- Check connection settings match your environment
- See IRIS_NAMESPACE, IRIS_DEST_NAMESPACE environment variables

### "Cannot reach API" Error in UI
- Ensure backend is actually running on `http://localhost:3100`
- Check backend window for errors
- Try accessing `http://localhost:3100/api/health` in browser

---

## Production Deployment

When ready to deploy to a server, see: [INTEGRATED-DEPLOYMENT.md](./INTEGRATED-DEPLOYMENT.md)

---

## Project Structure

```
C:\GitHub\X12-UI/
├── start-dev.ps1                    ← Run this!
├── scripts/
│   ├── start-backend.ps1            ← Backend only
│   └── start-frontend.ps1           ← Frontend only
├── src/app/tp-manage-sync/          ← TP Sync components
├── build-integrated.ps1             ← For production builds
└── INTEGRATED-DEPLOYMENT.md         ← Server deployment guide
```

---

## Next Steps

1. **Run:** `.\start-dev.ps1` from X12-UI folder
2. **Wait:** For both windows to fully start
3. **Use:** Navigate to Utilities → TP Sync
4. **Configure:** Set your server endpoints
5. **Connect:** Click Connect and start syncing!

---

**Questions?** Check the main repository README or INTEGRATED-DEPLOYMENT.md for more details.
