// src/pages/DashboardPage.tsx

import { useState, useCallback, useEffect, useMemo } from 'react'; // เพิ่ม useMemo
import StationTable from '../components/Dashboard-StationTable';
import { DeviceService, MockDeviceService, type DeviceRangeData } from '../service/deviceService';
import WaterLevelChart from '../components/WaterLevelChart';
import { STATIC_STATIONS } from '../data/stationList';
import DataCard from '../components/DataCard';
import MapView, { type StationData } from '../components/MapView'; // Import Type StationData มาด้วย
import styles from '../styles/DashboradPage.module.css';

// *** ตัวสลับโหมด: true = ใช้ข้อมูลจำลอง, false = ต่อ API จริง ***
const USE_MOCK_DATA = true; 

const DashboardPage = () => {
    // State ข้อมูล Sensor
    const [waterValue, setWaterValue] = useState<string>("---");
    const [rainValue, setRainValue] = useState<string>("---");

    // State ตาราง History
    const [waterHistory, setWaterHistory] = useState<DeviceRangeData[]>([]);
    const [rainHistory, setRainHistory] = useState<DeviceRangeData[]>([]);
    
    // State ข้อมูลสถานี
    const [stationName, setStationName] = useState<string>("Loading Station...");
    const [deviceId, setDeviceId] = useState<string>("UNKNOWN_ID"); // เก็บ ID ไว้ใช้แสดงผล
    
    // State พิกัด (Default: ลำพูน)
    const [location, setLocation] = useState<{lat: number, lng: number}>({
        lat: 18.586659, 
        lng: 99.023166
    });

    const [isLoading, setIsLoading] = useState<boolean>(false);

    const handleDataUpdate = useCallback((water: number, rain: number) => {
        setWaterValue(water.toFixed(3));
        setRainValue(rain.toFixed(3));
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // อ่าน Environment Variables
                const envDeviceId = import.meta.env.VITE_API_DEVICE_ID || "MOCK_DEVICE_001"; 
                setDeviceId(envDeviceId); // set ID
                const secretKey = import.meta.env.VITE_API_deviceSecretKey || "MOCK_KEY"; 

                let infoRes, waterRes, rainRes;
                const endTime = Date.now();
                const startTime = endTime - (24 * 60 * 60 * 1000); // 24 ชม.

                // --- เลือกโหมด Mock หรือ Real ---
                if (USE_MOCK_DATA) {
                    console.log("🟡 Mode: Using MOCK Data");
                    infoRes = await MockDeviceService.getStationInfo(envDeviceId);
                    [waterRes, rainRes] = await Promise.all([
                        MockDeviceService.getHistory(envDeviceId, secretKey, "water_level", startTime, endTime),
                        MockDeviceService.getHistory(envDeviceId, secretKey, "rain_fall", startTime, endTime)
                    ]);
                } else {
                    console.log("🟢 Mode: Using REAL API");
                    infoRes = await DeviceService.getStationInfo(envDeviceId);
                    [waterRes, rainRes] = await Promise.all([
                        DeviceService.getHistory(envDeviceId, secretKey, "water_level", startTime, endTime),
                        DeviceService.getHistory(envDeviceId, secretKey, "rain_fall", startTime, endTime)
                    ]);
                }

                // --- อัปเดต State ---
                if (infoRes) {
                    setStationName(infoRes.customName || infoRes.monitorName || "Unknown Station");
                    
                    // if (infoRes.deviceLocation) {
                    //     setLocation({
                    //         // แก้ Bug: 118 เป็น 18 (เพราะ Latitude เกิน 90 ไม่ได้)
                    //         lat: Number(infoRes.deviceLocation.latitude) || 18.575,
                    //         lng: Number(infoRes.deviceLocation.longitude) || 99.008
                    //     });
                    // }
                }

                setWaterHistory(waterRes || []);
                setRainHistory(rainRes || []);

            } catch (error) {
                console.error("Error fetching dashboard data:", error);
                setStationName("Error Loading Data");
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    const stationList: StationData[] = useMemo(() => {
        
        const mainStation: StationData = {
            id: deviceId,
            name: stationName,   // ชื่อที่ได้จาก API
            lat: location.lat,   // พิกัดที่ได้จาก API
            lng: location.lng,   // พิกัดที่ได้จาก API
            status: 'active'
        };

        return [mainStation, ...STATIC_STATIONS];

    }, [deviceId, stationName, location]);

    return (
        <main className={styles.container}>
            <section className={styles.cardGrid}>
                <DataCard title="จำนวนสถานี" value={1} unit="สถานี" theme="blue" />
                <DataCard title="ระดับน้ำล่าสุด" value={waterValue} unit="เมตร" theme="orange" />
                <DataCard title="ปริมาณน้ำฝนสะสม" value={rainValue} unit="มม." theme="blue" />
            </section>

            <section className={styles.chartSection}>
                <div className={styles.chartWrapper}>
                    <WaterLevelChart onDataUpdate={handleDataUpdate} />
                </div>
                
                <div className={styles.mapWrapper}>
                    <MapView stations={stationList} />
                </div>
            </section>

            <section style={{ marginTop: '30px' }}>
                 <div className="flex items-center justify-between mb-4">
                     <div>
                        <h2 className="text-h2" style={{ fontSize: '20px', fontWeight: 'bold', color: '#1E40AF' }}>
                            Station: {stationName} {USE_MOCK_DATA && <span style={{fontSize:'12px', color:'orange'}}>(Mockup Mode)</span>}
                        </h2>
                        <p style={{ fontSize: '14px', color: '#6B7280' }}>
                            Water Level & Rainfall History
                        </p>
                     </div>
                 </div>

                 <StationTable 
                    waterData={waterHistory} 
                    rainData={rainHistory} 
                    isLoading={isLoading}
                 />
            </section>
        </main>
    );
}

export default DashboardPage;