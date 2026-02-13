import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import styles from '../styles/MapView.module.css';

// --- Configuration ---
const CUSTOM_ICON = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png', 
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [35, 35],
  iconAnchor: [17, 35],
  popupAnchor: [0, -30],
  shadowSize: [41, 41]
});

const DEFAULT_CENTER: [number, number] = [18.598899,99.031880];

// --- Types ---
export interface StationData {
  id: string | number;
  name: string;
  lat: number;
  lng: number;
  status?: 'active' | 'inactive';
}

interface MapViewProps {
  stations: StationData[];
}

// --- Helper Component ---
const FitBoundsToMarkers = ({ stations }: { stations: StationData[] }) => {
  const map = useMap();

  useEffect(() => {
    if (stations.length === 0) return;
    const bounds = L.latLngBounds(stations.map(s => [s.lat, s.lng]));
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [stations, map]);

  return null;
};

// --- Main Component ---
function MapView({ stations = [] }: MapViewProps) {
  
  const handleViewDetails = (id: string | number) => {
      console.log("Navigating to sensor details:", id);
  };

  return (
    <div className={styles.mapContainer}>
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={10}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }} 
        zoomControl={false} 
      >
        <TileLayer
          attribution='&copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        <FitBoundsToMarkers stations={stations} />
        
        {stations.map((station) => (
          <Marker 
            key={station.id} 
            position={[station.lat, station.lng]} 
            icon={CUSTOM_ICON}
          >
            <Popup minWidth={180}>
              {/* ใช้ className แทน style */}
              <div className={styles.popupContainer}>
                
                <h4 className={styles.popupTitle}>
                  {station.name}
                </h4>
                
                <div className={styles.popupInfo}>
                  <div><strong>ID:</strong> {station.id}</div>
                  <div><strong>Lat:</strong> {station.lat.toFixed(4)}</div>
                  <div><strong>Lng:</strong> {station.lng.toFixed(4)}</div>
                </div>

                {/* <button 
                    className={styles.popupButton}
                    onClick={() => handleViewDetails(station.id)}
                >
                    ดูข้อมูลเซนเซอร์
                </button> */}
                
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export default MapView;