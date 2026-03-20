using System.Collections.Concurrent;
using System.Data;
using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;
using InterSystems.Data.IRISClient;
using InterSystems.Data.IRISClient.ADO;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
    });
});

var app = builder.Build();
app.UseCors();

// Serve static files (Angular app) from wwwroot
app.UseDefaultFiles();
app.UseStaticFiles();

// Fallback to index.html for client-side routing
app.Use(async (context, next) =>
{
    await next();
    if (context.Response.StatusCode == 404 && !context.Request.Path.StartsWithSegments("/api"))
    {
        context.Request.Path = "/index.html";
        await next();
    }
});

var sourceNamespaceDefault = Environment.GetEnvironmentVariable("IRIS_NAMESPACE") ?? "EDIPAYER";
var destinationNamespaceDefault = Environment.GetEnvironmentVariable("IRIS_DEST_NAMESPACE") ?? "MISC";
var connectTimeoutMs = int.TryParse(Environment.GetEnvironmentVariable("IRIS_CONNECT_TIMEOUT_MS"), out var configuredTimeout)
    ? configuredTimeout
    : 15000;
var apiPort = int.TryParse(Environment.GetEnvironmentVariable("API_PORT"), out var configuredPort)
    ? configuredPort
    : 3100;

var syncConnectionRegistry = new ConcurrentDictionary<string, string>(StringComparer.Ordinal);

app.MapGet("/api/health", () =>
{
    return Results.Json(new
    {
        ok = true,
        status = "healthy",
        port = apiPort,
        utc = DateTime.UtcNow.ToString("O")
    });
});

app.MapPost("/api/connect", async (ApiRequest request) =>
{
    return await HandleIrisRequest(request, "/api/connect", sourceNamespaceDefault, destinationNamespaceDefault, connectTimeoutMs, async context =>
    {
        var sinceLastRunAt = string.IsNullOrWhiteSpace(request.SinceLastRunAt)
            ? IrisSyncService.GetTpSyncLastRunAtGlobal(context.DestinationSession, context.DestinationNamespace, "TradingPartner")
            : request.SinceLastRunAt;
        var sourceTimezoneOffsetMinutes = request.SourceTimezoneOffsetMinutes ?? 0;

        var query = await IrisSyncService.QueryTradingPartners(
            context.SourceSession,
            connectTimeoutMs,
            new ServerConnectionInfo(context.SourceTarget.Host, context.SourceTarget.Port, context.SourceNamespace),
            sinceLastRunAt,
            sourceTimezoneOffsetMinutes,
            request.SinceFilterMode);

        var syncAt = IrisSyncService.UpdateTpSyncTimeGlobal(context.SourceSession, context.SourceNamespace, "TradingPartner", context.SourceServerPortText, context.Username);
        var syncTime = IrisSyncService.GetTpSyncTimeGlobal(context.SourceSession) ?? syncAt;

        return Results.Json(new
        {
            ok = true,
            message = $"Connected to IRIS at {context.SourceTarget.Host}:{context.SourceTarget.Port} (namespace {context.SourceNamespace}). Retrieved {query.Rows.Count} row(s) from IHC_TPManage.TradingPartner.",
            syncTime,
            sqlUsed = query.SqlUsed,
            rows = query.Rows
        });
    });
});

app.MapPost("/api/connect-status", async (ApiRequest request) =>
{
    var syncLockKey = BuildSyncLockKey(request, sourceNamespaceDefault, destinationNamespaceDefault);
    if (string.IsNullOrWhiteSpace(syncLockKey) || string.IsNullOrWhiteSpace(request.Username))
    {
        return Results.Json(new
        {
            ok = false,
            message = "Username, source server:port, and destination server:port are required."
        }, statusCode: StatusCodes.Status400BadRequest);
    }

    if (!TryAcquireSyncLock(syncConnectionRegistry, syncLockKey, request.Username!, out var connectedUser))
    {
        return Results.Json(new
        {
            ok = false,
            message = "Another user is connected at this time",
            connectedUser
        }, statusCode: StatusCodes.Status409Conflict);
    }

    return await HandleIrisRequest(request, "/api/connect-status", sourceNamespaceDefault, destinationNamespaceDefault, connectTimeoutMs, context =>
    {
        var syncAt = IrisSyncService.UpdateTpSyncTimeGlobal(context.SourceSession, context.SourceNamespace, "ConnectStatus", context.SourceServerPortText, context.Username);
        var syncTime = IrisSyncService.GetTpSyncTimeGlobal(context.SourceSession) ?? syncAt;

        return Task.FromResult<IResult>(Results.Json(new
        {
            ok = true,
            message = "Connected",
            syncTime
        }));
    });
});

app.MapPost("/api/disconnect", (ApiRequest request) =>
{
    var syncLockKey = BuildSyncLockKey(request, sourceNamespaceDefault, destinationNamespaceDefault);
    if (string.IsNullOrWhiteSpace(syncLockKey) || string.IsNullOrWhiteSpace(request.Username))
    {
        return Results.Json(new
        {
            ok = false,
            message = "Username, source server:port, and destination server:port are required."
        }, statusCode: StatusCodes.Status400BadRequest);
    }

    ReleaseSyncLock(syncConnectionRegistry, syncLockKey, request.Username!);
    return Results.Json(new
    {
        ok = true,
        message = "Disconnected"
    });
});

app.MapPost("/api/tpids", async (ApiRequest request) =>
{
    return await HandleIrisRequest(request, "/api/tpids", sourceNamespaceDefault, destinationNamespaceDefault, connectTimeoutMs, async context =>
    {
        var limit = request.Limit ?? 100;
        var sinceLastRunAt = string.IsNullOrWhiteSpace(request.SinceLastRunAt)
            ? IrisSyncService.GetTpSyncLastRunAtGlobal(context.DestinationSession, context.DestinationNamespace, "TPIDS")
            : request.SinceLastRunAt;
        var sourceTimezoneOffsetMinutes = request.SourceTimezoneOffsetMinutes ?? 0;

        var query = await IrisSyncService.QueryTpIds(
            context.SourceSession,
            connectTimeoutMs,
            limit,
            new ServerConnectionInfo(context.SourceTarget.Host, context.SourceTarget.Port, context.SourceNamespace),
            sinceLastRunAt,
            sourceTimezoneOffsetMinutes,
            request.SinceFilterMode);

        string syncTime;
        try
        {
            var syncAt = IrisSyncService.UpdateTpSyncTimeGlobal(context.SourceSession, context.SourceNamespace, "TPIDS", context.SourceServerPortText, context.Username);
            syncTime = IrisSyncService.GetTpSyncTimeGlobal(context.SourceSession) ?? syncAt;
        }
        catch
        {
            syncTime = DateTime.UtcNow.ToString("O");
        }

        return Results.Json(new
        {
            ok = true,
            message = $"Connected to IRIS at {context.SourceTarget.Host}:{context.SourceTarget.Port} (namespace {context.SourceNamespace}). Retrieved {query.Rows.Count} row(s) from IHC_TPManage.TPIDS.",
            syncTime,
            sqlUsed = query.SqlUsed,
            rows = query.Rows
        });
    });
});

app.MapPost("/api/tradelinks", async (ApiRequest request) =>
{
    return await HandleIrisRequest(request, "/api/tradelinks", sourceNamespaceDefault, destinationNamespaceDefault, connectTimeoutMs, async context =>
    {
        var limit = request.Limit ?? 100;
        var sinceLastRunAt = string.IsNullOrWhiteSpace(request.SinceLastRunAt)
            ? IrisSyncService.GetTpSyncLastRunAtGlobal(context.DestinationSession, context.DestinationNamespace, "TRADELINKS")
            : request.SinceLastRunAt;
        var sourceTimezoneOffsetMinutes = request.SourceTimezoneOffsetMinutes ?? 0;

        var query = await IrisSyncService.QueryTradeLinks(
            context.SourceSession,
            connectTimeoutMs,
            limit,
            new ServerConnectionInfo(context.SourceTarget.Host, context.SourceTarget.Port, context.SourceNamespace),
            sinceLastRunAt,
            sourceTimezoneOffsetMinutes,
            request.SinceFilterMode);

        string syncTime;
        try
        {
            var syncAt = IrisSyncService.UpdateTpSyncTimeGlobal(context.SourceSession, context.SourceNamespace, "TRADELINKS", context.SourceServerPortText, context.Username);
            syncTime = IrisSyncService.GetTpSyncTimeGlobal(context.SourceSession) ?? syncAt;
        }
        catch
        {
            syncTime = DateTime.UtcNow.ToString("O");
        }

        return Results.Json(new
        {
            ok = true,
            message = $"Connected to IRIS at {context.SourceTarget.Host}:{context.SourceTarget.Port} (namespace {context.SourceNamespace}). Retrieved {query.Rows.Count} row(s) from IHC_TPManage.TRADELINKS.",
            syncTime,
            sqlUsed = query.SqlUsed,
            rows = query.Rows
        });
    });
});

app.MapPost("/api/transactiontypes", async (ApiRequest request) =>
{
    return await HandleIrisRequest(request, "/api/transactiontypes", sourceNamespaceDefault, destinationNamespaceDefault, connectTimeoutMs, async context =>
    {
        var limit = request.Limit ?? 100;
        var sinceLastRunAt = string.IsNullOrWhiteSpace(request.SinceLastRunAt)
            ? IrisSyncService.GetTpSyncLastRunAtGlobal(context.DestinationSession, context.DestinationNamespace, "TRANSACTIONTYPES")
            : request.SinceLastRunAt;
        var sourceTimezoneOffsetMinutes = request.SourceTimezoneOffsetMinutes ?? 0;

        var query = await IrisSyncService.QueryTransactionTypes(
            context.SourceSession,
            connectTimeoutMs,
            limit,
            new ServerConnectionInfo(context.SourceTarget.Host, context.SourceTarget.Port, context.SourceNamespace),
            sinceLastRunAt,
            sourceTimezoneOffsetMinutes,
            request.SinceFilterMode);

        string syncTime;
        try
        {
            var syncAt = IrisSyncService.UpdateTpSyncTimeGlobal(context.SourceSession, context.SourceNamespace, "TRANSACTIONTYPES", context.SourceServerPortText, context.Username);
            syncTime = IrisSyncService.GetTpSyncTimeGlobal(context.SourceSession) ?? syncAt;
        }
        catch
        {
            syncTime = DateTime.UtcNow.ToString("O");
        }

        return Results.Json(new
        {
            ok = true,
            message = $"Connected to IRIS at {context.SourceTarget.Host}:{context.SourceTarget.Port} (namespace {context.SourceNamespace}). Retrieved {query.Rows.Count} row(s) from IHC_TPManage.TRANSACTIONTYPES.",
            syncTime,
            sqlUsed = query.SqlUsed,
            rows = query.Rows
        });
    });
});

app.MapPost("/api/sync-baseline", async (ApiRequest request) =>
{
    return await HandleIrisRequest(request, "/api/sync-baseline", sourceNamespaceDefault, destinationNamespaceDefault, connectTimeoutMs, context =>
    {
        var lastRunByTable = new Dictionary<string, string?>
        {
            ["TradingPartner"] = IrisSyncService.GetTpSyncLastRunAtGlobal(context.DestinationSession, context.DestinationNamespace, "TradingPartner"),
            ["TPIDS"] = IrisSyncService.GetTpSyncLastRunAtGlobal(context.DestinationSession, context.DestinationNamespace, "TPIDS"),
            ["TRADELINKS"] = IrisSyncService.GetTpSyncLastRunAtGlobal(context.DestinationSession, context.DestinationNamespace, "TRADELINKS"),
            ["TRANSACTIONTYPES"] = IrisSyncService.GetTpSyncLastRunAtGlobal(context.DestinationSession, context.DestinationNamespace, "TRANSACTIONTYPES")
        };

        return Task.FromResult<IResult>(Results.Json(new
        {
            ok = true,
            lastRunByTable
        }));
    });
});

app.MapPost("/api/sync-last-run", async (ApiRequest request) =>
{
    return await HandleIrisRequest(request, "/api/sync-last-run", sourceNamespaceDefault, destinationNamespaceDefault, connectTimeoutMs, async context =>
    {
        var syncFlowStartedAt = DateTime.UtcNow;
        var stageDurationsMs = new Dictionary<string, long>();
        async Task<T> MeasureStage<T>(string label, Func<Task<T>> action)
        {
            var startedAt = DateTime.UtcNow;
            var result = await action();
            stageDurationsMs[label] = (long)(DateTime.UtcNow - startedAt).TotalMilliseconds;
            return result;
        }

        var tableName = request.TableName?.Trim() ?? string.Empty;
        var sourceTimezoneOffsetMinutes = request.SourceTimezoneOffsetMinutes ?? 0;
        var allowedTables = new HashSet<string>(StringComparer.Ordinal)
        {
            "TradingPartner",
            "TPIDS",
            "TRADELINKS",
            "TRANSACTIONTYPES"
        };

        if (!allowedTables.Contains(tableName))
        {
            return Results.Json(new
            {
                ok = false,
                message = $"Invalid tableName. Allowed values: {string.Join(", ", allowedTables)}"
            });
        }

        var baselineLastRunAt = IrisSyncService.GetTpSyncLastRunAtGlobal(context.DestinationSession, context.DestinationNamespace, tableName);

        SyncResult? tradingPartnerSync = null;
        SyncResult? tpidsCascadeSync = null;
        SyncResult? tpidsDirectSync = null;
        SyncResult? transactionTypesCascadeSync = null;
        SyncResult? tradelinksCascadeSync = null;
        SyncResult? tradelinksDirectSync = null;
        var sourceToDestinationIdMap = new Dictionary<string, object?>();
        var sourceToDestinationTpidsIdMap = new Dictionary<string, object?>();
        var sourceToDestinationTransactionTypesIdMap = new Dictionary<string, object?>();

        async Task<object?> ResolveDestinationTpidsId(object? sourceReference)
        {
            if (sourceReference == null || string.IsNullOrWhiteSpace(sourceReference.ToString()))
            {
                return null;
            }

            var referenceKey = sourceReference.ToString()!;
            if (sourceToDestinationTpidsIdMap.TryGetValue(referenceKey, out var cached) && cached != null)
            {
                return cached;
            }

            var sourceLookupSql = $"SELECT TOP 1 %ID AS ID, TPID FROM IHC_TPManage.TPIDS WHERE %ID = {IrisSyncService.ToSqlLiteral(sourceReference)} OR TPID = {IrisSyncService.ToSqlLiteral(sourceReference)}";
            var sourceRows = (await IrisSyncService.QueryRowsByColumns(
                context.SourceSession,
                sourceLookupSql,
                ["ID", "TPID"],
                connectTimeoutMs,
                "Resolve source TPIDS FK",
                new ServerConnectionInfo(context.SourceTarget.Host, context.SourceTarget.Port, context.SourceNamespace),
                null)).Rows;

            var sourceRow = sourceRows.FirstOrDefault();
            if (sourceRow == null || !sourceRow.TryGetValue("TPID", out var sourceTpid) || sourceTpid == null || string.IsNullOrWhiteSpace(sourceTpid.ToString()))
            {
                return null;
            }

            var destinationTpid = string.Equals(sourceTpid.ToString(), "HT001015-001", StringComparison.Ordinal)
                ? "HT001015-004"
                : sourceTpid.ToString();

            var destinationLookupSql = $"SELECT TOP 1 %ID AS ID FROM IHC_TPManage.TPIDS WHERE TPID = {IrisSyncService.ToSqlLiteral(destinationTpid)}";
            var destinationRows = (await IrisSyncService.QueryRowsByColumns(
                context.DestinationSession,
                destinationLookupSql,
                ["ID"],
                connectTimeoutMs,
                "Resolve destination TPIDS FK",
                new ServerConnectionInfo(context.DestinationTarget.Host, context.DestinationTarget.Port, context.DestinationNamespace),
                null)).Rows;

            var destinationId = destinationRows.FirstOrDefault()?.GetValueOrDefault("ID");
            if (destinationId != null)
            {
                if (sourceRow.TryGetValue("ID", out var sourceId) && sourceId != null)
                {
                    sourceToDestinationTpidsIdMap[sourceId.ToString()!] = destinationId;
                }
                sourceToDestinationTpidsIdMap[sourceTpid.ToString()!] = destinationId;
                sourceToDestinationTpidsIdMap[destinationTpid!] = destinationId;
                sourceToDestinationTpidsIdMap[referenceKey] = destinationId;
                return destinationId;
            }

            return null;
        }

        async Task<object?> ResolveDestinationTransactionTypeId(object? sourceReference)
        {
            if (sourceReference == null || string.IsNullOrWhiteSpace(sourceReference.ToString()))
            {
                return null;
            }

            var referenceKey = sourceReference.ToString()!;
            if (sourceToDestinationTransactionTypesIdMap.TryGetValue(referenceKey, out var cached) && cached != null)
            {
                return cached;
            }

            var sourceLookupSql = $"SELECT TOP 1 %ID AS ID, NAME, TransactionSetId, VERSION FROM IHC_TPManage.TRANSACTIONTYPES WHERE %ID = {IrisSyncService.ToSqlLiteral(sourceReference)} OR NAME = {IrisSyncService.ToSqlLiteral(sourceReference)}";
            var sourceRows = (await IrisSyncService.QueryRowsByColumns(
                context.SourceSession,
                sourceLookupSql,
                ["ID", "NAME", "TransactionSetId", "VERSION"],
                connectTimeoutMs,
                "Resolve source TRANSACTIONTYPES FK",
                new ServerConnectionInfo(context.SourceTarget.Host, context.SourceTarget.Port, context.SourceNamespace),
                null)).Rows;

            var sourceRow = sourceRows.FirstOrDefault();
            if (sourceRow == null || sourceRow.GetValueOrDefault("NAME") == null)
            {
                return null;
            }

            var destinationLookupSql =
                $"SELECT TOP 1 %ID AS ID FROM IHC_TPManage.TRANSACTIONTYPES WHERE NAME = {IrisSyncService.ToSqlLiteral(sourceRow.GetValueOrDefault("NAME"))} AND TransactionSetId = {IrisSyncService.ToSqlLiteral(sourceRow.GetValueOrDefault("TransactionSetId"))} AND VERSION = {IrisSyncService.ToSqlLiteral(sourceRow.GetValueOrDefault("VERSION"))}";
            var destinationRows = (await IrisSyncService.QueryRowsByColumns(
                context.DestinationSession,
                destinationLookupSql,
                ["ID"],
                connectTimeoutMs,
                "Resolve destination TRANSACTIONTYPES FK",
                new ServerConnectionInfo(context.DestinationTarget.Host, context.DestinationTarget.Port, context.DestinationNamespace),
                null)).Rows;

            var destinationId = destinationRows.FirstOrDefault()?.GetValueOrDefault("ID");
            if (destinationId != null)
            {
                var sourceRowId = sourceRow.GetValueOrDefault("ID")?.ToString();
                if (!string.IsNullOrWhiteSpace(sourceRowId))
                {
                    sourceToDestinationTransactionTypesIdMap[sourceRowId] = destinationId;
                }
                var sourceRowName = sourceRow.GetValueOrDefault("NAME")?.ToString();
                if (!string.IsNullOrWhiteSpace(sourceRowName))
                {
                    sourceToDestinationTransactionTypesIdMap[sourceRowName] = destinationId;
                }
                sourceToDestinationTransactionTypesIdMap[referenceKey] = destinationId;
                return destinationId;
            }

            return null;
        }

        async Task<Dictionary<string, object?>?> RemapTpidsRow(Dictionary<string, object?> sourceRow)
        {
            var sourceTpFk = sourceRow.GetValueOrDefault("TPFK");
            if (sourceTpFk == null || string.IsNullOrWhiteSpace(sourceTpFk.ToString()))
            {
                return sourceRow;
            }

            var mapKey = sourceTpFk.ToString()!;
            if (!sourceToDestinationIdMap.TryGetValue(mapKey, out var destinationTpId) || destinationTpId == null)
            {
                destinationTpId = await IrisSyncService.EnsureDestinationTradingPartnerIdForSourceId(
                    context.SourceSession,
                    context.DestinationSession,
                    sourceTpFk,
                    connectTimeoutMs,
                    new ServerConnectionInfo(context.SourceTarget.Host, context.SourceTarget.Port, context.SourceNamespace));

                if (destinationTpId != null)
                {
                    sourceToDestinationIdMap[mapKey] = destinationTpId;
                }
            }

            if (destinationTpId == null)
            {
                return null;
            }

            var remapped = new Dictionary<string, object?>(sourceRow)
            {
                ["TPFK"] = destinationTpId
            };

            return remapped;
        }

        async Task<Dictionary<string, object?>?> RemapTradeLinksRow(Dictionary<string, object?> sourceRow)
        {
            var remapped = await RemapTpidsRow(sourceRow);
            if (remapped == null)
            {
                return null;
            }

            foreach (var field in new[] { "GsReceiverId", "GsSenderId", "IsaReceiverId", "IsaSenderId" })
            {
                var sourceFk = remapped.GetValueOrDefault(field);
                if (sourceFk == null || string.IsNullOrWhiteSpace(sourceFk.ToString()))
                {
                    continue;
                }

                var sourceKey = sourceFk.ToString()!;
                if (!sourceToDestinationTpidsIdMap.TryGetValue(sourceKey, out var mapped) || mapped == null)
                {
                    mapped = await ResolveDestinationTpidsId(sourceFk);
                }

                if (mapped == null)
                {
                    return null;
                }

                remapped[field] = mapped;
            }

            var sourceTransType = remapped.GetValueOrDefault("TRANSTYPE");
            if (sourceTransType != null && !string.IsNullOrWhiteSpace(sourceTransType.ToString()))
            {
                var sourceKey = sourceTransType.ToString()!;
                if (!sourceToDestinationTransactionTypesIdMap.TryGetValue(sourceKey, out var mappedTransType) || mappedTransType == null)
                {
                    mappedTransType = await ResolveDestinationTransactionTypeId(sourceTransType);
                }

                if (mappedTransType == null)
                {
                    return null;
                }

                remapped["TRANSTYPE"] = mappedTransType;
            }

            return remapped;
        }

        if (tableName is "TPIDS" or "TRADELINKS" or "TradingPartner")
        {
            var tradingPartnerBaseline = IrisSyncService.GetTpSyncLastRunAtGlobal(context.DestinationSession, context.DestinationNamespace, "TradingPartner");

            tradingPartnerSync = await MeasureStage("tradingPartnerSync", () =>
                IrisSyncService.SyncTradingPartnersForTpids(
                    context.SourceSession,
                    context.DestinationSession,
                    tradingPartnerBaseline,
                    sourceTimezoneOffsetMinutes,
                    connectTimeoutMs,
                    new ServerConnectionInfo(context.SourceTarget.Host, context.SourceTarget.Port, context.SourceNamespace),
                    request.SinceFilterMode,
                    false));

            sourceToDestinationIdMap = new Dictionary<string, object?>(tradingPartnerSync.SourceToDestinationIdMap);

            var fullTradingPartnerIdMap = await IrisSyncService.BuildSourceToDestinationIdMapByKeys(
                context.SourceSession,
                context.DestinationSession,
                "IHC_TPManage.TradingPartner",
                "IHC_TPManage.TradingPartner",
                ["Name"],
                connectTimeoutMs,
                new ServerConnectionInfo(context.SourceTarget.Host, context.SourceTarget.Port, context.SourceNamespace),
                "TradingPartner full FK map");

            foreach (var (sourceId, destinationId) in fullTradingPartnerIdMap)
            {
                sourceToDestinationIdMap[sourceId] = destinationId;
            }
        }

        SyncResult rowSync;
        if (tableName == "TradingPartner")
        {
            rowSync = tradingPartnerSync!;
            var sourceParentIds = sourceToDestinationIdMap.Keys.ToList();
            var sourceParentIdsForTradeLinks = tradingPartnerSync?.SourceTradingPartnerIds?.Count > 0
                ? tradingPartnerSync.SourceTradingPartnerIds
                : sourceParentIds;

            var tpidsBaseline = IrisSyncService.GetTpSyncLastRunAtGlobal(context.DestinationSession, context.DestinationNamespace, "TPIDS");

            tpidsCascadeSync = await MeasureStage("tpidsCascadeSync", () =>
                IrisSyncService.SyncRowsByTable(
                    context.SourceSession,
                    context.DestinationSession,
                    "TPIDS",
                    tpidsBaseline,
                    sourceTimezoneOffsetMinutes,
                    connectTimeoutMs,
                    new ServerConnectionInfo(context.SourceTarget.Host, context.SourceTarget.Port, context.SourceNamespace),
                    RemapTpidsRow,
                    true,
                    "TPFK",
                    sourceParentIds,
                    null,
                    null,
                    false,
                    request.SinceFilterMode,
                    request.UseHardcodedRouting));

            tpidsDirectSync = await MeasureStage("tpidsDirectSync", () =>
                IrisSyncService.SyncRowsByTable(
                    context.SourceSession,
                    context.DestinationSession,
                    "TPIDS",
                    tpidsBaseline,
                    sourceTimezoneOffsetMinutes,
                    connectTimeoutMs,
                    new ServerConnectionInfo(context.SourceTarget.Host, context.SourceTarget.Port, context.SourceNamespace),
                    RemapTpidsRow,
                    false,
                    null,
                    null,
                    null,
                    tpidsCascadeSync.UpsertKeys,
                    false,
                    request.SinceFilterMode,
                    request.UseHardcodedRouting));

            sourceToDestinationTpidsIdMap = await IrisSyncService.BuildSourceToDestinationIdMapByKeys(
                context.SourceSession,
                context.DestinationSession,
                "IHC_TPManage.TPIDS",
                "IHC_TPManage.TPIDS",
                ["TPID"],
                connectTimeoutMs,
                new ServerConnectionInfo(context.SourceTarget.Host, context.SourceTarget.Port, context.SourceNamespace),
                "TPIDS FK map");

            var transactionTypesBaseline = IrisSyncService.GetTpSyncLastRunAtGlobal(context.DestinationSession, context.DestinationNamespace, "TRANSACTIONTYPES");

            transactionTypesCascadeSync = await MeasureStage("transactionTypesCascadeSync", () =>
                IrisSyncService.SyncRowsByTable(
                    context.SourceSession,
                    context.DestinationSession,
                    "TRANSACTIONTYPES",
                    transactionTypesBaseline,
                    sourceTimezoneOffsetMinutes,
                    connectTimeoutMs,
                    new ServerConnectionInfo(context.SourceTarget.Host, context.SourceTarget.Port, context.SourceNamespace),
                    null,
                    true,
                    null,
                    null,
                    null,
                    null,
                    false,
                    request.SinceFilterMode,
                    request.UseHardcodedRouting));

            sourceToDestinationTransactionTypesIdMap = await IrisSyncService.BuildSourceToDestinationIdMapByKeys(
                context.SourceSession,
                context.DestinationSession,
                "IHC_TPManage.TRANSACTIONTYPES",
                "IHC_TPManage.TRANSACTIONTYPES",
                ["NAME", "TransactionSetId", "VERSION"],
                connectTimeoutMs,
                new ServerConnectionInfo(context.SourceTarget.Host, context.SourceTarget.Port, context.SourceNamespace),
                "TRANSACTIONTYPES FK map");

            var tpidsIdSql = sourceParentIdsForTradeLinks.Count > 0
                ? $"SELECT %ID AS ID FROM IHC_TPManage.TPIDS WHERE TPFK IN ({string.Join(", ", sourceParentIdsForTradeLinks.Select(IrisSyncService.ToSqlLiteral))})"
                : "SELECT %ID AS ID FROM IHC_TPManage.TPIDS WHERE 1 = 0";

            var sourceTpidsIdRows = (await IrisSyncService.QueryRowsByColumns(
                context.SourceSession,
                tpidsIdSql,
                ["ID"],
                connectTimeoutMs,
                "TPIDS IDs for TRADELINKS FK filter",
                new ServerConnectionInfo(context.SourceTarget.Host, context.SourceTarget.Port, context.SourceNamespace),
                null)).Rows;

            var sourceTpidsIds = sourceTpidsIdRows
                .Select(row => row.GetValueOrDefault("ID"))
                .Where(id => id != null)
                .Select(id => id!.ToString()!)
                .ToList();

            var tradelinksWhereClause = sourceTpidsIds.Count > 0
                ? $"GsReceiverId IN ({string.Join(", ", sourceTpidsIds.Select(IrisSyncService.ToSqlLiteral))}) OR GsSenderId IN ({string.Join(", ", sourceTpidsIds.Select(IrisSyncService.ToSqlLiteral))}) OR IsaReceiverId IN ({string.Join(", ", sourceTpidsIds.Select(IrisSyncService.ToSqlLiteral))}) OR IsaSenderId IN ({string.Join(", ", sourceTpidsIds.Select(IrisSyncService.ToSqlLiteral))})"
                : "1 = 0";

            tradelinksCascadeSync = await MeasureStage("tradelinksCascadeSync", () =>
                IrisSyncService.SyncRowsByTable(
                    context.SourceSession,
                    context.DestinationSession,
                    "TRADELINKS",
                    null,
                    sourceTimezoneOffsetMinutes,
                    connectTimeoutMs,
                    new ServerConnectionInfo(context.SourceTarget.Host, context.SourceTarget.Port, context.SourceNamespace),
                    RemapTradeLinksRow,
                    true,
                    null,
                    null,
                    tradelinksWhereClause,
                    null,
                    true,
                    request.SinceFilterMode,
                    request.UseHardcodedRouting));

            var tradelinksBaseline = IrisSyncService.GetTpSyncLastRunAtGlobal(context.DestinationSession, context.DestinationNamespace, "TRADELINKS");
            tradelinksDirectSync = await MeasureStage("tradelinksDirectSync", () =>
                IrisSyncService.SyncRowsByTable(
                    context.SourceSession,
                    context.DestinationSession,
                    "TRADELINKS",
                    tradelinksBaseline,
                    sourceTimezoneOffsetMinutes,
                    connectTimeoutMs,
                    new ServerConnectionInfo(context.SourceTarget.Host, context.SourceTarget.Port, context.SourceNamespace),
                    RemapTradeLinksRow,
                    false,
                    null,
                    null,
                    null,
                    tradelinksCascadeSync.UpsertKeys,
                    true,
                    request.SinceFilterMode,
                    request.UseHardcodedRouting));
        }
        else
        {
            var sourceParentIds = sourceToDestinationIdMap.Keys.ToList();
            var sourceParentIdsForTradeLinks = tradingPartnerSync?.SourceTradingPartnerIds?.Count > 0
                ? tradingPartnerSync.SourceTradingPartnerIds
                : sourceParentIds;
            string? directTradelinksWhereClause = null;

            if (tableName == "TRADELINKS")
            {
                var tpidsBaseline = IrisSyncService.GetTpSyncLastRunAtGlobal(context.DestinationSession, context.DestinationNamespace, "TPIDS");

                tpidsCascadeSync = await IrisSyncService.SyncRowsByTable(
                    context.SourceSession,
                    context.DestinationSession,
                    "TPIDS",
                    tpidsBaseline,
                    sourceTimezoneOffsetMinutes,
                    connectTimeoutMs,
                    new ServerConnectionInfo(context.SourceTarget.Host, context.SourceTarget.Port, context.SourceNamespace),
                    RemapTpidsRow,
                    true,
                    "TPFK",
                    sourceParentIds,
                    null,
                    null,
                    false,
                    request.SinceFilterMode,
                    request.UseHardcodedRouting);

                sourceToDestinationTpidsIdMap = await IrisSyncService.BuildSourceToDestinationIdMapByKeys(
                    context.SourceSession,
                    context.DestinationSession,
                    "IHC_TPManage.TPIDS",
                    "IHC_TPManage.TPIDS",
                    ["TPID"],
                    connectTimeoutMs,
                    new ServerConnectionInfo(context.SourceTarget.Host, context.SourceTarget.Port, context.SourceNamespace),
                    "TPIDS FK map");

                var transactionTypesBaseline = IrisSyncService.GetTpSyncLastRunAtGlobal(context.DestinationSession, context.DestinationNamespace, "TRANSACTIONTYPES");
                transactionTypesCascadeSync = await IrisSyncService.SyncRowsByTable(
                    context.SourceSession,
                    context.DestinationSession,
                    "TRANSACTIONTYPES",
                    transactionTypesBaseline,
                    sourceTimezoneOffsetMinutes,
                    connectTimeoutMs,
                    new ServerConnectionInfo(context.SourceTarget.Host, context.SourceTarget.Port, context.SourceNamespace),
                    null,
                    true,
                    null,
                    null,
                    null,
                    null,
                    false,
                    request.SinceFilterMode,
                    request.UseHardcodedRouting);

                sourceToDestinationTransactionTypesIdMap = await IrisSyncService.BuildSourceToDestinationIdMapByKeys(
                    context.SourceSession,
                    context.DestinationSession,
                    "IHC_TPManage.TRANSACTIONTYPES",
                    "IHC_TPManage.TRANSACTIONTYPES",
                    ["NAME", "TransactionSetId", "VERSION"],
                    connectTimeoutMs,
                    new ServerConnectionInfo(context.SourceTarget.Host, context.SourceTarget.Port, context.SourceNamespace),
                    "TRANSACTIONTYPES FK map");

                var tpidsIdSql = sourceParentIdsForTradeLinks.Count > 0
                    ? $"SELECT %ID AS ID FROM IHC_TPManage.TPIDS WHERE TPFK IN ({string.Join(", ", sourceParentIdsForTradeLinks.Select(IrisSyncService.ToSqlLiteral))})"
                    : "SELECT %ID AS ID FROM IHC_TPManage.TPIDS WHERE 1 = 0";

                var sourceTpidsIdRows = (await IrisSyncService.QueryRowsByColumns(
                    context.SourceSession,
                    tpidsIdSql,
                    ["ID"],
                    connectTimeoutMs,
                    "TPIDS IDs for TRADELINKS FK filter",
                    new ServerConnectionInfo(context.SourceTarget.Host, context.SourceTarget.Port, context.SourceNamespace),
                    null)).Rows;

                var sourceTpidsIds = sourceTpidsIdRows
                    .Select(row => row.GetValueOrDefault("ID"))
                    .Where(id => id != null)
                    .Select(id => id!.ToString()!)
                    .ToList();

                directTradelinksWhereClause = sourceTpidsIds.Count > 0
                    ? $"GsReceiverId IN ({string.Join(", ", sourceTpidsIds.Select(IrisSyncService.ToSqlLiteral))}) OR GsSenderId IN ({string.Join(", ", sourceTpidsIds.Select(IrisSyncService.ToSqlLiteral))}) OR IsaReceiverId IN ({string.Join(", ", sourceTpidsIds.Select(IrisSyncService.ToSqlLiteral))}) OR IsaSenderId IN ({string.Join(", ", sourceTpidsIds.Select(IrisSyncService.ToSqlLiteral))})"
                    : "1 = 0";
            }

            rowSync = await MeasureStage(
                $"{tableName}Sync",
                () => IrisSyncService.SyncRowsByTable(
                    context.SourceSession,
                    context.DestinationSession,
                    tableName,
                    baselineLastRunAt,
                    sourceTimezoneOffsetMinutes,
                    connectTimeoutMs,
                    new ServerConnectionInfo(context.SourceTarget.Host, context.SourceTarget.Port, context.SourceNamespace),
                    tableName == "TPIDS"
                        ? RemapTpidsRow
                        : tableName == "TRADELINKS"
                            ? RemapTradeLinksRow
                            : null,
                    tableName is "TPIDS" or "TRADELINKS",
                    tableName is "TPIDS" or "TRADELINKS" ? "TPFK" : null,
                    tableName is "TPIDS" or "TRADELINKS" ? sourceParentIds : null,
                    tableName == "TRADELINKS" ? directTradelinksWhereClause : null,
                    null,
                    tableName == "TRADELINKS",
                    request.SinceFilterMode,
                    request.UseHardcodedRouting));
        }

        var copiedEntries = await MeasureStage("syncGlobalCopy", () => Task.FromResult(IrisSyncService.SyncTpSyncTimeGlobal(
            context.SourceSession,
            context.DestinationSession,
            context.SourceNamespace,
            context.DestinationNamespace)));

        // Ensure destination scoped LastRunAt is explicitly advanced for the synced table.
        var destinationServerPortText = $"{context.DestinationTarget.Host}:{context.DestinationTarget.Port}";
        IrisSyncService.UpdateTpSyncTimeGlobal(
            context.DestinationSession,
            context.DestinationNamespace,
            tableName,
            destinationServerPortText,
            context.Username);

        var lastRunAt = IrisSyncService.GetTpSyncLastRunAtGlobal(context.DestinationSession, context.DestinationNamespace, tableName);
        var totalSyncDurationMs = (long)(DateTime.UtcNow - syncFlowStartedAt).TotalMilliseconds;

        return Results.Json(new
        {
            ok = true,
            tableName,
            totalSyncDurationMs,
            stageDurationsMs,
            baselineLastRunAt,
            sourceSql = rowSync.SourceSql,
            processed = rowSync.Processed,
            inserted = rowSync.Inserted,
            updated = rowSync.Updated,
            insertedOnMissingUpdate = rowSync.InsertedOnMissingUpdate,
            skipped = rowSync.Skipped,
            tradingPartnerSync,
            tpidsCascadeSync,
            tpidsDirectSync,
            transactionTypesCascadeSync,
            tradelinksCascadeSync,
            tradelinksDirectSync,
            copiedEntries,
            lastRunAt,
            message = lastRunAt != null
                ? $"Sync complete for {tableName}. Inserted: {rowSync.Inserted}, Updated: {rowSync.Updated}, Inserted on missing update: {rowSync.InsertedOnMissingUpdate}, Skipped: {rowSync.Skipped}. LastRunAt: {lastRunAt}"
                : $"Sync complete for {tableName}. Inserted: {rowSync.Inserted}, Updated: {rowSync.Updated}, Inserted on missing update: {rowSync.InsertedOnMissingUpdate}, Skipped: {rowSync.Skipped}. No LastRunAt found."
        });
    });
});

app.Run($"http://localhost:{apiPort}");

static string BuildSyncLockKey(ApiRequest request, string sourceNamespaceDefault, string destinationNamespaceDefault)
{
    var sourceServerPort = request.SourceServerPort ?? request.ServerPort;
    var destinationServerPort = request.DestinationServerPort;
    var sourceNamespace = string.IsNullOrWhiteSpace(request.SourceNamespace)
        ? sourceNamespaceDefault
        : request.SourceNamespace!;
    var destinationNamespace = string.IsNullOrWhiteSpace(request.DestinationNamespace)
        ? destinationNamespaceDefault
        : request.DestinationNamespace!;

    if (string.IsNullOrWhiteSpace(sourceServerPort) || string.IsNullOrWhiteSpace(destinationServerPort))
    {
        return string.Empty;
    }

    return $"{sourceServerPort.Trim().ToUpperInvariant()}|{sourceNamespace.Trim().ToUpperInvariant()}|{destinationServerPort.Trim().ToUpperInvariant()}|{destinationNamespace.Trim().ToUpperInvariant()}";
}

static bool TryAcquireSyncLock(ConcurrentDictionary<string, string> registry, string syncLockKey, string username, out string connectedUser)
{
    while (true)
    {
        if (!registry.TryGetValue(syncLockKey, out var currentUser))
        {
            if (registry.TryAdd(syncLockKey, username))
            {
                connectedUser = username;
                return true;
            }

            continue;
        }

        if (string.Equals(currentUser, username, StringComparison.OrdinalIgnoreCase))
        {
            registry[syncLockKey] = username;
            connectedUser = username;
            return true;
        }

        connectedUser = currentUser;
        return false;
    }
}

static void ReleaseSyncLock(ConcurrentDictionary<string, string> registry, string syncLockKey, string username)
{
    if (!registry.TryGetValue(syncLockKey, out var currentUser))
    {
        return;
    }

    if (!string.Equals(currentUser, username, StringComparison.OrdinalIgnoreCase))
    {
        return;
    }

    registry.TryRemove(syncLockKey, out _);
}

static async Task<IResult> HandleIrisRequest(
    ApiRequest request,
    string endpointName,
    string sourceNamespaceDefault,
    string destinationNamespaceDefault,
    int connectTimeoutMs,
    Func<ServerConnectionContext, Task<IResult>> handler)
{
    var effectiveServerPort = request.SourceServerPort ?? request.ServerPort;
    var effectiveDestinationServerPort = request.DestinationServerPort;
    var effectiveSourceNamespace = string.IsNullOrWhiteSpace(request.SourceNamespace)
        ? sourceNamespaceDefault
        : request.SourceNamespace!;
    var effectiveDestinationNamespace = string.IsNullOrWhiteSpace(request.DestinationNamespace)
        ? destinationNamespaceDefault
        : request.DestinationNamespace!;

    if (string.IsNullOrWhiteSpace(request.Username)
        || string.IsNullOrWhiteSpace(request.Password)
        || string.IsNullOrWhiteSpace(effectiveServerPort)
        || string.IsNullOrWhiteSpace(effectiveDestinationServerPort))
    {
        return Results.Json(new
        {
            ok = false,
            message = "Username, password, source server:port, and destination server:port are required."
        }, statusCode: StatusCodes.Status400BadRequest);
    }

    var sourceTarget = IrisSyncService.ParseServerPort(effectiveServerPort!);
    if (sourceTarget == null)
    {
        return Results.Json(new
        {
            ok = false,
            message = "Invalid source server:port format. Example: localhost:51773"
        }, statusCode: StatusCodes.Status400BadRequest);
    }

    var destinationTarget = IrisSyncService.ParseServerPort(effectiveDestinationServerPort!);
    if (destinationTarget == null)
    {
        return Results.Json(new
        {
            ok = false,
            message = "Invalid destination server:port format. Example: localhost:51773"
        }, statusCode: StatusCodes.Status400BadRequest);
    }

    PooledSession? sourceSession = null;
    PooledSession? destinationSession = null;

    try
    {
        sourceSession = IrisSyncService.GetPooledIrisSession(sourceTarget, effectiveSourceNamespace, request.Username!, request.Password!, connectTimeoutMs);
        destinationSession = IrisSyncService.GetPooledIrisSession(destinationTarget, effectiveDestinationNamespace, request.Username!, request.Password!, connectTimeoutMs);

        var result = await handler(new ServerConnectionContext(
            request.Username!,
            sourceTarget,
            destinationTarget,
            effectiveServerPort!,
            effectiveSourceNamespace,
            effectiveDestinationNamespace,
            sourceSession,
            destinationSession));

        IrisSyncService.ReleasePooledIrisSession(sourceSession);
        IrisSyncService.ReleasePooledIrisSession(destinationSession);
        return result;
    }
    catch (TimeoutException ex)
    {
        await IrisSyncService.InvalidatePooledIrisSession(sourceSession);
        await IrisSyncService.InvalidatePooledIrisSession(destinationSession);

        return Results.Json(new
        {
            ok = false,
            message = $"IRIS connection timed out after {connectTimeoutMs / 1000} seconds.",
            details = ex.Message
        }, statusCode: StatusCodes.Status504GatewayTimeout);
    }
    catch (Exception ex)
    {
        await IrisSyncService.InvalidatePooledIrisSession(sourceSession);
        await IrisSyncService.InvalidatePooledIrisSession(destinationSession);

        var hint = IrisSyncService.BuildConnectionHint(sourceTarget, ex.Message);
        return Results.Json(new
        {
            ok = false,
            message = $"IRIS connection failed: {hint}",
            details = ex.Message
        }, statusCode: StatusCodes.Status500InternalServerError);
    }
}

sealed record ApiRequest
{
    public string? Username { get; init; }
    public string? Password { get; init; }
    public string? ServerPort { get; init; }
    public string? SourceServerPort { get; init; }
    public string? DestinationServerPort { get; init; }
    public string? SourceNamespace { get; init; }
    public string? DestinationNamespace { get; init; }
    public string? SinceLastRunAt { get; init; }
    public int? SourceTimezoneOffsetMinutes { get; init; }
    public int? Limit { get; init; }
    public string? TableName { get; init; }
    public string? SinceFilterMode { get; init; }
    public bool? UseHardcodedRouting { get; init; }
}

sealed record ServerTarget(string Host, int Port);
sealed record ServerConnectionInfo(string Host, int Port, string Namespace);

sealed record ServerConnectionContext(
    string Username,
    ServerTarget SourceTarget,
    ServerTarget DestinationTarget,
    string SourceServerPortText,
    string SourceNamespace,
    string DestinationNamespace,
    PooledSession SourceSession,
    PooledSession DestinationSession);

sealed record QueryResult(List<Dictionary<string, object?>> Rows, string SqlUsed);

sealed record SyncResult
{
    public string SourceSql { get; init; } = string.Empty;
    public bool DestinationHasRows { get; init; }
    public long DurationMs { get; init; }
    public int Processed { get; init; }
    public int Inserted { get; init; }
    public int Updated { get; init; }
    public int InsertedOnMissingUpdate { get; init; }
    public int Skipped { get; init; }
    public int ErrorCount { get; init; }
    public List<Dictionary<string, object?>> ErrorSamples { get; init; } = [];
    public List<string> UpsertKeys { get; init; } = [];
    public Dictionary<string, object?> SourceToDestinationIdMap { get; init; } = [];
    public List<string> SourceTradingPartnerIds { get; init; } = [];
}

sealed record PooledSession(string Key, IRISConnection Connection)
{
    public DateTime LastUsedAtUtc { get; set; } = DateTime.UtcNow;
}

static class IrisSyncService
{
    private static readonly ConcurrentDictionary<string, PooledSession> SessionPool = new(StringComparer.Ordinal);

    private static readonly string[] TradingPartnerColumns =
    [
        "Name", "ContactName", "ContactEmail", "ContactPhone", "Type", "EdifecsId", "CreatedDtTM", "CreateID", "LastmodDtTM", "LastmodID"
    ];

    private static readonly string[] TradingPartnerSyncColumns =
    [
        "ID", "Name", "ContactName", "ContactEmail", "ContactPhone", "Type", "EdifecsId", "CreatedDtTM", "CreateID", "LastmodDtTM", "LastmodID"
    ];

    private static readonly string[] TpidsColumns =
    [
        "ID", "Name", "TPID", "EdifecsID", "Type", "TPFK", "CreatedDtTM", "CreateID", "LastmodDtTM", "LastmodID"
    ];

    private static readonly string[] TradelinksColumns =
    [
        "ID", "NAME", "Notes", "CreateID", "CreatedDtTM", "LastmodID", "LastmodDtTM", "Active", "IsaSenderId", "IsaReceiverId", "GsSenderId", "GsReceiverId", "ISAAck", "GSAck", "STAck", "TRANSTYPE", "Routing", "Direction", "SNIP", "Mode", "EdifecsID", "Separators", "ControlNumber", "UniqueId", "ValidationRuleFile"
    ];

    private static readonly string[] TransactiontypesColumns =
    [
        "ID", "NAME", "TransactionSetId", "VERSION", "DESCRIPTION", "CreatedDtTM", "CreateID", "LastmodDtTM", "LastmodID", "Direction"
    ];

    private static readonly Dictionary<string, TableSyncConfig> TableSyncConfigs = new(StringComparer.Ordinal)
    {
        ["TradingPartner"] = new("IHC_TPManage.TradingPartner", TradingPartnerColumns, "Name"),
        ["TPIDS"] = new("IHC_TPManage.TPIDS", TpidsColumns, "TPID"),
        ["TRADELINKS"] = new("IHC_TPManage.TRADELINKS", TradelinksColumns, "NAME"),
        ["TRANSACTIONTYPES"] = new("IHC_TPManage.TRANSACTIONTYPES", TransactiontypesColumns, "NAME")
    };

    public static ServerTarget? ParseServerPort(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var cleaned = value.Trim();
        cleaned = Regex.Replace(cleaned, "^https?://", string.Empty, RegexOptions.IgnoreCase);
        cleaned = cleaned.TrimEnd('/');

        var lastColon = cleaned.LastIndexOf(':');
        if (lastColon < 1 || lastColon == cleaned.Length - 1)
        {
            return null;
        }

        var host = cleaned[..lastColon].Trim();
        var portText = cleaned[(lastColon + 1)..].Trim();

        if (string.IsNullOrWhiteSpace(host) || !int.TryParse(portText, out var port) || port <= 0)
        {
            return null;
        }

        return new ServerTarget(host, port);
    }

    public static string BuildConnectionHint(ServerTarget target, string errorText)
    {
        var normalized = (errorText ?? string.Empty).ToLowerInvariant();

        if (normalized.Contains("authentication") || normalized.Contains("login") || normalized.Contains("password"))
        {
            return "Authentication failed. Verify username/password and IRIS namespace.";
        }

        if (normalized.Contains("econnrefused") || normalized.Contains("timed out") || normalized.Contains("timeout"))
        {
            return $"Cannot reach {target.Host}:{target.Port}. Use the IRIS SuperServer port (often 1972), not the web portal port.";
        }

        if (target.Port is 52773 or 80 or 443)
        {
            return "This looks like a web port. Native IRIS SDK needs the SuperServer port (commonly 1972).";
        }

        return "Connection failed. Verify host, SuperServer port, credentials, and namespace.";
    }

    public static PooledSession GetPooledIrisSession(ServerTarget target, string @namespace, string username, string password, int timeoutMs)
    {
        var key = GetSessionKey(target, @namespace, username, password);
        if (SessionPool.TryGetValue(key, out var cached))
        {
            cached.LastUsedAtUtc = DateTime.UtcNow;
            return cached;
        }

        var created = CreateIrisSession(key, target, @namespace, username, password, timeoutMs);
        SessionPool[key] = created;
        return created;
    }

    public static void ReleasePooledIrisSession(PooledSession? session)
    {
        if (session == null)
        {
            return;
        }

        session.LastUsedAtUtc = DateTime.UtcNow;
    }

    public static async Task InvalidatePooledIrisSession(PooledSession? session)
    {
        if (session == null)
        {
            return;
        }

        SessionPool.TryRemove(session.Key, out _);
        await Task.Run(() =>
        {
            try
            {
                session.Connection.Close();
            }
            catch
            {
            }
        });
    }

    public static async Task<QueryResult> QueryTradingPartners(PooledSession sourceSession, int timeoutMs, ServerConnectionInfo connectionInfo, string? sinceLastRunAt, int timezoneOffsetMinutes, string? sinceFilterMode)
    {
        var since = BuildSinceFilter(sinceLastRunAt, timezoneOffsetMinutes, sinceFilterMode);
        return await QueryRowsByColumns(
            sourceSession,
            $"SELECT TOP 100 Name, ContactName, ContactEmail, ContactPhone, Type, EdifecsId, CreatedDtTM, CreateID, LastmodDtTM, LastmodID FROM IHC_TPManage.TradingPartner{since.WhereClause}",
            TradingPartnerColumns,
            timeoutMs,
            "TradingPartner query",
            connectionInfo,
            since.SqlLocalTimestamp);
    }

    public static async Task<QueryResult> QueryTpIds(PooledSession sourceSession, int timeoutMs, int limit, ServerConnectionInfo connectionInfo, string? sinceLastRunAt, int timezoneOffsetMinutes, string? sinceFilterMode)
    {
        var safeLimit = Math.Clamp(limit, 1, 500);
        var since = BuildSinceFilter(sinceLastRunAt, timezoneOffsetMinutes, sinceFilterMode);

        return await QueryRowsByColumns(
            sourceSession,
            $"SELECT TOP {safeLimit} %ID AS ID, Name, TPID, EdifecsID, Type, TPFK, CreatedDtTM, CreateID, LastmodDtTM, LastmodID FROM IHC_TPManage.TPIDS{since.WhereClause}",
            TpidsColumns,
            timeoutMs,
            "TPIDS query",
            connectionInfo,
            since.SqlLocalTimestamp);
    }

    public static async Task<QueryResult> QueryTradeLinks(PooledSession sourceSession, int timeoutMs, int limit, ServerConnectionInfo connectionInfo, string? sinceLastRunAt, int timezoneOffsetMinutes, string? sinceFilterMode)
    {
        var safeLimit = Math.Clamp(limit, 1, 500);
        var since = BuildSinceFilter(sinceLastRunAt, timezoneOffsetMinutes, sinceFilterMode);

        return await QueryRowsByColumns(
            sourceSession,
            $"SELECT TOP {safeLimit} %ID AS ID, NAME, Notes, CreateID, CreatedDtTM, LastmodID, LastmodDtTM, Active, IsaSenderId, IsaReceiverId, GsSenderId, GsReceiverId, ISAAck, GSAck, STAck, TRANSTYPE, Routing, Direction, SNIP, Mode, EdifecsID, Separators, ControlNumber, UniqueId, ValidationRuleFile FROM IHC_TPManage.TRADELINKS{since.WhereClause}",
            TradelinksColumns,
            timeoutMs,
            "TRADELINKS query",
            connectionInfo,
            since.SqlLocalTimestamp);
    }

    public static async Task<QueryResult> QueryTransactionTypes(PooledSession sourceSession, int timeoutMs, int limit, ServerConnectionInfo connectionInfo, string? sinceLastRunAt, int timezoneOffsetMinutes, string? sinceFilterMode)
    {
        var safeLimit = Math.Clamp(limit, 1, 500);
        var since = BuildSinceFilter(sinceLastRunAt, timezoneOffsetMinutes, sinceFilterMode);

        return await QueryRowsByColumns(
            sourceSession,
            $"SELECT TOP {safeLimit} %ID AS ID, NAME, TransactionSetId, VERSION, DESCRIPTION, CreatedDtTM, CreateID, LastmodDtTM, LastmodID, Direction FROM IHC_TPManage.TRANSACTIONTYPES{since.WhereClause}",
            TransactiontypesColumns,
            timeoutMs,
            "TRANSACTIONTYPES query",
            connectionInfo,
            since.SqlLocalTimestamp);
    }

    public static async Task<QueryResult> QueryRowsByColumns(
        PooledSession session,
        string sqlText,
        IReadOnlyList<string> columns,
        int timeoutMs,
        string label,
        ServerConnectionInfo connectionInfo,
        string? sqlLocalTimestamp)
    {
        var commandTimeoutSeconds = Math.Max(1, timeoutMs / 1000);

        return await Task.Run(() =>
        {
            using var command = new IRISCommand(sqlText, session.Connection)
            {
                CommandType = CommandType.Text,
                CommandTimeout = commandTimeoutSeconds
            };

            using var reader = command.ExecuteReader();
            var rows = new List<Dictionary<string, object?>>();

            while (reader.Read())
            {
                var row = new Dictionary<string, object?>(StringComparer.Ordinal);
                foreach (var column in columns)
                {
                    object? value;
                    try
                    {
                        value = reader[column];
                    }
                    catch
                    {
                        value = null;
                    }

                    row[column] = NormalizeCellValue(value);
                }

                if (!string.IsNullOrWhiteSpace(sqlLocalTimestamp))
                {
                    var baselineMs = ToEpochMsFromSqlLike(sqlLocalTimestamp);
                    var createdMs = ToEpochMsFromSqlLike(row.GetValueOrDefault("CreatedDtTM")?.ToString());
                    var lastmodMs = ToEpochMsFromSqlLike(row.GetValueOrDefault("LastmodDtTM")?.ToString());
                    var createdMatched = baselineMs != null && createdMs != null && createdMs >= baselineMs;
                    var lastmodMatched = baselineMs != null && lastmodMs != null && lastmodMs >= baselineMs;

                    var createdText = row.GetValueOrDefault("CreatedDtTM")?.ToString()?.Trim() ?? string.Empty;
                    var lastmodText = row.GetValueOrDefault("LastmodDtTM")?.ToString()?.Trim() ?? string.Empty;
                    var sameTimestamp = (createdMs != null && lastmodMs != null && createdMs == lastmodMs)
                        || (!string.IsNullOrEmpty(createdText) && createdText == lastmodText);

                    row["__syncMatch"] = (createdMatched && sameTimestamp)
                        ? "created"
                        : createdMatched && lastmodMatched
                            ? "both"
                            : createdMatched
                                ? "created"
                                : lastmodMatched
                                    ? "lastmod"
                                    : "none";
                }

                rows.Add(row);
            }

            return new QueryResult(rows, sqlText);
        });
    }

    public static string UpdateTpSyncTimeGlobal(PooledSession session, string? @namespace, string? operation, string? serverPort, string? username)
    {
        var timestamp = DateTime.UtcNow.ToString("O");
        var safeNamespace = string.IsNullOrWhiteSpace(@namespace) ? "UNKNOWN" : @namespace;
        var safeOperation = string.IsNullOrWhiteSpace(operation) ? "GENERAL" : operation;
        var safeServerPort = string.IsNullOrWhiteSpace(serverPort) ? "UNKNOWN" : serverPort;
        var safeUsername = string.IsNullOrWhiteSpace(username) ? "UNKNOWN" : username;

        var iris = IRIS.CreateIRIS(session.Connection);
        iris.Set(timestamp, "TPSyncTime");
        iris.Set(timestamp, "TPSyncTime", safeNamespace, safeOperation, "LastRunAt");
        iris.Set(safeServerPort, "TPSyncTime", safeNamespace, safeOperation, "ServerPort");
        iris.Set(safeUsername, "TPSyncTime", safeNamespace, safeOperation, "User");

        return timestamp;
    }

    public static string? GetTpSyncTimeGlobal(PooledSession session)
    {
        var iris = IRIS.CreateIRIS(session.Connection);
        return TryGetGlobalString(iris, "TPSyncTime");
    }

    public static string? GetTpSyncLastRunAtGlobal(PooledSession session, string? @namespace, string? operation)
    {
        var safeNamespace = string.IsNullOrWhiteSpace(@namespace) ? "UNKNOWN" : @namespace;
        var safeOperation = string.IsNullOrWhiteSpace(operation) ? "GENERAL" : operation;
        Console.WriteLine($"[TPSyncTime][READ][BEFORE] namespace={safeNamespace} operation={safeOperation} key=TPSyncTime|{safeNamespace}|{safeOperation}|LastRunAt");

        var iris = IRIS.CreateIRIS(session.Connection);
        var value = TryGetGlobalString(iris, "TPSyncTime", safeNamespace, safeOperation, "LastRunAt");

        var matchingKeys = FindOperationLastRunAtCandidates(iris, safeOperation)
            .Take(10)
            .ToArray();

        Console.WriteLine($"[TPSyncTime][GLOBAL][VALUE] node=^TPSyncTime(\"{safeNamespace}\",\"{safeOperation}\",\"LastRunAt\") value={(value ?? "<null>")}");
        Console.WriteLine($"[TPSyncTime][READ][AFTER] namespace={safeNamespace} operation={safeOperation} found={!string.IsNullOrWhiteSpace(value)} value={(value ?? "<null>")} matchingKeys={matchingKeys.Length}");
        if (matchingKeys.Length > 0)
        {
            Console.WriteLine($"[TPSyncTime][READ][KEYS] operation={safeOperation} keys={string.Join("; ", matchingKeys)}");
        }

        return value;
    }

    public static int SyncTpSyncTimeGlobal(PooledSession sourceSession, PooledSession destinationSession, string? sourceNamespace, string? destinationNamespace)
    {
        var safeSourceNamespace = string.IsNullOrWhiteSpace(sourceNamespace) ? "UNKNOWN" : sourceNamespace;
        var safeDestinationNamespace = string.IsNullOrWhiteSpace(destinationNamespace) ? safeSourceNamespace : destinationNamespace;
        var copied = 0;
        var sourceIris = IRIS.CreateIRIS(sourceSession.Connection);
        var destinationIris = IRIS.CreateIRIS(destinationSession.Connection);

        var rootTimestamp = TryGetGlobalString(sourceIris, "TPSyncTime");
        if (!string.IsNullOrWhiteSpace(rootTimestamp))
        {
            destinationIris.Set(rootTimestamp, "TPSyncTime");
            copied++;
        }

        foreach (var operation in new[] { "ConnectStatus", "TradingPartner", "TPIDS", "TRADELINKS", "TRANSACTIONTYPES" })
        {
            foreach (var field in new[] { "LastRunAt", "ServerPort", "User" })
            {
                var value = TryGetGlobalString(sourceIris, "TPSyncTime", safeSourceNamespace, operation, field);
                if (value != null)
                {
                    destinationIris.Set(value, "TPSyncTime", safeDestinationNamespace, operation, field);
                    copied++;
                }
            }
        }

        return copied;
    }

    public static async Task<SyncResult> SyncRowsByTable(
        PooledSession sourceSession,
        PooledSession destinationSession,
        string tableName,
        string? sinceLastRunAt,
        int timezoneOffsetMinutes,
        int timeoutMs,
        ServerConnectionInfo connectionInfo,
        Func<Dictionary<string, object?>, Task<Dictionary<string, object?>?>>? transformRow,
        bool ignoreSinceLastRunAt,
        string? sourceParentKeyColumn,
        List<string>? sourceParentIds,
        string? sourceWhereClause,
        List<string>? skipUpsertKeys,
        bool logSourceRows,
        string? sinceFilterMode,
        bool? useHardcodedRouting = null)
    {
        var startedAt = DateTime.UtcNow;
        if (!TableSyncConfigs.TryGetValue(tableName, out var config))
        {
            throw new InvalidOperationException($"Unsupported table for sync: {tableName}");
        }

        var destinationHasRows = DestinationTableHasAnyRows(destinationSession, config.TableName);
        var effectiveSinceLastRunAt = ignoreSinceLastRunAt
            ? null
            : destinationHasRows
                ? sinceLastRunAt
                : null;

        string whereClause;
        string? sqlLocalTimestamp = null;
        if (!string.IsNullOrWhiteSpace(sourceWhereClause))
        {
            var trimmed = sourceWhereClause!.Trim();
            whereClause = Regex.IsMatch(trimmed, "^where\\s+", RegexOptions.IgnoreCase)
                ? $" {trimmed}"
                : $" WHERE {trimmed}";
        }
        else if (!string.IsNullOrWhiteSpace(sourceParentKeyColumn) && sourceParentIds != null && sourceParentIds.Count > 0)
        {
            var inList = string.Join(", ", sourceParentIds.Select(ToSqlLiteral));
            whereClause = $" WHERE {sourceParentKeyColumn} IN ({inList})";
        }
        else if (!string.IsNullOrWhiteSpace(sourceParentKeyColumn) && sourceParentIds != null && sourceParentIds.Count == 0)
        {
            whereClause = " WHERE 1 = 0";
        }
        else
        {
            var since = BuildSinceFilter(effectiveSinceLastRunAt, timezoneOffsetMinutes, sinceFilterMode);
            whereClause = since.WhereClause;
            sqlLocalTimestamp = since.SqlLocalTimestamp;
        }

        var sourceSql = $"SELECT {string.Join(", ", config.Columns)} FROM {config.TableName}{whereClause}";
        var rows = (await QueryRowsByColumns(
            sourceSession,
            sourceSql,
            config.Columns,
            timeoutMs,
            $"{tableName} sync source query",
            connectionInfo,
            sqlLocalTimestamp)).Rows;

        if (logSourceRows)
        {
            _ = JsonSerializer.Serialize(rows);
        }

        var inserted = 0;
        var updated = 0;
        var insertedOnMissingUpdate = 0;
        var skipped = 0;
        var errorCount = 0;
        var errorSamples = new List<Dictionary<string, object?>>();
        var upsertKeySet = new HashSet<string>(StringComparer.Ordinal);
        var skipKeySet = skipUpsertKeys != null
            ? new HashSet<string>(skipUpsertKeys, StringComparer.Ordinal)
            : null;

        foreach (var row in rows)
        {
            var candidateRow = transformRow != null ? await transformRow(new Dictionary<string, object?>(row)) : row;
            if (candidateRow == null)
            {
                skipped++;
                continue;
            }

            if (!candidateRow.TryGetValue(config.KeyColumn, out var keyValue) || keyValue == null || string.IsNullOrWhiteSpace(keyValue.ToString()))
            {
                skipped++;
                continue;
            }

            var keyText = keyValue.ToString()!;
            if (skipKeySet != null && skipKeySet.Contains(keyText))
            {
                skipped++;
                continue;
            }

            upsertKeySet.Add(keyText);

            try
            {
                var matchType = candidateRow.GetValueOrDefault("__syncMatch")?.ToString() ?? "none";

                if (ignoreSinceLastRunAt)
                {
                    var exists = DestinationRowExists(destinationSession, config.TableName, config.KeyColumn, keyValue);
                    if (exists)
                    {
                        var updateSql = BuildUpdateSql(config.TableName, config.KeyColumn, candidateRow, useHardcodedRouting);
                        if (!string.IsNullOrWhiteSpace(updateSql))
                        {
                            RunNonQuery(destinationSession, updateSql!);
                            updated++;
                        }
                        else
                        {
                            skipped++;
                        }
                    }
                    else
                    {
                        var insertSql = BuildInsertSql(config.TableName, candidateRow, useHardcodedRouting);
                        RunNonQuery(destinationSession, insertSql);
                        inserted++;
                    }

                    continue;
                }

                if (matchType == "created")
                {
                    var insertSql = BuildInsertSql(config.TableName, candidateRow, useHardcodedRouting);
                    RunNonQuery(destinationSession, insertSql);
                    inserted++;
                    continue;
                }

                if (matchType is "lastmod" or "both")
                {
                    var exists = DestinationRowExists(destinationSession, config.TableName, config.KeyColumn, keyValue);
                    if (exists)
                    {
                        var updateSql = BuildUpdateSql(config.TableName, config.KeyColumn, candidateRow, useHardcodedRouting);
                        if (!string.IsNullOrWhiteSpace(updateSql))
                        {
                            RunNonQuery(destinationSession, updateSql!);
                            updated++;
                        }
                        else
                        {
                            skipped++;
                        }
                    }
                    else
                    {
                        var insertSql = BuildInsertSql(config.TableName, candidateRow, useHardcodedRouting);
                        RunNonQuery(destinationSession, insertSql);
                        insertedOnMissingUpdate++;
                    }

                    continue;
                }

                RunNonQuery(destinationSession, BuildInsertSql(config.TableName, candidateRow, useHardcodedRouting));
                inserted++;
            }
            catch (Exception ex)
            {
                errorCount++;
                if (errorSamples.Count < 10)
                {
                    errorSamples.Add(new Dictionary<string, object?>
                    {
                        ["key"] = keyText,
                        ["message"] = ex.Message
                    });
                }
            }
        }

        return new SyncResult
        {
            SourceSql = sourceSql,
            DestinationHasRows = destinationHasRows,
            DurationMs = (long)(DateTime.UtcNow - startedAt).TotalMilliseconds,
            Processed = rows.Count,
            Inserted = inserted,
            Updated = updated,
            InsertedOnMissingUpdate = insertedOnMissingUpdate,
            Skipped = skipped,
            ErrorCount = errorCount,
            ErrorSamples = errorSamples,
            UpsertKeys = upsertKeySet.ToList()
        };
    }

    public static async Task<SyncResult> SyncTradingPartnersForTpids(
        PooledSession sourceSession,
        PooledSession destinationSession,
        string? sinceLastRunAt,
        int timezoneOffsetMinutes,
        int timeoutMs,
        ServerConnectionInfo connectionInfo,
        string? sinceFilterMode,
        bool ignoreSinceLastRunAt)
    {
        var startedAt = DateTime.UtcNow;
        var effectiveSince = ignoreSinceLastRunAt ? null : sinceLastRunAt;
        var since = BuildSinceFilter(effectiveSince, timezoneOffsetMinutes, sinceFilterMode);

        var sourceSql = $"SELECT %ID AS ID, Name, ContactName, ContactEmail, ContactPhone, Type, EdifecsId, CreatedDtTM, CreateID, LastmodDtTM, LastmodID FROM IHC_TPManage.TradingPartner{since.WhereClause}";
        var rows = (await QueryRowsByColumns(
            sourceSession,
            sourceSql,
            TradingPartnerSyncColumns,
            timeoutMs,
            "TradingPartner sync source query",
            connectionInfo,
            since.SqlLocalTimestamp)).Rows;

        var sourceToDestinationIdMap = new Dictionary<string, object?>();
        var sourceTradingPartnerIds = new List<string>();
        var inserted = 0;
        var updated = 0;
        var insertedOnMissingUpdate = 0;
        var skipped = 0;
        var errorCount = 0;
        var errorSamples = new List<Dictionary<string, object?>>();

        foreach (var row in rows)
        {
            var sourceId = row.GetValueOrDefault("ID");
            if (sourceId != null)
            {
                sourceTradingPartnerIds.Add(sourceId.ToString()!);
            }

            var sourceName = row.GetValueOrDefault("Name")?.ToString();
            if (string.IsNullOrWhiteSpace(sourceName))
            {
                skipped++;
                continue;
            }

            try
            {
                var matchType = row.GetValueOrDefault("__syncMatch")?.ToString() ?? "none";
                var destinationId = GetDestinationIdByColumn(destinationSession, "IHC_TPManage.TradingPartner", "Name", sourceName);

                if (destinationId != null)
                {
                    var updateSql = BuildUpdateSql("IHC_TPManage.TradingPartner", "Name", row);
                    if (!string.IsNullOrWhiteSpace(updateSql))
                    {
                        RunNonQuery(destinationSession, updateSql!);
                        updated++;
                    }
                    else
                    {
                        skipped++;
                    }
                }
                else
                {
                    RunNonQuery(destinationSession, BuildInsertSql("IHC_TPManage.TradingPartner", row));
                    destinationId = GetDestinationIdByColumn(destinationSession, "IHC_TPManage.TradingPartner", "Name", sourceName);

                    if (matchType is "lastmod" or "both")
                    {
                        insertedOnMissingUpdate++;
                    }
                    else
                    {
                        inserted++;
                    }
                }

                if (sourceId != null && destinationId != null)
                {
                    sourceToDestinationIdMap[sourceId.ToString()!] = destinationId;
                }
            }
            catch (Exception ex)
            {
                errorCount++;
                if (errorSamples.Count < 10)
                {
                    errorSamples.Add(new Dictionary<string, object?>
                    {
                        ["key"] = sourceName,
                        ["message"] = ex.Message
                    });
                }
            }
        }

        return new SyncResult
        {
            SourceSql = sourceSql,
            DurationMs = (long)(DateTime.UtcNow - startedAt).TotalMilliseconds,
            Processed = rows.Count,
            Inserted = inserted,
            Updated = updated,
            InsertedOnMissingUpdate = insertedOnMissingUpdate,
            Skipped = skipped,
            ErrorCount = errorCount,
            ErrorSamples = errorSamples,
            SourceToDestinationIdMap = sourceToDestinationIdMap,
            SourceTradingPartnerIds = sourceTradingPartnerIds
        };
    }

    public static async Task<object?> EnsureDestinationTradingPartnerIdForSourceId(
        PooledSession sourceSession,
        PooledSession destinationSession,
        object sourceTradingPartnerId,
        int timeoutMs,
        ServerConnectionInfo connectionInfo)
    {
        if (sourceTradingPartnerId == null || string.IsNullOrWhiteSpace(sourceTradingPartnerId.ToString()))
        {
            return null;
        }

        var sourceSql = $"SELECT TOP 1 %ID AS ID, Name, ContactName, ContactEmail, ContactPhone, Type, EdifecsId, CreatedDtTM, CreateID, LastmodDtTM, LastmodID FROM IHC_TPManage.TradingPartner WHERE %ID = {ToSqlLiteral(sourceTradingPartnerId)}";
        var sourceRows = (await QueryRowsByColumns(
            sourceSession,
            sourceSql,
            TradingPartnerSyncColumns,
            timeoutMs,
            "TradingPartner lookup by source ID",
            connectionInfo,
            null)).Rows;

        var sourceRow = sourceRows.FirstOrDefault();
        var sourceName = sourceRow?.GetValueOrDefault("Name")?.ToString();
        if (sourceRow == null || string.IsNullOrWhiteSpace(sourceName))
        {
            return null;
        }

        var destinationId = GetDestinationIdByColumn(destinationSession, "IHC_TPManage.TradingPartner", "Name", sourceName);
        if (destinationId != null)
        {
            var updateSql = BuildUpdateSql("IHC_TPManage.TradingPartner", "Name", sourceRow);
            if (!string.IsNullOrWhiteSpace(updateSql))
            {
                RunNonQuery(destinationSession, updateSql!);
            }

            return destinationId;
        }

        RunNonQuery(destinationSession, BuildInsertSql("IHC_TPManage.TradingPartner", sourceRow));
        return GetDestinationIdByColumn(destinationSession, "IHC_TPManage.TradingPartner", "Name", sourceName);
    }

    public static async Task<Dictionary<string, object?>> BuildSourceToDestinationIdMapByKeys(
        PooledSession sourceSession,
        PooledSession destinationSession,
        string sourceTableName,
        string destinationTableName,
        List<string> keyColumns,
        int timeoutMs,
        ServerConnectionInfo connectionInfo,
        string label)
    {
        var selectColumns = new List<string> { "ID" };
        selectColumns.AddRange(keyColumns);

        var sourceSql = $"SELECT %ID AS ID, {string.Join(", ", keyColumns)} FROM {sourceTableName}";
        var destinationSql = $"SELECT %ID AS ID, {string.Join(", ", keyColumns)} FROM {destinationTableName}";

        var sourceRows = (await QueryRowsByColumns(sourceSession, sourceSql, selectColumns, timeoutMs, $"{label} source map query", connectionInfo, null)).Rows;
        var destinationRows = (await QueryRowsByColumns(destinationSession, destinationSql, selectColumns, timeoutMs, $"{label} destination map query", connectionInfo, null)).Rows;

        var destinationByKey = new Dictionary<string, object?>(StringComparer.Ordinal);
        foreach (var row in destinationRows)
        {
            var key = BuildCompositeKey(row, keyColumns);
            if (!destinationByKey.ContainsKey(key))
            {
                destinationByKey[key] = row.GetValueOrDefault("ID");
            }
        }

        var sourceToDestinationMap = new Dictionary<string, object?>();
        foreach (var row in sourceRows)
        {
            var sourceId = row.GetValueOrDefault("ID");
            if (sourceId == null)
            {
                continue;
            }

            var key = BuildCompositeKey(row, keyColumns);
            if (destinationByKey.TryGetValue(key, out var destinationId) && destinationId != null)
            {
                sourceToDestinationMap[sourceId.ToString()!] = destinationId;
            }
        }

        return sourceToDestinationMap;
    }

    public static string ToSqlLiteral(object? value)
    {
        if (value == null)
        {
            return "NULL";
        }

        return value switch
        {
            int i => i.ToString(CultureInfo.InvariantCulture),
            long l => l.ToString(CultureInfo.InvariantCulture),
            short s => s.ToString(CultureInfo.InvariantCulture),
            byte b => b.ToString(CultureInfo.InvariantCulture),
            decimal d => d.ToString(CultureInfo.InvariantCulture),
            double d => d.ToString(CultureInfo.InvariantCulture),
            float f => f.ToString(CultureInfo.InvariantCulture),
            bool b => b ? "1" : "0",
            _ => $"'{value.ToString()!.Replace("'", "''")}'"
        };
    }

    private static string GetSessionKey(ServerTarget target, string @namespace, string username, string password)
    {
        return $"{target.Host}:{target.Port}|{@namespace}|{username}|{password}";
    }

    private static string? TryGetGlobalString(IRIS iris, string globalName, params object[] subscripts)
    {
        try
        {
            return iris.GetString(globalName, subscripts);
        }
        catch
        {
            return null;
        }
    }

    private static IEnumerable<string> FindOperationLastRunAtCandidates(IRIS iris, string operation)
    {
        var seen = new HashSet<string>(StringComparer.Ordinal);

        IRISIterator? namespaceIterator = null;
        try
        {
            namespaceIterator = iris.GetIRISIterator("TPSyncTime");
        }
        catch
        {
            yield break;
        }

        foreach (var _ in namespaceIterator)
        {
            var namespaceSubscript = namespaceIterator.CurrentSubscript?.ToString();
            if (string.IsNullOrWhiteSpace(namespaceSubscript))
            {
                continue;
            }

            var value = TryGetGlobalString(iris, "TPSyncTime", namespaceSubscript, operation, "LastRunAt");
            if (string.IsNullOrWhiteSpace(value))
            {
                continue;
            }

            var candidate = $"TPSyncTime|{namespaceSubscript}|{operation}|LastRunAt={value}";
            if (seen.Add(candidate))
            {
                yield return candidate;
            }
        }
    }

    private static PooledSession CreateIrisSession(string key, ServerTarget target, string @namespace, string username, string password, int timeoutMs)
    {
        var timeoutSeconds = Math.Max(1, timeoutMs / 1000);
        var connectionString = $"Server={target.Host};Port={target.Port};Namespace={@namespace};User ID={username};Password={password};Connection Timeout={timeoutSeconds};";

        var connection = new IRISConnection(connectionString);
        connection.Open();
        return new PooledSession(key, connection);
    }

    private static object? NormalizeCellValue(object? value)
    {
        if (value == null || value == DBNull.Value)
        {
            return null;
        }

        if (value is DateTime dateTime)
        {
            return dateTime.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture);
        }

        if (value is DateTimeOffset dateTimeOffset)
        {
            return dateTimeOffset.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture);
        }

        if (value is byte[] bytes)
        {
            return Convert.ToBase64String(bytes);
        }

        return value;
    }

    private static void RunNonQuery(PooledSession session, string sqlText)
    {
        using var command = new IRISCommand(sqlText, session.Connection)
        {
            CommandType = CommandType.Text
        };
        command.ExecuteNonQuery();
    }

    private static bool DestinationRowExists(PooledSession session, string tableName, string keyColumn, object keyValue)
    {
        var sql = $"SELECT TOP 1 {keyColumn} FROM {tableName} WHERE {keyColumn} = {ToSqlLiteral(keyValue)}";
        using var command = new IRISCommand(sql, session.Connection)
        {
            CommandType = CommandType.Text
        };
        using var reader = command.ExecuteReader();
        return reader.Read();
    }

    private static bool DestinationTableHasAnyRows(PooledSession session, string tableName)
    {
        var sql = $"SELECT TOP 1 %ID AS ID FROM {tableName}";
        using var command = new IRISCommand(sql, session.Connection)
        {
            CommandType = CommandType.Text
        };
        using var reader = command.ExecuteReader();
        return reader.Read();
    }

    private static object? GetDestinationIdByColumn(PooledSession session, string tableName, string keyColumn, object keyValue)
    {
        var sql = $"SELECT TOP 1 %ID AS ID FROM {tableName} WHERE {keyColumn} = {ToSqlLiteral(keyValue)}";
        using var command = new IRISCommand(sql, session.Connection)
        {
            CommandType = CommandType.Text
        };

        var scalar = command.ExecuteScalar();
        return scalar == DBNull.Value ? null : scalar;
    }

    private static string BuildInsertSql(string tableName, Dictionary<string, object?> row, bool? useHardcodedRouting = null)
    {
        var rowForInsert = new Dictionary<string, object?>(row, StringComparer.Ordinal);
        if (string.Equals(tableName, "IHC_TPManage.TRADELINKS", StringComparison.Ordinal))
        {
            // If user explicitly chose to hardcode routing, do it. Otherwise, keep the source value.
            if (useHardcodedRouting == true)
            {
                rowForInsert["Routing"] = "BitBucket";
            }
            // If useHardcodedRouting is false or null, the Routing value from source is preserved
        }

        var columns = rowForInsert.Keys
            .Where(column => !string.Equals(column, "ID", StringComparison.Ordinal) && !column.StartsWith("__", StringComparison.Ordinal))
            .ToList();

        var values = columns.Select(column => ToSqlLiteral(rowForInsert.GetValueOrDefault(column))).ToList();
        return $"INSERT INTO {tableName} ({string.Join(", ", columns)}) VALUES ({string.Join(", ", values)})";
    }

    private static string? BuildUpdateSql(string tableName, string keyColumn, Dictionary<string, object?> row, bool? useHardcodedRouting = null)
    {
        var rowForUpdate = new Dictionary<string, object?>(row, StringComparer.Ordinal);

        // Handle routing hardcoding for TRADELINKS updates
        if (string.Equals(tableName, "IHC_TPManage.TRADELINKS", StringComparison.Ordinal))
        {
            if (useHardcodedRouting == true)
            {
                rowForUpdate["Routing"] = "BitBucket";
            }
            // If false or null, preserve source value
        }

        var setColumns = rowForUpdate.Keys
            .Where(column => !string.Equals(column, "ID", StringComparison.Ordinal)
                             && !string.Equals(column, keyColumn, StringComparison.Ordinal)
                             && !column.StartsWith("__", StringComparison.Ordinal))
            .ToList();

        if (setColumns.Count == 0)
        {
            return null;
        }

        var setClause = string.Join(", ", setColumns.Select(column => $"{column} = {ToSqlLiteral(rowForUpdate.GetValueOrDefault(column))}"));
        return $"UPDATE {tableName} SET {setClause} WHERE {keyColumn} = {ToSqlLiteral(rowForUpdate.GetValueOrDefault(keyColumn))}";
    }

    private static (string WhereClause, string? SqlLocalTimestamp) BuildSinceFilter(string? sinceLastRunAt, int timezoneOffsetMinutes, string? sinceFilterMode)
    {
        if (string.IsNullOrWhiteSpace(sinceLastRunAt))
        {
            return (string.Empty, null);
        }

        var mode = (sinceFilterMode ?? "both").Trim().ToLowerInvariant();
        if (mode is not "both" and not "created" and not "lastmod")
        {
            mode = "both";
        }

        var trimmed = sinceLastRunAt.Trim();
        var isoPattern = new Regex("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d{1,7})?Z$", RegexOptions.CultureInvariant);
        var sqlPattern = new Regex("^(\\d{4})-(\\d{2})-(\\d{2})[ T](\\d{2}):(\\d{2}):(\\d{2})(\\.\\d{1,7})?$", RegexOptions.CultureInvariant);

        string? sqlLocalTimestamp;
        if (isoPattern.IsMatch(trimmed))
        {
            sqlLocalTimestamp = FormatSqlTimestampFromUtc(trimmed, timezoneOffsetMinutes);
        }
        else if (sqlPattern.IsMatch(trimmed))
        {
            // Already SQL-like local timestamp format.
            if (!DateTime.TryParse(trimmed, CultureInfo.InvariantCulture, DateTimeStyles.AssumeLocal, out var localParsed))
            {
                return (string.Empty, null);
            }

            sqlLocalTimestamp = localParsed.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture);
        }
        else if (DateTimeOffset.TryParse(trimmed, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var parsedOffset))
        {
            sqlLocalTimestamp = FormatSqlTimestampFromUtc(parsedOffset.UtcDateTime.ToString("O", CultureInfo.InvariantCulture), timezoneOffsetMinutes);
        }
        else
        {
            return (string.Empty, null);
        }

        if (sqlLocalTimestamp == null)
        {
            return (string.Empty, null);
        }

        Console.WriteLine($"[TPSyncTime][SQL][SINCE] input={trimmed} timezoneOffsetMinutes={timezoneOffsetMinutes} mode={mode} sqlLocalTimestamp={sqlLocalTimestamp}");

        var whereClause = mode switch
        {
            "created" => $" WHERE CreatedDtTM >= '{sqlLocalTimestamp}'",
            "lastmod" => $" WHERE LastmodDtTM >= '{sqlLocalTimestamp}' AND (CreatedDtTM IS NULL OR CreatedDtTM <> LastmodDtTM)",
            _ => $" WHERE CreatedDtTM >= '{sqlLocalTimestamp}' OR LastmodDtTM >= '{sqlLocalTimestamp}'"
        };

        return (whereClause, sqlLocalTimestamp);
    }

    private static string? FormatSqlTimestampFromUtc(string utcIsoTimestamp, int timezoneOffsetMinutes)
    {
        if (!DateTimeOffset.TryParse(utcIsoTimestamp, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var utcDate))
        {
            return null;
        }

        // Browser sends getTimezoneOffset(): local = UTC - offsetMinutes.
        var localDate = utcDate.UtcDateTime.AddMinutes(-timezoneOffsetMinutes);

        return localDate.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture);
    }

    private static long? ToEpochMsFromSqlLike(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var text = value.Trim();
        var sqlPattern = new Regex("^(\\d{4})-(\\d{2})-(\\d{2})[ T](\\d{2}):(\\d{2}):(\\d{2})(\\.\\d{1,7})?$", RegexOptions.CultureInvariant);
        var match = sqlPattern.Match(text);
        if (match.Success)
        {
            var normalized = $"{match.Groups[1].Value}-{match.Groups[2].Value}-{match.Groups[3].Value}T{match.Groups[4].Value}:{match.Groups[5].Value}:{match.Groups[6].Value}{match.Groups[7].Value}";
            if (DateTime.TryParse(normalized, CultureInfo.InvariantCulture, DateTimeStyles.AssumeLocal, out var sqlDate))
            {
                return new DateTimeOffset(sqlDate).ToUnixTimeMilliseconds();
            }

            return null;
        }

        if (DateTime.TryParse(text, CultureInfo.InvariantCulture, DateTimeStyles.AssumeLocal, out var parsed))
        {
            return new DateTimeOffset(parsed).ToUnixTimeMilliseconds();
        }

        return null;
    }

    private static string BuildCompositeKey(Dictionary<string, object?> row, IReadOnlyList<string> keyColumns)
    {
        return string.Join("|", keyColumns.Select(column => row.GetValueOrDefault(column)?.ToString() ?? string.Empty));
    }

    private sealed record TableSyncConfig(string TableName, IReadOnlyList<string> Columns, string KeyColumn);
}
