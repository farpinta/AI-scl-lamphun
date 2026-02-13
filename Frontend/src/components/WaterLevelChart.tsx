import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import styles from '../styles/WaterLevelChart.module.css';

// --- Types & Interfaces ---
interface WaterData {
  time: string;
  waterLevel: number;
  rainLevel: number;
}

interface WaterLevelChartProps {
  onDataUpdate?: (water: number, rain: number) => void;
}

// --- Sub-components ---
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  return (
    <div className={styles.customTooltip}>
      <p className={`${styles.tooltipTime} text-caption`}>เวลา {label} น.</p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className={styles.tooltipValueRow}>
          <div className={styles.tooltipDot} style={{ backgroundColor: entry.color }}></div>
          <span className={styles.tooltipValue}>
            {entry.name}: {Number(entry.value).toFixed(3)} {entry.unit}
          </span>
        </div>
      ))}
    </div>
  );
};

// --- Main Component ---
export const WaterLevelChart: React.FC<WaterLevelChartProps> = ({ onDataUpdate }) => {
  const [data, setData] = useState<WaterData[]>([]);
  const [currentWater, setCurrentWater] = useState<number | null>(null);
  const dataRef = useRef<WaterData[]>([]);
  
  // [NEW] ตัวแปรจำค่าฝนสะสม (เริ่มที่ 0)
  const accumulatedRainRef = useRef<number>(0);

  const fetchLatestData = useCallback(async () => {
    try {
      const response = await fetch(`/api/v2/device/latest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: import.meta.env.VITE_API_DEVICE_ID,
          deviceSecretKey: import.meta.env.VITE_API_deviceSecretKey,
          monitorItem: import.meta.env.VITE_API_monitorItem,
        })
      });

      const result = await response.json();
      if (!result.monitorValue) return;

      const waterVal = parseFloat(parseFloat(result.monitorValue).toFixed(3));
      
      // ถ้าไม่มีค่าจริงจาก API ให้สุ่มค่าเล็กๆ (0.0 - 0.5) เพื่อจำลองฝนตกปรอยๆ
      const rainDelta = result.rainLevel 
        ? parseFloat(parseFloat(result.rainLevel).toFixed(3)) 
        : parseFloat((Math.random() * 0.5).toFixed(3));
      
      // [LOGIC CHANGE] บวกทบเข้าไปในยอดสะสมรวม
      accumulatedRainRef.current += rainDelta;
      const totalRain = parseFloat(accumulatedRainRef.current.toFixed(3));

      const timeStr = new Date().toLocaleTimeString('th-TH', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      setCurrentWater(waterVal);
      // ส่งค่า totalRain (สะสม) ออกไปแทนค่า rainDelta
      onDataUpdate?.(waterVal, totalRain);

      const newItem: WaterData = { 
        time: timeStr, 
        waterLevel: waterVal, 
        rainLevel: totalRain // กราฟจะแสดงยอดสะสมที่สูงขึ้นเรื่อยๆ
      };

      const newData = [...dataRef.current, newItem].slice(-24);
      
      dataRef.current = newData;
      setData(newData);
    } catch (err) {
      console.error("Failed to fetch water data:", err);
    }
  }, [onDataUpdate]);

  useEffect(() => {
    fetchLatestData();
    const interval = setInterval(fetchLatestData, 10000);
    return () => clearInterval(interval);
  }, [fetchLatestData]);

  return (
    <div className={styles.chartCard}>
      <header className={styles.header}>
        <h2 className="text-h1" style={{ color: 'var(--color-brand-primary)' }}>
          ระดับน้ำ (24 ชม.)
        </h2>
        <div className={styles.currentSummary}>
          <span className="text-data-lg" style={{ color: 'var(--color-brand-secondary)', fontSize: '28px' }}>
            {currentWater?.toFixed(3) ?? '---'} 
            <small style={{ fontSize: '18px', marginLeft: '4px' }}>ม.</small>
          </span>
        </div>
      </header>

      <div className={styles.chartBody}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical stroke="#E5E7EB" />
            <XAxis dataKey="time" fontSize={11} stroke="var(--color-text-tertiary)" tickLine={false} axisLine={false} />
            <YAxis yAxisId="left" domain={[0, 4]} fontSize={11} tickLine={false} axisLine={false} />
            {/* [ADJUST] ปรับ Domain แกนขวาให้รองรับค่าสะสมที่อาจจะเยอะขึ้น (Auto หรือกำหนด Max) */}
            <YAxis yAxisId="right" orientation="right" domain={[0, 'auto']} fontSize={11} tickLine={false} axisLine={false} />
            
            <Tooltip content={<CustomTooltip />} />
            
            <Bar 
              yAxisId="right" 
              name="น้ำฝนสะสม" 
              unit="มม." 
              dataKey="rainLevel" 
              fill="var(--color-graf-rain)" 
              barSize={40} 
              radius={[4, 4, 0, 0]} 
            />
            <Line 
              yAxisId="left" 
              name="ระดับน้ำ" 
              unit="ม." 
              type="monotone" 
              dataKey="waterLevel" 
              stroke="var(--color-graf-waterLevel)" 
              strokeWidth={4} 
              dot={false} 
              activeDot={{ r: 6 }} 
            />
            <ReferenceLine yAxisId="left" y={3} stroke="var(--color-status-critical)" strokeDasharray="3 3" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <ChartLegend />
    </div>
  );
};

const ChartLegend = () => (
  <div className={styles.legendContainer}>
    <div className={styles.legendItem}>
      <div className={styles.legendIconLine} style={{ backgroundColor: 'var(--color-graf-waterLevel)' }}></div>
      <span className={`${styles.legendText} text-caption`}>ระดับน้ำ (เมตร)</span>
    </div>
    <div className={styles.legendItem}>
      <div className={styles.legendIconBar} style={{ backgroundColor: 'var(--color-graf-rain)' }}></div>
      <span className={`${styles.legendText} text-caption`}>น้ำฝนสะสม (มิลลิเมตร)</span>
    </div>
  </div>
);

export default WaterLevelChart;