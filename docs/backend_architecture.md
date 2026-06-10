# Backend Architecture Diagram

```mermaid
graph TB
    subgraph CLIENTS["External Clients"]
        Browser["Web Browser"]
        MobileApp["Mobile App"]
        IoTDevices["IoT Devices"]
    end

    subgraph FRONTEND_PROXY["Frontend/Proxy"]
        ViteProxy["Vite Dev Server<br/>(Dev Mode)"]
        CDN["CDN / Load Balancer<br/>(Production)"]
    end

    subgraph BACKEND["ElysiaJS Backend Server"]
        direction TB
        
        subgraph ENTRY["Entry Point"]
            Server["Elysia Server<br/>Port 3000"]
            Config["Config<br/>PORT, ENV vars"]
        end
        
        subgraph MIDDLEWARE_STACK["Middleware Stack"]
            Cors["CORS Middleware<br/>(Allow All Origins)"]
            JWT["JWT Middleware<br/>(@elysiajs/jwt)"]
            ErrorHandler["Error Handler"]
        end
        
        subgraph API_ROUTES["API Routes"]
            direction LR
            
            subgraph AUTH_ROUTES["/api/v2/auth"]
                AuthLogin["POST /login"]
                AuthRegister["POST /register"]
                AuthMe["GET /me"]
                AuthRefresh["POST /refresh"]
                AuthLogout["POST /logout"]
            end
            
            subgraph DEVICE_ROUTES["/api/v2/device"]
                DeviceRegister["POST /register"]
                DeviceInfo["POST /info"]
                DeviceQuery["POST /"]
                DeviceBatch["POST /batch"]
                DeviceLatest["POST /latest"]
                DeviceDelete["DELETE /"]
            end
            
            subgraph USER_ROUTES["/api/v2/user"]
                UserOwns["GET /owns"]
                UserUpdate["PUT /"]
            end
        end
        
        subgraph SERVICES_LAYER["Services Layer"]
            MainStreamService["Main Stream Sync Service"]
            DeviceCache["Device Cache Service"]
            AuthService["Auth Service"]
        end
        
        subgraph DATA_ACCESS["Data Access Layer"]
            DrizzleORM["Drizzle ORM"]
            PostgresDriver["postgres-js Driver"]
        end
    end

    subgraph DATABASE["PostgreSQL Database"]
        direction TB
        
        subgraph TABLES["Tables"]
            Users["users<br/>----------<br/>id (PK)<br/>firstname<br/>lastname<br/>username<br/>email<br/>password_hash<br/>role<br/>created_at"]
            
            Devices["devices<br/>----------<br/>id (PK)<br/>deviceId (UNIQUE)<br/>deviceKey<br/>monitorItem<br/>name<br/>location<br/>latitude<br/>longitude<br/>warningLevel<br/>created_at"]
            
            Sessions["sessions<br/>----------<br/>id (PK)<br/>user_id (FK)<br/>refresh_token<br/>expires_at<br/>created_at"]
            
            DeviceData["device_data<br/>----------<br/>id (PK)<br/>device_id (FK)<br/>monitorItem<br/>monitorTime<br/>monitorValue<br/>(deviceId, monitorTime)<br/>UNIQUE index"]
            
            DeviceOwners["device_owners<br/>----------<br/>id (PK)<br/>user_id (FK)<br/>device_id (FK)<br/>(user_id, device_id)<br/>UNIQUE index"]
            
            CacheEntries["cache_entries<br/>----------<br/>id (PK)<br/>key (UNIQUE)<br/>value (JSONB)<br/>expires_at<br/>created_at"]
        end
        
        subgraph RELATIONSHIPS["Relationships"]
            rel1["users 1--o sessions"]
            rel2["users 1--o device_owners"]
            rel3["devices 1--o device_owners"]
            rel4["devices 1--o device_data"]
        end
    end

    subgraph EXTERNAL_APIS["External APIs"]
        MainStreamAPI["Main Stream API<br/>----------<br/>BASE_URL env var<br/>Endpoints:<br/>POST /batch<br/>GET /latest<br/>Auth: API Key"]
    end

    Browser -->|"HTTPS|React App"| ViteProxy
    MobileApp -.->|"Future"| CDN
    IoTDevices -->|"Direct API"| BACKEND
    
    ViteProxy -->|"Proxy /api| HTTP"| BACKEND
    CDN -->|"HTTPS| HTTP"| BACKEND
    
    Server --> Config
    Server --> ENTRY
    ENTRY --> MIDDLEWARE_STACK
    MIDDLEWARE_STACK --> Cors
    MIDDLEWARE_STACK --> JWT
    Cors --> API_ROUTES
    JWT --> API_ROUTES
    
    API_ROUTES --> AUTH_ROUTES
    API_ROUTES --> DEVICE_ROUTES
    API_ROUTES --> USER_ROUTES
    
    API_ROUTES --> SERVICES_LAYER
    
    SERVICES_LAYER --> MainStreamService
    SERVICES_LAYER --> DeviceCache
    SERVICES_LAYER --> AuthService
    
    MainStreamService -->|"Periodic 30min"| EXTERNAL_APIS
    DeviceCache -->|"Cache devices| 5min TTL"| DATA_ACCESS
    
    SERVICES_LAYER --> DATA_ACCESS
    DATA_ACCESS --> DrizzleORM
    DrizzleORM --> PostgresDriver
    PostgresDriver -->|"Wire Protocol<br/>SSL Optional"| DATABASE
    
    Users --> rel1
    Users --> rel2
    Devices --> rel3
    Devices --> rel4
    Sessions -->|FK| Users
    DeviceOwners -->|FK| Users
    DeviceOwners -->|FK| Devices
    DeviceData -->|FK| Devices

    MainStreamService -->|"HTTP|API Key"| MainStreamAPI

    classDef server fill:#ff6b6b,stroke:#333,stroke-width:3px,color:#fff
    classDef middleware fill:#feca57,stroke:#333,stroke-width:2px,color:#000
    classDef routes fill:#48dbfb,stroke:#333,stroke-width:2px,color:#000
    classDef service fill:#1dd1a1,stroke:#333,stroke-width:2px,color:#000
    classDef database fill:#5f27cd,stroke:#333,stroke-width:3px,color:#fff
    classDef table fill:#574b90,stroke:#333,stroke-width:2px,color:#fff
    classDef external fill:#ff9f43,stroke:#333,stroke-width:2px,color:#000
    
    class Server,Config server
    class Cors,JWT,ErrorHandler middleware
    class AUTH_ROUTES,DEVICE_ROUTES,USER_ROUTES routes
    class MainStreamService,DeviceCache,AuthService,DrizzleORM,PostgresDriver service
    class DATABASE,TABLES,RELATIONSHIPS database
    class Users,Devices,Sessions,DeviceData,DeviceOwners,CacheEntries table
    class EXTERNAL_APIS,MainStreamAPI external
```

## Request/Response Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant E as ElysiaJS
    participant M as Middleware
    participant AR as Auth Routes
    participant DR as Device Routes
    participant UR as User Routes
    participant S as Services
    participant D as PostgreSQL
    participant MS as Main Stream API

    rect rgb(220, 240, 255)
        Note over C,AR: Authentication Flow
        C->>E: POST /api/v2/auth/login<br/>{username, password}
        E->>M: Apply Middleware
        M-->>E: Pass (no auth needed)
        E->>AR: Route to Auth Handler
        AR->>D: SELECT user WHERE username=?
        D-->>AR: User record
        AR->>AR: Verify password hash
        AR->>D: INSERT session
        AR-->>E: Generate JWT tokens
        E-->>C: {accessToken, refreshToken}
    end

    rect rgb(255, 240, 220)
        Note over C,D: Authenticated API Request
        C->>E: GET /api/v2/user/owns<br/>Authorization: Bearer {token}
        E->>M: Apply Middleware
        M->>M: Verify JWT signature
        M-->>E: Decode user_id
        E->>UR: Route with user context
        UR->>D: SELECT devices<br/>JOIN device_owners WHERE user_id=?
        D-->>UR: Owned devices
        UR-->>E: Device list
        E-->>C: {devices: [...]}
    end

    rect rgb(220, 255, 220)
        Note over C,D: Device Data Query
        C->>E: POST /api/v2/device<br/>{deviceId, startTime, endTime}
        E->>M: JWT Auth (or API Key)
        M-->>E: Authenticated
        E->>DR: Route to Device Handler
        DR->>D: SELECT device_data<br/>WHERE device_id=?<br/>AND monitorTime BETWEEN ? AND ?
        D-->>DR: Time-series data
        DR-->>E: Format response
        E-->>C: {data: [{time, value}, ...]}
    end

    rect rgb(255, 220, 255)
        Note over E,MS: Background Sync (30 min)
        loop Every 30 minutes
            S->>D: SELECT devices (cached)
            D-->>S: Device list
            S->>MS: POST /batch<br/>{timeRange: "30min"}
            MS-->>S: Historical batch data
            S->>S: Parse & transform
            S->>D: INSERT device_data<br/>ON CONFLICT (deviceId, time)<br/>DO UPDATE
            S->>MS: GET /latest (per device)
            MS-->>S: Current readings
            S->>D: Upsert latest
        end
    end

    rect rgb(255, 220, 220)
        Note over C,D: New Device Registration
        C->>E: POST /api/v2/device/register<br/>{deviceId, deviceKey, ...}
        E->>M: JWT Auth required
        M-->>E: Valid user
        E->>DR: Create device
        DR->>D: INSERT devices
        DR->>D: INSERT device_owners<br/>(user_id, device_id)
        D-->>DR: Created
        DR-->>E: {success: true}
        E-->>C: Device registered
    end
```

## Database Schema

```mermaid
erDiagram
    users ||--o{ sessions : "has"
    users ||--o{ device_owners : "owns"
    devices ||--o{ device_owners : "belongs to"
    devices ||--o{ device_data : "has readings"

    users {
        uuid id PK
        string firstname
        string lastname
        string username UK
        string email UK
        string password_hash
        string role
        timestamp created_at
    }

    sessions {
        uuid id PK
        uuid user_id FK
        string refresh_token
        timestamp expires_at
        timestamp created_at
    }

    devices {
        uuid id PK
        string deviceId UK
        string deviceKey
        string monitorItem
        string name
        string location
        float latitude
        float longitude
        int warningLevel
        timestamp created_at
    }

    device_owners {
        uuid id PK
        uuid user_id FK
        uuid device_id FK
        timestamp created_at
    }

    device_data {
        uuid id PK
        uuid device_id FK
        string monitorItem
        timestamp monitorTime
        float monitorValue
    }

    device_data {
        unique_index "deviceId + monitorTime"
    }

    device_owners {
        unique_index "user_id + device_id"
    }

    cache_entries {
        uuid id PK
        string key UK
        jsonb value
        timestamp expires_at
        timestamp created_at
    }
```

## Service Architecture

```mermaid
graph TD
    subgraph MAIN_STREAM_SYNC["Main Stream Sync Service"]
        direction TB
        
        Scheduler["Scheduler<br/>Every 30 minutes"]
        
        subgraph FETCH["Data Fetch"]
            BatchFetch["POST /batch<br/>Get 30min history"]
            LatestFetch["GET /latest<br/>Per device"]
        end
        
        subgraph TRANSFORM["Data Transform"]
            Timezone["Timezone: UTC+8 -> UTC+7<br/>(Bangkok)"]
            Parse["Parse JSON<br/>Extract values"]
        end
        
        subgraph STORAGE["Storage"]
            Upsert["Upsert<br/>ON CONFLICT UPDATE"]
            Cache["Update Device<br/>Cache"]
        end
        
        Scheduler --> BatchFetch
        Scheduler -->|per device| LatestFetch
        BatchFetch --> Timezone
        LatestFetch --> Timezone
        Timezone --> Parse
        Parse --> Upsert
        Upsert --> Cache
    end

    subgraph DEVICE_CACHE["Device Cache Service"]
        direction TB
        GetCache["Get devices<br/>from DB if expired"]
        CheckTTL["Check TTL<br/>(5 min default)"]
        ReturnCached["Return cached<br/>devices"]
        
        GetCache --> CheckTTL
        CheckTTL -->|not expired| ReturnCached
        CheckTTL -->|expired| GetCache
    end

    subgraph AUTH_SERVICE["Auth Service"]
        direction TB
        ValidateUser["Validate<br/>username/email"]
        VerifyPassword["Verify<br/>password hash"]
        CreateTokens["Create JWT<br/>access + refresh"]
        CreateSession["Store<br/>refresh token"]
    end

    style Scheduler fill:#e74c3c,stroke:#333,color:#fff
    style BatchFetch fill:#3498db,stroke:#333,color:#fff
    style LatestFetch fill:#3498db,stroke:#333,color:#fff
    style Timezone fill:#9b59b6,stroke:#333,color:#fff
    style Parse fill:#9b59b6,stroke:#333,color:#fff
    style Upsert fill:#27ae60,stroke:#333,color:#fff
    style Cache fill:#27ae60,stroke:#333,color:#fff
    style GetCache fill:#f39c12,stroke:#333,color:#000
    style CheckTTL fill:#f39c12,stroke:#333,color:#000
    style ReturnCached fill:#f39c12,stroke:#333,color:#000
    style ValidateUser fill:#1abc9c,stroke:#333,color:#fff
    style VerifyPassword fill:#1abc9c,stroke:#333,color:#fff
    style CreateTokens fill:#1abc9c,stroke:#333,color:#fff
    style CreateSession fill:#1abc9c,stroke:#333,color:#fff
```

## Environment Variables

```mermaid
graph LR
    subgraph SERVER_CONFIG["Server Config"]
        direction TB
        PORT["PORT<br/>Default: 3000"]
        NODE_ENV["NODE_ENV<br/>development/production"]
    end

    subgraph DATABASE_CONFIG["Database Config"]
        direction TB
        DB_HOST["DB_HOST<br/>localhost"]
        DB_PORT["DB_PORT<br/>5432"]
        DB_USER["DB_USER<br/>username"]
        DB_PASS["DB_PASSWORD<br/>***"]
        DB_NAME["DB_NAME<br/>database"]
        DB_SSL["DB_SSL<br/>true/false"]
        DB_SSL_CA["DB_SSL_CA<br/>certificate"]
        DB_POOL_SIZE["DB_POOL_SIZE<br/>max connections"]
    end

    subgraph JWT_CONFIG["JWT Config"]
        direction TB
        JWT_SECRET["JWT_SECRET<br/>access token secret"]
        JWT_REFRESH_SECRET["JWT_REFRESH_SECRET<br/>refresh token secret"]
        JWT_EXPIRES_IN["JWT_EXPIRES_IN<br/>15m default"]
        JWT_REFRESH_EXPIRES_IN["JWT_REFRESH_EXPIRES_IN<br/>7d default"]
    end

    subgraph EXTERNAL_API["External API"]
        direction TB
        MAIN_STREAM_URL["MAIN_STREAM_URL<br/>base URL"]
        DEVICE_CACHE_TTL["DEVICE_CACHE_TTL_MS<br/>300000ms (5min)"]
    end

    style SERVER_CONFIG fill:#e74c3c,stroke:#333,color:#fff
    style DATABASE_CONFIG fill:#3498db,stroke:#333,color:#fff
    style JWT_CONFIG fill:#27ae60,stroke:#333,color:#fff
    style EXTERNAL_API fill:#f39c12,stroke:#333,color:#000
```

---

## API Endpoints

### Auth Routes `/api/v2/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /login | No | Login with username/email + password |
| POST | /register | No | Register new user |
| GET | /me | Bearer | Get current authenticated user |
| POST | /refresh | No | Refresh access token |
| POST | /logout | Bearer | Logout (delete all sessions) |

### Device Routes `/api/v2/device`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /register | Bearer | Register a new device |
| POST | /info | Bearer | Get device info |
| DELETE | / | Bearer | Delete a device |
| POST | / | API Key | Query device data for time range |
| POST | /batch | API Key | Query multiple devices data |
| POST | /latest | No | Get latest reading from Main Stream (proxied) |

### User Routes `/api/v2/user`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /owns | Bearer | Get all devices owned by user |
| PUT | / | Bearer | Update user profile |

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | ElysiaJS |
| Language | TypeScript |
| ORM | Drizzle ORM |
| Database | PostgreSQL |
| Auth | JWT (@elysiajs/jwt) |
| Database Driver | postgres-js |

## Project Structure

```
Backend/
├── src/
│   ├── index.ts           # Entry point
│   ├── services/
│   │   └── mainStream.ts  # Main Stream sync service
│   ├── db/
│   │   ├── database.ts    # DB connection
│   │   └── schema.ts      # Drizzle schema
│   └── api/
│       └── v2/
│           ├── auth.ts    # Auth routes
│           ├── device.ts  # Device routes
│           └── user.ts    # User routes
├── package.json
├── tsconfig.json
└── docker-compose.yml
```

## Usage

### VS Code Extension
Install **Mermaid Markdown Syntax Highlighting** or **Mermaid Preview**

### Online Editor
[Mermaid Live Editor](https://mermaid.live) - paste code and view

### Export to PNG/SVG
```bash
npm install -g @mermaid-js/mermaid-cli
mmdc -i input.md -o output.png -b dark
```