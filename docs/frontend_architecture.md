# Frontend Architecture Diagram

```mermaid
graph TB
    subgraph CLIENTS["Clients"]
        Browser["Web Browser<br/>(React + Vite)"]
        Mobile["Mobile App<br/>(Future)"]
    end

    subgraph FRONTEND["Frontend Layer"]
        direction TB
        ViteServer["Vite Dev Server<br/>/ Production Build"]
        
        subgraph PAGES["Pages"]
            DashboardPage["DashboardPage"]
            StationPage["Station"]
            MapGISPage["MapGISPage"]
            LoginPage["LoginPage"]
        end
        
        subgraph COMPONENTS["Components"]
            Navbar["Navbar"]
            WaterLevelChart["WaterLevelChart"]
            MapView["MapView"]
            MapGIS["MapGIS"]
            DataCard["DataCard"]
            StationTable["StationTable"]
            LoginForm["LoginForm"]
        end
        
        subgraph SERVICES["Services"]
            DeviceService["deviceService.ts"]
        end
        
        subgraph STYLES["Styles"]
            CSSModules["CSS Modules"]
        end
    end

    subgraph API_PROXY["API Proxy"]
        ViteProxy["Vite Proxy<br/>/api -> Backend:3000"]
    end

    subgraph BACKEND["Backend Layer"]
        ElysiaServer["ElysiaJS Server<br/>:3000"]
        
        subgraph MIDDLEWARE["Middleware"]
            CORS["CORS<br/>(Allow All)"]
            JWT["JWT Auth<br/>(@elysiajs/jwt)"]
        end
        
        subgraph API_ROUTES["API Routes"]
            AuthRoutes["/api/v2/auth<br/>login, register, me, refresh, logout"]
            DeviceRoutes["/api/v2/device<br/>register, info, latest, batch"]
            UserRoutes["/api/v2/user<br/>owns, update"]
        end
        
        subgraph SERVICES_BACK["Services"]
            MainStreamSync["Main Stream Sync<br/>(30 min interval)"]
            DeviceCache["Device Cache<br/>(5 min TTL)"]
        end
        
        subgraph DATABASE_ACCESS["Data Access Layer"]
            DrizzleORM["Drizzle ORM"]
        end
    end

    subgraph DATABASE["Database - PostgreSQL"]
        UsersTable["users<br/>id, email, username,<br/>password, role"]
        DevicesTable["devices<br/>id, deviceId, deviceKey,<br/>name, location, warningLevel"]
        SessionsTable["sessions<br/>id, user_id, token,<br/>expires"]
        DeviceDataTable["device_data<br/>id, device_id, monitorItem,<br/>monitorTime, value"]
        DeviceOwnersTable["device_owners<br/>user_id, device_id"]
        CacheEntriesTable["cache_entries<br/>key, value, expires"]
    end

    subgraph EXTERNAL["External Systems"]
        MainStreamAPI["Main Stream API<br/>/batch, /latest"]
    end

    Browser -->|"HTTP/HTTPS|React Router"| ViteServer
    Mobile -.->|"Future"| ViteServer
    
    ViteServer --> PAGES
    ViteServer --> COMPONENTS
    ViteServer --> SERVICES
    ViteServer --> STYLES
    
    SERVICES -->|"API Calls"| ViteProxy
    DashboardPage -->|"/device/info, /device/latest"| DeviceService
    WaterLevelChart -->|poll /device/latest<br/>every 10s| DeviceService
    LoginForm -->|"/auth/login, /auth/register"| DeviceService
    
    ViteProxy -->|"HTTP REST| JWT Bearer"| BACKEND
    
    ElysiaServer --> MIDDLEWARE
    MIDDLEWARE --> CORS
    MIDDLEWARE --> JWT
    CORS --> API_ROUTES
    JWT --> API_ROUTES
    API_ROUTES --> AuthRoutes
    API_ROUTES --> DeviceRoutes
    API_ROUTES --> UserRoutes
    
    API_ROUTES --> SERVICES_BACK
    ServicesBack["Services"] --> DrizzleORM
    MainStreamSync -->|"FETCH /batch, /latest"| EXTERNAL
    MainStreamSync --> DrizzleORM
    DeviceCache -->|"Cache devices<br/>from DB"| DrizzleORM
    
    DrizzleORM --> DATABASE
    DATABASE --> UsersTable
    DATABASE --> DevicesTable
    DATABASE --> SessionsTable
    DATABASE --> DeviceDataTable
    DATABASE --> DeviceOwnersTable
    DATABASE --> CacheEntriesTable
    
    EXTERNAL --> MainStreamAPI
    
    PAGES --> CSSModules
    COMPONENTS --> CSSModules

    classDef frontend fill:#61dafb,stroke:#333,stroke-width:2px,color:#000
    classDef backend fill:#ff6b6b,stroke:#333,stroke-width:2px,color:#fff
    classDef database fill:#f7df1e,stroke:#333,stroke-width:2px,color:#000
    classDef external fill:#9b59b6,stroke:#333,stroke-width:2px,color:#fff
    classDef client fill:#27ae60,stroke:#333,stroke-width:2px,color:#fff
    
    class Browser,Mobile client
    class FRONTEND,ViteServer,PAGES,COMPONENTS,SERVICES,STYLES frontend
    class BACKEND,ElysiaServer,MIDDLEWARE,API_ROUTES,SERVICES_BACK,DATABASE_ACCESS backend
    class DATABASE,UsersTable,DevicesTable,SessionsTable,DeviceDataTable,DeviceOwnersTable,CacheEntriesTable database
    class EXTERNAL,MainStreamAPI external
```

## Data Flow Diagram

```mermaid
sequenceDiagram
    participant U as User
    participant R as React
    participant VP as Vite Proxy
    participant E as ElysiaJS
    participant D as PostgreSQL
    participant MS as Main Stream API

    rect rgb(200, 230, 200)
        Note over U,D: Authentication Flow
        U->>R: Login (username/password)
        R->>VP: POST /api/v2/auth/login
        VP->>E: Forward Request
        E->>D: Validate User & Create Session
        D-->>E: Return User + Tokens
        E-->>VP: JWT Access + Refresh Token
        VP-->>R: Store tokens in localStorage
        R-->>U: Login Success
    end

    rect rgb(200, 200, 240)
        Note over U,D: Dashboard Data Flow
        U->>R: Open Dashboard
        R->>VP: GET /api/v2/auth/me
        VP->>E: Bearer Token
        E->>D: Validate JWT
        D-->>E: User Data
        E-->>R: Authenticated
        
        R->>VP: POST /api/v2/device/info
        R->>VP: POST /api/v2/device/latest
        VP->>E: Device Query
        E->>D: Query device_data
        D-->>E: Sensor Readings
        E-->>R: Return Data
        R->>R: Update Charts & Map
    end

    rect rgb(255, 240, 200)
        Note over U,MS: Real-time Polling (every 10s)
        loop Every 10 seconds
            R->>VP: POST /api/v2/device/latest
            VP->>E: Fetch Latest
            E->>D: Query latest readings
            D-->>E: Current values
            E-->>R: Update Charts
        end
    end

    rect rgb(240, 200, 240)
        Note over E,MS: Main Stream Sync (every 30 min)
        loop Every 30 minutes
            E->>E: Load devices from cache
            E->>MS: GET /batch?timeRange=30min
            MS-->>E: Historical Data
            E->>MS: GET /latest (per device)
            MS-->>E: Current Readings
            E->>D: Upsert device_data
            Note over D: On conflict update
        end
    end

    rect rgb(220, 240, 220)
        Note over U,D: Device Registration
        U->>R: Register Device
        R->>VP: POST /api/v2/device/register
        VP->>E: Create Device
        E->>D: Insert device + device_owner
        D-->>E: Created
        E-->>U: Device Registered
    end
```

## Component Hierarchy

```mermaid
graph TD
    App["App.tsx<br/>React Router"]
    
    subgraph LAYOUT["Layout Components"]
        Navbar["Navbar"]
    end
    
    subgraph PAGES_ROUTES["Page Routes"]
        DashboardPage["DashboardPage"]
        StationPage["StationPage"]
        MapGISPage["MapGISPage"]
        LoginPage["LoginPage"]
    end
    
    subgraph DASHBOARD_COMPONENTS["Dashboard Components"]
        DashboardStationTable["Dashboard-StationTable"]
        WaterLevelChart["WaterLevelChart"]
        MapView["MapView"]
        DataCard["DataCard"]
        StationHeader["StationHeader"]
    end
    
    subgraph SHARED_COMPONENTS["Shared Components"]
        DataCard["DataCard"]
        LoginForm["LoginForm"]
    end
    
    App -->|Routes| Navbar
    App -->|Routes| LoginPage
    App -->|Routes| DashboardPage
    App -->|Routes| StationPage
    App -->|Routes| MapGISPage
    
    Navbar -->|Navigate| DashboardPage
    Navbar -->|Navigate| StationPage
    Navbar -->|Navigate| MapGISPage
    
    DashboardPage --> DashboardStationTable
    DashboardPage --> WaterLevelChart
    DashboardPage --> MapView
    DashboardPage --> DataCard
    DashboardPage --> StationHeader
    
    LoginPage --> LoginForm
```

## Environment Configuration

```mermaid
graph LR
    subgraph ENV_VARS["Environment Variables"]
        direction TB
        VITE_API["VITE_API_ENDPOINT<br/>Backend URL"]
        VITE_DEVICE_ID["VITE_API_DEVICE_ID<br/>Device ID"]
        VITE_DEVICE_KEY["VITE_API_deviceSecretKey<br/>Device Secret"]
        VITE_MONITOR["VITE_API_monitorItem<br/>Monitor Type"]
    end
    
    subgraph CONFIG["Vite Config"]
        Proxy["Proxy Config<br/>/api -> Backend:3000"]
    end
    
    VITE_API --> Proxy
    Proxy -->|"http://localhost:3000"| BACKEND
    
    style ENV_VARS fill:#f39c12,stroke:#333
    style CONFIG fill:#3498db,stroke:#333
```

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React 19.2 + TypeScript |
| Build Tool | Vite 7.2 |
| Routing | React Router v7 |
| Charts | Recharts 3.7 |
| Maps | Leaflet + react-leaflet 5.0 |
| Icons | Lucide React |
| Styling | CSS Modules |
| Auth | JWT (localStorage) |

## Project Structure

```
Frontend/src/
├── main.tsx              # Entry point
├── App.tsx               # Root component with routing
├── index.css             # Global styles
├── components/           # Reusable UI components
│   ├── Navbar.tsx
│   ├── LoginForm.tsx
│   ├── DataCard.tsx
│   ├── WaterLevelChart.tsx
│   ├── MapView.tsx
│   ├── MapGIS.tsx
│   ├── StationTable.tsx
│   ├── Station.ts
│   ├── Dashboard-StationTable.tsx
│   └── StationHeader.tsx
├── pages/                # Page-level components
│   ├── DashboardPage.tsx
│   ├── LoginPage.tsx
│   ├── Station.tsx
│   └── MapGISPage.tsx
├── service/              # API services
│   └── deviceService.ts
├── data/                 # Static data
│   └── stationList.ts
└── styles/               # CSS modules
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