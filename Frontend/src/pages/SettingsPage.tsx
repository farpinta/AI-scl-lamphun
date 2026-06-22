import { useState, useEffect } from 'react';
import StationTable from '../components/Dashboard-StationTable';
import { MockDeviceService, type DeviceRangeData } from '../service/deviceService';

const SettingsPage = () => {
  const [waterHistory, setWaterHistory] = useState<DeviceRangeData[]>([]);
  const [rainHistory, setRainHistory] = useState<DeviceRangeData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchMockDataForSettings = async () => {
      setIsLoading(true);
      try {
        const endTime = Date.now();
        const startTime = endTime - (24 * 60 * 60 * 1000); // ดึงข้อมูลย้อนหลัง 24 ชม.
        const mockId = "MOCK_DEVICE_001";
        const mockKey = "MOCK_KEY";

        // เรียกดึงข้อมูลจำลองจาก Service มาสวมให้ตาราง
        const [waterRes, rainRes] = await Promise.all([
          MockDeviceService.getHistory(mockId, mockKey, "water_level", startTime, endTime),
          MockDeviceService.getHistory(mockId, mockKey, "rain_fall", startTime, endTime),
        ]);

        setWaterHistory(waterRes || []);
        setRainHistory(rainRes || []);
      } catch (error) {
        console.error("Error loading settings table data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMockDataForSettings();
  }, []);

  return (
    <div style={{ width: '100%' }}>
      {/* ดึงโครงสร้างตารางแคปซูลที่เราปรับแต่งสไตล์ Bootstrap ไว้มาแสดงผล */}
      <StationTable 
        waterData={waterHistory} 
        rainData={rainHistory} 
        isLoading={isLoading} 
      />
    </div>
  );
};

export default SettingsPage;