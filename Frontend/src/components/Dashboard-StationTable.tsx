import React, { useMemo } from 'react';
import styles from '../styles/Dashboard-StationTable.module.css';
import { type DeviceRangeData } from '../service/deviceService';

interface StationTableProps {
  waterData: DeviceRangeData[];
  rainData: DeviceRangeData[];
  isLoading?: boolean;
}

interface TableRowData {
  id: string;
  timestamp: string;
  rawTimestamp: string;
  waterLevel: string;
  rainfall: string;
  status: 'normal' | 'warning' | 'critical';
  signalStatus: 'good' | 'bad'; 
  batteryStatus: 'full' | 'low';
}

const StationTable: React.FC<StationTableProps> = ({ waterData, rainData, isLoading }) => {

  const tableData: TableRowData[] = useMemo(() => {
    const dataMap = new Map<string, Partial<TableRowData>>();

    const formatDisplayTime = (isoString: string) => {
      try {
        const date = new Date(isoString);
        return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      } catch (e) {
        return isoString;
      }
    };

    const calculateStatus = (water: string): 'normal' | 'warning' | 'critical' => {
        const val = parseFloat(water);
        if (isNaN(val)) return 'normal';
        if (val >= 5.0) return 'critical';
        if (val >= 4.5) return 'warning';
        return 'normal';
    };

    waterData.forEach(item => {
      dataMap.set(item.monitorTime, {
        rawTimestamp: item.monitorTime,
        timestamp: formatDisplayTime(item.monitorTime),
        waterLevel: parseFloat(item.monitorValue).toFixed(2),
        rainfall: '-'
      });
    });

    rainData.forEach(item => {
      const existing = dataMap.get(item.monitorTime) || { 
        rawTimestamp: item.monitorTime,
        timestamp: formatDisplayTime(item.monitorTime),
        waterLevel: '-',
      };
      existing.rainfall = parseFloat(item.monitorValue).toFixed(3);
      dataMap.set(item.monitorTime, existing);
    });

    return Array.from(dataMap.values())
      .map(item => ({
        ...item,
        id: item.rawTimestamp!,
        status: calculateStatus(item.waterLevel as string),
        // แก้ไข Logic การแปลงข้อความเป็นตัวเลขและใส่เงื่อนไขเปรียบเทียบจริง
        signalStatus: (parseFloat(item.waterLevel || '0') > 4.8) ? 'bad' : 'good',
        batteryStatus: (parseFloat(item.rainfall || '0') > 40.0) ? 'low' : 'full'
      } as TableRowData))
      .sort((a, b) => new Date(b.rawTimestamp).getTime() - new Date(a.rawTimestamp).getTime());

  }, [waterData, rainData]);

  if (isLoading) {
    return <div className="text-center p-4" style={{ color: '#ffffff' }}>Loading Data...</div>;
  }

  return (
    <div className={styles.container}>
      {/* 1. แถบควบคุมด้านบน: ใช้ไอคอนแว่นขยาย bi-search */}
      <div className={styles.tableControls}>
        <div className={styles.searchWrapper}>
          <i className={`bi bi-search ${styles.searchIcon}`}></i>
          <input type="text" placeholder="Search" className={styles.searchInput} />
        </div>
        <button className={styles.addButton}>+ Add</button>
      </div>

      {/* 2. หัวคอลัมน์ตาราง */}
      <div className={styles.tableHeader}>
        <div className={styles.colSetting}></div>
        <div className={styles.colName}>ชื่อสถานี</div>
        <div className={styles.colTime}>เวลา</div>
        <div className={styles.colSignal}>สัญญาณ</div>
        <div className={styles.colBattery}>แบตเตอรี่</div>
        <div className={styles.colWater}>ระดับน้ำ (เมตร)</div>
        <div className={styles.colRain}>ปริมาณน้ำฝน (มม./ชม.)</div>
      </div>

      {/* 3. แถวข้อมูลพร้อม Dynamic Bootstrap Icons และผูก Class คอลัมน์ครบถ้วน */}
      <div className={styles.tableBody}>
        {tableData.length === 0 ? (
          <div className="text-center p-4" style={{ color: '#8b95a5' }}>No data available</div>
        ) : (
          tableData.map((row) => {
            const waterStatusClass = 
              row.status === 'critical' ? styles.statusCritical : 
              row.status === 'warning' ? styles.statusWarning : 
              styles.statusNormal;

            const signalColorClass = row.signalStatus === 'good' ? styles.iconGood : styles.iconBad;
            const batteryColorClass = row.batteryStatus === 'full' ? styles.iconGood : styles.iconCritical;

            return (
              <div key={row.id} className={styles.stationRow}>
                <div className={styles.colSetting}>
                  <i className={`bi bi-gear ${styles.btnSetting}`}></i>
                </div>
                
                <div className={styles.colName}>สถานีวัดระดับน้ำน้ำแม่กวง</div>
                <div className={styles.colTime}>{row.timestamp}</div>
                
                <div className={`${styles.colSignal} ${signalColorClass}`}>
                  <i className={row.signalStatus === 'good' ? 'bi bi-reception-4' : 'bi bi-reception-1'}></i>
                </div>
                
                <div className={`${styles.colBattery} ${batteryColorClass}`}>
                  <i className={row.batteryStatus === 'full' ? 'bi bi-battery-full' : 'bi bi-battery'}></i>
                </div>
                
                <div className={`${styles.colWater} ${waterStatusClass}`}>
                  {row.waterLevel}
                </div>
                <div className={`${styles.colRain} ${waterStatusClass}`}>
                  {row.rainfall}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default StationTable;