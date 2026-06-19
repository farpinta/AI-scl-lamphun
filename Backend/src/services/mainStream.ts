import { eq, sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { cacheEntries, deviceData, devices } from '../db/schema'

type MainStreamDevice = {
  deviceId: string
  deviceSecretKey: string
  monitorItem: string
}

type MainStreamBatchResponse = {
  code: number
  data: Array<{
    data: Array<{
      monitorItem: string
      monitorTime: string
      monitorValue: string
      nodeId?: string
    }>
    dataStatus: number
    deviceId: string
    deviceStatus: number
    id: number
    customname: string
    name: string
    sensorNumber: number
  }>
  message: string
  status: string
}

type MainStreamLatestResponse = {
  code: number
  monitorValue: string
  monitorTime: string
}

const fiveMinMs = 5 * 60 * 1000
const halfHourMs = 30 * 60 * 1000
const deviceCacheTtlMs = Number(process.env.DEVICE_CACHE_TTL_MS ?? 300000)
const deviceCacheKey = 'main_stream_devices'

const isConnectionLostError = (error: unknown) => {
  if (typeof error !== 'object' || error === null) {
    return false
  }

  const code = 'code' in error ? String((error as { code?: string }).code) : ''
  const message =
    'message' in error
      ? String((error as { message?: string }).message).toLowerCase()
      : ''

  return (
    code === 'PROTOCOL_CONNECTION_LOST' ||
    code === 'ECONNRESET' ||
    code === '57P01' ||
    code === '57P02' ||
    code === '57P03' ||
    message.includes('connection terminated') ||
    message.includes('connection closed')
  )
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })

const warmUpDatabase = async (database: PostgresJsDatabase) => {
  try {
    await database.execute(sql`select 1`)
  } catch (error) {
    if (!isConnectionLostError(error)) {
      throw error
    }
    await sleep(500)
    await database.execute(sql`select 1`)
  }
}

const translateMainStreamMessage = (message: string) => {
  const translations: Record<string, string> = {
    '当前ip并发查询限制为1次,每秒钟查询限制为1次,每分钟查询限制为10次,限制条件触发':
      'Rate limit triggered: 1 concurrent, 1 per second, 10 per minute.'
  }

  return translations[message] ?? message
}

const isMainStreamDevice = (value: unknown): value is MainStreamDevice => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    typeof candidate.deviceId === 'string' &&
    typeof candidate.deviceSecretKey === 'string' &&
    typeof candidate.monitorItem === 'string'
  )
}

const loadDevicesFromDatabase = async (database: PostgresJsDatabase) => {
  const rows = await database.select().from(devices)

  return rows.flatMap((device) => {
    if (!device.deviceId || !device.monitorItem || !device.deviceKey) {
      return []
    }

    return [
      {
        deviceId: device.deviceId,
        deviceSecretKey: device.deviceKey,
        monitorItem: device.monitorItem
      }
    ]
  })
}

const loadDevicesFromCache = async (
  database: PostgresJsDatabase
): Promise<MainStreamDevice[] | null> => {
  const rows = await database
    .select({
      value: cacheEntries.value,
      expiresAt: cacheEntries.expiresAt
    })
    .from(cacheEntries)
    .where(eq(cacheEntries.key, deviceCacheKey))
    .limit(1)

  if (rows.length === 0) {
    return null
  }

  const [row] = rows

  if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) {
    return null
  }

  const cachedDevices = row.value['devices']

  if (!Array.isArray(cachedDevices)) {
    return null
  }

  const parsedDevices = cachedDevices.flatMap((item) =>
    isMainStreamDevice(item) ? [item] : []
  )

  if (parsedDevices.length !== cachedDevices.length) {
    return null
  }

  return parsedDevices
}

const writeDevicesToCache = async (
  database: PostgresJsDatabase,
  mainStreamDevices: MainStreamDevice[]
) => {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + deviceCacheTtlMs)

  await database
    .insert(cacheEntries)
    .values({
      key: deviceCacheKey,
      value: {
        devices: mainStreamDevices
      },
      expiresAt,
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: cacheEntries.key,
      set: {
        value: {
          devices: mainStreamDevices
        },
        expiresAt,
        updatedAt: now
      }
    })
}

const getDevicesWithCache = async (database: PostgresJsDatabase) => {
  const cachedDevices = await loadDevicesFromCache(database)
  if (cachedDevices !== null) {
    return cachedDevices
  }

  const freshDevices = await loadDevicesFromDatabase(database)
  await writeDevicesToCache(database, freshDevices)
  return freshDevices
}

const getDevicesWithCacheAndRetry = async (database: PostgresJsDatabase) => {
  try {
    return await getDevicesWithCache(database)
  } catch (error) {
    if (!isConnectionLostError(error)) {
      throw error
    }
    await sleep(1000)
    return await getDevicesWithCache(database)
  }
}

const fetchBatch = async (
  baseUrl: string,
  devices: MainStreamDevice[],
  start: number,
  end: number
) => {
  const response = await fetch(`${baseUrl}/batch`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      deviceList: devices.map(({ deviceId, deviceSecretKey }) => ({
        deviceId,
        deviceSecretKey
      })),
      monitorItem: devices.map((device) => device.monitorItem).join(', '),
      start,
      end
    })
  })

  if (!response.ok) {
    const text = await response.text()
    let translated = text

    try {
      const json = JSON.parse(text) as { message?: string }
      if (json.message) {
        translated = translateMainStreamMessage(json.message)
      }
    } catch {
      translated = translateMainStreamMessage(text)
    }

    throw new Error(
      `Main stream batch failed: ${response.status} ${translated}`
    )
  }

  return (await response.json()) as MainStreamBatchResponse
}

const fetchLatest = async (
  baseUrl: string,
  device: MainStreamDevice
): Promise<MainStreamLatestResponse> => {
  const response = await fetch(`${baseUrl}/latest?ts=${Date.now()}`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-cache, no-store, max-age=0',
      pragma: 'no-cache'
    },
    body: JSON.stringify({
      deviceId: device.deviceId,
      deviceSecretKey: device.deviceSecretKey,
      monitorItem: device.monitorItem
    })
  })

  if (!response.ok) {
    return {
      code: response.status,
      monitorValue: '',
      monitorTime: ''
    }
  }

  const payload = await response.json()
  const dataItem = payload?.data?.find(
    (item: { data?: Array<{ monitorValue?: string; monitorTime?: string }> }) =>
      Array.isArray(item.data) && item.data.length > 0
  )?.data?.[0]

  return {
    code: typeof payload?.code === 'number' ? payload.code : response.status,
    monitorValue: dataItem?.monitorValue ?? '',
    monitorTime: dataItem?.monitorTime ?? ''
  }
}


const storeBatchCorrection = async (
  database: PostgresJsDatabase,
  payload: MainStreamBatchResponse
) => {
  if (!payload || !Array.isArray(payload.data)) {
    const translated = payload?.message
      ? translateMainStreamMessage(payload.message)
      : undefined
    console.warn('Main stream payload missing data field', {
      ...payload,
      translatedMessage: translated
    })
    return
  }

  const rows = payload.data.flatMap((device) =>
    device.data.flatMap((item) => {
      try {
        return [
          {
            deviceId: device.deviceId,
            monitorItem: item.monitorItem,
            monitorTime: utcStringToUtcPlus7(item.monitorTime),
            monitorValue: item.monitorValue
          }
        ]
      } catch (error) {
        console.warn('Skipping main stream record due to invalid monitorTime', {
          deviceId: device.deviceId,
          monitorItem: item.monitorItem,
          monitorTime: item.monitorTime,
          error: error instanceof Error ? error.message : String(error)
        })
        return []
      }
    })
  )

  if (rows.length === 0) {
    return
  }

  let inserted = 0
  const chunkSize = 100
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)
    const result = await database
      .insert(deviceData)
      .values(chunk)
      .onConflictDoNothing({
        target: [deviceData.deviceId, deviceData.monitorTime]
      })
    inserted += result?.rowCount ?? 0
  }
  console.log(`Correction sync: ${inserted} missing rows filled`)
}

const storeLatest = async (
  database: PostgresJsDatabase,
  device: MainStreamDevice,
  payload: MainStreamLatestResponse
) => {
  if (!payload.monitorTime || !payload.monitorValue) {
    return
  }

  let normalizedTime: string
  try {
    normalizedTime = utcStringToUtcPlus7(payload.monitorTime)
  } catch (error) {
    console.warn('Skipping latest main stream record due to invalid monitorTime', {
      deviceId: device.deviceId,
      monitorItem: device.monitorItem,
      monitorTime: payload.monitorTime,
      error: error instanceof Error ? error.message : String(error)
    })
    return
  }

  await database
    .insert(deviceData)
    .values({
      deviceId: device.deviceId,
      monitorItem: device.monitorItem,
      monitorTime: normalizedTime,
      monitorValue: payload.monitorValue
    })
    .onConflictDoUpdate({
      target: [deviceData.deviceId, deviceData.monitorTime],
      set: { monitorValue: sql`excluded."monitorValue"` }
    })
}

const syncLatestForDevices = async (
  database: PostgresJsDatabase,
  baseUrl: string,
  mainStreamDevices: MainStreamDevice[]
) => {
  const results = await Promise.allSettled(
    mainStreamDevices.map(async (device) => {
      try {
        const latestPayload = await fetchLatest(baseUrl, device)
        await storeLatest(database, device, latestPayload)
      } catch (error) {
        console.error('Main stream latest sync failed for device', device.deviceId, error)
      }
    })
  )
  const failed = results.filter((r) => r.status === 'rejected').length
  if (failed > 0) {
    console.warn(`Latest sync: ${failed} device(s) failed`)
  }
}

export const startMainStreamLatestSync = (
  database: PostgresJsDatabase,
  intervalMs: number = fiveMinMs
) => {
  const baseUrl = process.env.MAIN_STREAM_URL

  if (!baseUrl) {
    console.warn('MAIN_STREAM_URL is not set. Latest sync disabled.')
    return
  }

  let running = false

  const runSync = async () => {
    if (running) {
      console.warn('Latest sync still running — skipping this tick')
      return
    }
    running = true

    try {
      await warmUpDatabase(database)
      const mainStreamDevices = await getDevicesWithCacheAndRetry(database)

      if (mainStreamDevices.length === 0) {
        console.warn('No main stream devices available. Latest sync skipped.')
        return
      }

      await syncLatestForDevices(database, baseUrl, mainStreamDevices)
      console.log('Latest sync completed successfully')
    } catch (error) {
      console.error('Latest sync failed', error)
    } finally {
      running = false
    }
  }

  const scheduleNext = () => {
    const nextAligned = Math.ceil(Date.now() / intervalMs) * intervalMs
    const delay = nextAligned - Date.now()
    setTimeout(async () => {
      await runSync()
      scheduleNext()
    }, delay)
  }

  void runSync()
  scheduleNext()
}

export const startMainStreamCorrectionSync = (
  database: PostgresJsDatabase,
  intervalMs: number = halfHourMs
) => {
  const baseUrl = process.env.MAIN_STREAM_URL

  if (!baseUrl) {
    console.warn('MAIN_STREAM_URL is not set. Correction sync disabled.')
    return
  }

  let running = false

  const runSync = async () => {
    if (running) {
      console.warn('Correction sync still running — skipping this tick')
      return
    }
    running = true

    try {
      await warmUpDatabase(database)
      const end = Date.now()
      const start = end - halfHourMs

      const mainStreamDevices = await getDevicesWithCacheAndRetry(database)

      if (mainStreamDevices.length === 0) {
        console.warn('No main stream devices available. Correction sync skipped.')
        return
      }

      try {
        const payload = await fetchBatch(baseUrl, mainStreamDevices, start, end)
        await storeBatchCorrection(database, payload)
      } catch (error) {
        console.error('Correction sync failed', error)
      }
    } finally {
      running = false
    }
  }

  const scheduleNext = () => {
    const nextAligned = Math.ceil(Date.now() / intervalMs) * intervalMs
    const delay = nextAligned - Date.now()
    setTimeout(async () => {
      await runSync()
      scheduleNext()
    }, delay)
  }

  void runSync()
  scheduleNext()
}

const bangkokFormatter = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

export const toUtcPlus7String = (epochMs: number) =>
  bangkokFormatter.format(new Date(epochMs));

const clampToNow = (date: Date) => {
  const now = Date.now();
  if (date.getTime() > now) {
    return new Date(now);
  }
  return date;
};

export const utcStringToUtcPlus7 = (s: string) => {
  const value = s.trim();
  if (/^\d{10,13}$/.test(value)) {
    const epochMs = value.length === 13 ? Number(value) : Number(value) * 1000
    if (Number.isNaN(epochMs)) {
      throw new Error("Invalid datetime format");
    }
    return toUtcPlus7String(clampToNow(new Date(epochMs)).getTime());
  }

  const m = value.match(
    /^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,3}))?(?:\s?(Z|[+\-]\d{2}:?\d{2}))?$/
  );

  if (!m) throw new Error("Invalid datetime format");

  const [, yRaw, moRaw, dRaw, hRaw, miRaw, seRaw, msRaw, tzRaw] = m;
  const y = Number(yRaw);
  const mo = Number(moRaw);
  const d = Number(dRaw);
  const h = Number(hRaw);
  const mi = Number(miRaw);
  const se = Number(seRaw ?? '0');
  const ms = msRaw ? msRaw.padEnd(3, "0") : "000";
  if (!tzRaw) {
    const validationDate = new Date(
      Date.UTC(
        y,
        mo - 1,
        d,
        h,
        mi,
        se,
        Number(ms)
      )
    );

    const isValid =
      !Number.isNaN(validationDate.getTime()) &&
      validationDate.getUTCFullYear() === y &&
      validationDate.getUTCMonth() + 1 === mo &&
      validationDate.getUTCDate() === d &&
      validationDate.getUTCHours() === h &&
      validationDate.getUTCMinutes() === mi &&
      validationDate.getUTCSeconds() === se;

    if (!isValid) {
      throw new Error("Invalid datetime format");
    }

    // No timezone in source value means Mainstream clock time is UTC+8.
    // Convert UTC+8 -> UTC -> format in Bangkok time (UTC+7).
    const bangkokEpoch = Date.UTC(
      y,
      mo - 1,
      d,
      h - 8,
      mi,
      se,
      Number(ms)
    );
    return toUtcPlus7String(clampToNow(new Date(bangkokEpoch)).getTime());
  }

  const tz = tzRaw.includes(":") || tzRaw === "Z"
    ? tzRaw
    : `${tzRaw.slice(0, 3)}:${tzRaw.slice(3)}`;
  const pad2 = (n: number) => String(n).padStart(2, '0')
  const date = new Date(
    `${String(y).padStart(4, '0')}-${pad2(mo)}-${pad2(d)}T${pad2(h)}:${pad2(
      mi
    )}:${pad2(se)}.${ms}${tz}`
  );
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid datetime format");
  }

  return toUtcPlus7String(clampToNow(date).getTime());
};
