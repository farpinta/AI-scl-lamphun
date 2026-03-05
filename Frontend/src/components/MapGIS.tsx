import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import styles from "../styles/MapGIS.module.css";

// สร้าง Custom Icon สำหรับ Pin บนแผนที่ (รูปหยดน้ำ)
const createCustomIcon = (color: string) => {
  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width="32" height="42">
      <path fill="${color}" d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67-9.535 13.774-29.93 13.773-39.464 0zM192 272c44.183 0 80-35.817 80-80s-35.817-80-80-80-80 35.817-80 80 35.817 80 80 80z"/>
    </svg>`;
  return L.divIcon({
    className: styles.customMarker,
    html: svgIcon,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -40],
  });
};

const iconNormal = createCustomIcon("#10B981"); // Green
const iconWarning = createCustomIcon("#FFAE00"); // Orange
const iconCritical = createCustomIcon("#EF4444"); // Red


const MapGIS = () => {
  return (
    <div className={styles.page}>
      {/* Main Map Area */}
      <div className={styles.mapContainer}>
        <MapContainer center={[18.79, 99.01]} zoom={15} className={styles.mapCanvas} zoomControl={false}>
          <TileLayer 
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          {stations.map((s) => (
            <Marker key={s.id} position={[s.lat, s.lng]} icon={s.icon}>
              <Popup className={styles.customPopup}>
                <div className={styles.popupContent}>
                  <div className={styles.popupHeader}>
                    <strong>{s.name}</strong>
                    <span className={styles.dotIndicator}></span>
                  </div>
                  <div className={styles.popupSub}>{s.river}</div>
                  <div className={styles.popupDataRow}>
                    <div className={styles.dataCol}>
                      <span>ระดับน้ำ</span>
                      <strong className={styles.textBlue}>{s.waterLevel} <small>ม.รทก.</small></strong>
                    </div>
                    <div className={styles.dataCol}>
                      <span>ปริมาณน้ำไหล</span>
                      <strong className={styles.textBlue}>{s.flowRate} <small>ลบ.ม./วินาที</small></strong>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Floating Left Sidebar */}
        <div className={styles.leftOverlay}>
          <div className={styles.searchTitle}>สถานี</div>
          <div className={styles.searchBox}>
            <span className={styles.searchIcon}>🔍</span>
            <input type="text" placeholder="ค้นหา" />
          </div>

          <div className={styles.summaryCard}>
            <div className={styles.cardHeader}>
              <span>สถานีวัดปริมาณฝน</span>
              <span className={styles.textBlue}>6 สถานี</span>
            </div>
            <ul className={styles.statusList}>
              <li><span>ฝนตกหนักมาก</span> <span className={styles.textRed}>1 สถานี</span></li>
              <li><span>ฝนตกหนัก</span> <span className={styles.textYellow}>1 สถานี</span></li>
              <li><span>ฝนตกปานกลาง</span> <span className={styles.textGreen}>1 สถานี</span></li>
              <li><span>ฝนตกเล็กน้อย</span> <span className={styles.textBlue}>1 สถานี</span></li>
              <li><span>ไม่มีฝน</span> <span className={styles.textBlue}>1 สถานี</span></li>
              <li><span>ออฟไลน์</span> <span className={styles.textGray}>1 สถานี</span></li>
            </ul>
          </div>

          <div className={styles.summaryCard}>
            <div className={styles.cardHeader}>
              <span>สถานีวัดระดับน้ำ</span>
              <span className={styles.textBlue}>8 สถานี</span>
            </div>
            <ul className={styles.statusList}>
              <li><span>น้ำเอ่อล้นตลิ่ง</span> <span className={styles.textRed}>1 สถานี</span></li>
              <li><span>น้ำมาก</span> <span className={styles.textYellow}>1 สถานี</span></li>
              <li><span>น้ำปกติ</span> <span className={styles.textGreen}>1 สถานี</span></li>
              <li><span>น้ำน้อย</span> <span className={styles.textBlue}>1 สถานี</span></li>
              <li><span>ออฟไลน์</span> <span className={styles.textGray}>1 สถานี</span></li>
            </ul>
          </div>
        </div>

        {/* Floating Right Weather Panel */}
        <div className={styles.rightOverlay}>
          <div className={styles.weatherIconTop}>⛅</div>
          
          <div className={styles.weatherPanel}>
            <div className={styles.weatherTitle}>ลำพูน</div>
            
            {/* Hourly Forecast */}
            <div className={styles.hourlyList}>
              {[...Array(6)].map((_, i) => (
                <div key={i} className={styles.hourlyItem}>
                  <span>{String(2 + i).padStart(2, '0')}:00</span>
                  <span>☁️</span>
                  <span>37 c</span>
                </div>
              ))}
            </div>

            <hr className={styles.divider} />

            {/* Daily Forecast */}
            <div className={styles.dailyList}>
              {[...Array(6)].map((_, i) => (
                <div key={i} className={styles.dailyItem}>
                  <span>22/04</span>
                  <span>Tomorrow</span>
                  <span>☁️</span>
                  <span>38</span>
                  <span className={styles.textGray}>29</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Example Critical Alert Icon overlay (The red triangle in design) */}
        <div className={styles.alertTriangle} style={{ top: '25%', left: '32%' }}>
          ⚠️
        </div>

      </div>
    </div>
  );
};

export default MapGIS;