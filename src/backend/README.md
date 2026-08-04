# TP Sync Backend API

## Overview

This is the .NET 8.0 backend API server for the TP Sync (Trading Partners Sync) feature. It provides REST endpoints to synchronize trading partner data between IRIS instances.

## Files

- **Program.cs** (~1891 lines) - Complete API server with all endpoints and the `IrisSyncService` utility class
- **TpManageSync.Api.csproj** - .NET project configuration

## Building

```bash
dotnet build
```

## Running

```bash
# Default (port 3100)
dotnet run

# Custom port
set API_PORT=5000
dotnet run

# With custom namespace
set IRIS_NAMESPACE=CUSTOM_NS
set IRIS_DEST_NAMESPACE=CUSTOM_DEST
dotnet run
```

## Environment Variables

- `API_PORT` - Server port (default: 3100)
- `IRIS_NAMESPACE` - Source IRIS namespace (default: EDIPAYER)
- `IRIS_DEST_NAMESPACE` - Destination IRIS namespace (default: MISC)
- `IRIS_CONNECT_TIMEOUT_MS` - Connection timeout in milliseconds (default: 15000)

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/connect` - Connect and query trading partners
- `POST /api/connect-status` - Check connection status (acquires lock)
- `POST /api/disconnect` - Release lock on disconnect
- `POST /api/tpids` - Query trading partner IDs
- `POST /api/tradelinks` - Query trade links
- `POST /api/transactiontypes` - Query transaction types
- `POST /api/sync-baseline` - Get baseline sync timestamps
- `POST /api/sync-last-run` - Execute sync

## Features

- Single-user concurrency control (prevents simultaneous connections)
- IRIS connection pooling
- Static file serving (Angular app from wwwroot)
- CORS enabled
- Timezone-aware sync filtering
- Comprehensive error handling
