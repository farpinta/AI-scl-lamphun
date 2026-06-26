import { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import styles from "../styles/MapGIS.module.css";

// ---- Types ----
interface Station {
  id: string;
  name: string;
  detail: string;
  lat: number;
  lng: number;
  status: "normal" | "warning" | "critical";
  waterLevel: number;
  rainfall: number;
}

// ---- Mock Data ----
const STATIONS: Station[] = [
  {
    id: "1",
    name: "ชื่อสถานี",
    detail: "รายละเอียดตำแหน่ง................................",
    lat: 18.81,
    lng: 98.99,
    status: "normal",
    waterLevel: 150.25,
    rainfall: 50.568,
  },
  {
    id: "2",
    name: "ชื่อสถานี",
    detail: "รายละเอียดตำแหน่ง................................",
    lat: 18.795,
    lng: 99.02,
    status: "warning",
    waterLevel: 150.25,
    rainfall: 50.568,
  },
  {
    id: "3",
    name: "ชื่อสถานี",
    detail: "รายละเอียดตำแหน่ง................................",
    lat: 18.78,
    lng: 99.005,
    status: "normal",
    waterLevel: 150.25,
    rainfall: 50.568,
  },
  {
    id: "4",
    name: "ชื่อสถานี",
    detail: "รายละเอียดตำแหน่ง................................",
    lat: 18.77,
    lng: 99.015,
    status: "normal",
    waterLevel: 150.25,
    rainfall: 50.568,
  },
  {
    id: "5",
    name: "ชื่อสถานี",
    detail: "รายละเอียดตำแหน่ง................................",
    lat: 18.76,
    lng: 98.998,
    status: "warning",
    waterLevel: 150.25,
    rainfall: 50.568,
  },
  {
    id: "6",
    name: "ชื่อสถานี",
    detail: "รายละเอียดตำแหน่ง................................",
    lat: 18.75,
    lng: 99.01,
    status: "normal",
    waterLevel: 150.25,
    rainfall: 50.568,
  },
  {
    id: "7",
    name: "ชื่อสถานี",
    detail: "รายละเอียดตำแหน่ง................................",
    lat: 18.74,
    lng: 99.0,
    status: "critical",
    waterLevel: 150.25,
    rainfall: 50.568,
  },
  {
    id: "8",
    name: "ชื่อสถานี",
    detail: "รายละเอียดตำแหน่ง................................",
    lat: 18.73,
    lng: 99.025,
    status: "normal",
    waterLevel: 150.25,
    rainfall: 50.568,
  },
];

// ---- Custom Map Marker Icons ----
const createIcon = (color: string) =>
  L.divIcon({
    className: styles.customMarker,
    html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width="28" height="38">
      <path fill="${color}" d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67-9.535 13.774-29.93 13.773-39.464 0zM192 272c44.183 0 80-35.817 80-80s-35.817-80-80-80-80 35.817-80 80 35.817 80 80 80z"/>
    </svg>`,
    iconSize: [28, 38],
    iconAnchor: [14, 38],
    popupAnchor: [0, -40],
  });

const icons = {
  normal: createIcon("#10B981"),
  warning: createIcon("#FFAE00"),
  critical: createIcon("#EF4444"),
};

// ---- Main Component ----
const MapGIS = () => {
  const [search, setSearch] = useState("");

  const filtered = STATIONS.filter(
    (s) => s.name.includes(search) || s.detail.includes(search),
  );

  return (
    <div className={styles.page}>
      {/* Map (full area) */}
      <div className={styles.mapContainer}>
        <MapContainer
          center={[18.78, 99.005]}
          zoom={14}
          className={styles.mapCanvas}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          {STATIONS.map((s) => (
            <Marker key={s.id} position={[s.lat, s.lng]} icon={icons[s.status]}>
              <Popup className={styles.customPopup} closeButton={false}>
                <div className={styles.popupCard}>
                  <div className={styles.popupTitle}>{s.name}</div>
                  <div className={styles.popupRow}>
                    <span className={styles.popupLabel}>ระดับน้ำ</span>
                  </div>
                  <div className={styles.popupRow}>
                    <span className={styles.popupValue}>
                      {s.waterLevel.toFixed(3)}
                    </span>
                    <span className={styles.popupUnit}>เมตร</span>
                  </div>
                  <div className={styles.popupRow}>
                    <span className={styles.popupLabel}>ปริมาณน้ำฝนสะสม</span>
                  </div>
                  <div className={styles.popupRow}>
                    <span className={styles.popupValue}>
                      {s.rainfall.toFixed(3)}
                    </span>
                    <span className={styles.popupUnit}>มิลลิเมตร/ชั่วโมง</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Right Panel: Search + Station List */}
        <div className={styles.rightPanel}>
          {/* Search */}
          <div className={styles.searchBox}>
            <svg
              className={styles.searchIcon}
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search"
              className={styles.searchInput}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Station List */}
          <div className={styles.stationList}>
            {filtered.map((s) => (
              <div key={s.id} className={styles.stationRow}>
                <span className={styles.stationName}>{s.name}</span>
                <span className={styles.stationDetail}>{s.detail}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapGIS;
