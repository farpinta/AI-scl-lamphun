import React, { useMemo } from 'react';
import styles from '../styles/Dashboard-StationTable.module.css';
import { type DeviceRangeData } from '../service/deviceService';

// Props Interface
interface StationTableProps {
  waterData: DeviceRangeData[];
  rainData: DeviceRangeData[];
  isLoading?: boolean;
}

// Helper Type for Merged Data
interface TableRowData {
  id: string; // unique key usually timestamp
  timestamp: string;
  rawTimestamp: string; // for sorting
  waterLevel: string;
  rainfall: string;
  status: 'normal' | 'warning' | 'critical';
}

const StationTable: React.FC<StationTableProps> = ({ waterData, rainData, isLoading }) => {

  // 1. Logic การ Merge Data (น้ำ + ฝน) โดยใช้ Time เป็นตัวเชื่อม
  const tableData: TableRowData[] = useMemo(() => {
    const dataMap = new Map<string, Partial<TableRowData>>();

    // Helper ในการจัด Format เวลา (เช่น "2024-02-04 08:00:00" -> "Today, 08.00")
    const formatDisplayTime = (isoString: string) => {
      try {
        const date = new Date(isoString);
        const today = new Date();
        const isToday = date.toDateString() === today.toDateString();
        
        const timeStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }).replace(':', '.');
        const dateStr = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });

        return `${isToday ? 'Today' : dateStr}, ${timeStr}`;
      } catch (e) {
        return isoString;
      }
    };

    // Helper คำนวณ Status (Logic สมมติ: ถ้าน้ำสูง > 5.0 = critical)
    const calculateStatus = (water: string): 'normal' | 'warning' | 'critical' => {
        const val = parseFloat(water);
        if (isNaN(val)) return 'normal';
        if (val >= 5.0) return 'critical';
        if (val >= 4.5) return 'warning';
        return 'normal';
    };

    // Process Water Data
    waterData.forEach(item => {
      dataMap.set(item.monitorTime, {
        rawTimestamp: item.monitorTime,
        timestamp: formatDisplayTime(item.monitorTime),
        waterLevel: parseFloat(item.monitorValue).toFixed(2), // Format 2 decimal
        rainfall: '-' // default
      });
    });

    // Process Rain Data (Merge into existing or create new)
    rainData.forEach(item => {
      const existing = dataMap.get(item.monitorTime) || { 
        rawTimestamp: item.monitorTime,
        timestamp: formatDisplayTime(item.monitorTime),
        waterLevel: '-',
      };
      
      existing.rainfall = parseFloat(item.monitorValue).toFixed(1);
      dataMap.set(item.monitorTime, existing);
    });

    // Convert Map to Array & Sort by Time (Newest first)
    return Array.from(dataMap.values())
      .map(item => ({
        ...item,
        id: item.rawTimestamp!,
        status: calculateStatus(item.waterLevel as string)
      } as TableRowData))
      .sort((a, b) => new Date(b.rawTimestamp).getTime() - new Date(a.rawTimestamp).getTime());

  }, [waterData, rainData]);


  // 2. Logic การ Export CSV
  const handleExportCSV = () => {
    const headers = ['Timestamp,Water Level (m),Rainfall (m3),Status'];
    const rows = tableData.map(row => 
      `${row.rawTimestamp},${row.waterLevel},${row.rainfall},${row.status}`
    );
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "station_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return <div className="text-center p-4">Loading Data...</div>;
  }

  return (
    <div className={styles.container}>
      {/* Action Bar */}
      <div className={styles.headerActions}>
        <button onClick={handleExportCSV} className={styles.exportBtn}>
          Export CSV
        </button>
      </div>

      {/* Header Row */}
      <div className={`${styles.gridRow} ${styles.tableHeader}`}>
        <div className={styles.timestamp}>TIMESTAMP</div>
        <div className={styles.headerCell}>WATER LEVEL (m)</div>
        <div className={styles.headerCell}>RAINFALL (m³)</div>
        <div className={styles.headerCell}>STATUS</div>
      </div>

      {/* Data Rows */}
      <div className={styles.tableBody}>
        {tableData.length === 0 ? (
          <div className="text-center p-4 text-gray-400">No data available</div>
        ) : (
          tableData.map((row) => (
            <div key={row.id} className={`${styles.gridRow} ${styles.dataRow}`}>
              
              {/* Column 1: Timestamp */}
              <div className={styles.timestamp}>
                {row.timestamp}
              </div>

              {/* Column 2: Water Level */}
              <div className={`${styles.cell} ${styles.value}`}>
                {row.waterLevel}
              </div>

              {/* Column 3: Rainfall */}
              <div className={`${styles.cell} ${styles.value}`}>
                {row.rainfall}
              </div>

              {/* Column 4: Status Badge */}
              <div className={styles.cell}>
                <span className={`${styles.statusBadge} ${
                  row.status === 'critical' ? styles.statusCritical : 
                  row.status === 'warning' ? styles.statusWarning : 
                  styles.statusNormal
                }`}>
                  <span className={styles.statusDot}></span>
                  {row.status === 'warning' ? 'Warning' : row.status} 
                  {/* Note: Fixed typo 'waring' from design to 'Warning' */}
                </span>
              </div>

            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default StationTable;