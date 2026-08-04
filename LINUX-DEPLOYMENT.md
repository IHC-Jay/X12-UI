# Linux Deployment Guide (X12-UI + TP Sync API)

This guide deploys:
- Angular SH app on `:8080`
- Angular RCO app on `:8082`
- .NET TP Sync API on `:3100`
- NGINX reverse proxy from `/api/*` to `http://127.0.0.1:3100/api/*`

## 1) Prerequisites

- Ubuntu/Debian/RHEL-style Linux host
- Node.js + npm
- .NET 9 runtime (or SDK)
- NGINX
- Repo checked out

## 2) Build frontend + backend

From repo root:

```bash
npm ci
npm run build:all
dotnet publish ./src/backend/TpManageSync.Api.csproj -c Release -o ./out/backend
```

## 3) Copy frontend artifacts

Example target layout:

```text
/var/www/x12/sh/browser
/var/www/x12/rco/browser
```

Copy files:

```bash
sudo mkdir -p /var/www/x12/sh/browser /var/www/x12/rco/browser
sudo rsync -a --delete ./dist/SH/browser/ /var/www/x12/sh/browser/
sudo rsync -a --delete ./dist/RCO/browser/ /var/www/x12/rco/browser/
```

## 4) Copy backend publish output

```bash
sudo mkdir -p /opt/x12/backend
sudo rsync -a --delete ./out/backend/ /opt/x12/backend/
```

## 5) Configure systemd service

- Copy [deploy/linux/tpmanagesync-api.service](deploy/linux/tpmanagesync-api.service) to `/etc/systemd/system/tpmanagesync-api.service`
- Update `ExecStart`/`WorkingDirectory` paths if needed

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable tpmanagesync-api
sudo systemctl restart tpmanagesync-api
sudo systemctl status tpmanagesync-api
```

Health check:

```bash
curl http://127.0.0.1:3100/api/health
```

## 6) Configure NGINX

- Copy [deploy/linux/nginx-x12-ui.conf](deploy/linux/nginx-x12-ui.conf) to `/etc/nginx/conf.d/x12-ui.conf`
- Adjust `root` paths if needed

Then:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 7) Validate

- SH: `http://<host>:8080/`
- RCO: `http://<host>:8082/`
- API health via SH/RCO path:
  - `http://<host>:8080/api/health`
  - `http://<host>:8082/api/health`

## 8) Optional one-command publish

Use [scripts/publish-linux.sh](scripts/publish-linux.sh):

```bash
chmod +x ./scripts/publish-linux.sh
./scripts/publish-linux.sh
```

It builds frontend/backend and copies to default Linux paths.
