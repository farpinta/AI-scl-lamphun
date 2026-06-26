import React, { useMemo } from "react";
import type { DeviceRangeData } from "../service/deviceService";
import styles from "../styles/Dashboard-StationTable.module.css";

interface StationTableProps {
  waterData: DeviceRangeData[];
  rainData: DeviceRangeData[];
  isLoading: boolean;
  stationName?: string; // รับชื่อสถานีมาจากหน้า Dashboard แทนการ Hardcode
}

interface TableRowData {
  id: string;
  name: string;
  timestamp: string;
  waterLevel: string;
  rainfall: string;
  status: "normal" | "warning" | "critical";
  rawTimestamp: string;
}

const StationTable: React.FC<StationTableProps> = ({
  waterData,
  rainData,
  isLoading,
  stationName = "Unknown Station",
}) => {
  // 1. Logic การ Merge Data (น้ำ + ฝน) โดยใช้ Time เป็นตัวเชื่อม - กู้คืนจากโค้ดทีม
  const tableData: TableRowData[] = useMemo(() => {
    const dataMap = new Map<string, Partial<TableRowData>>();

    // Helper ในการจัด Format เวลา (เช่น "2024-02-04 08:00:00" -> "Today, 08.00")
    const formatDisplayTime = (isoString: string) => {
      try {
        const date = new Date(isoString);
        const today = new Date();
        const isToday = date.toDateString() === today.toDateString();

        const timeStr = date
          .toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
          .replace(":", ".");
        const dateStr = date.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        });

        return `${isToday ? "Today" : dateStr}, ${timeStr}`;
      } catch (e) {
        return isoString;
      }
    };

    // Helper คำนวณ Status (Logic สมมติ: ถ้าน้ำสูง > 5.0 = critical)
    const calculateStatus = (
      water: string,
    ): "normal" | "warning" | "critical" => {
      const val = parseFloat(water);
      if (isNaN(val)) return "normal";
      if (val >= 5.0) return "critical";
      if (val >= 4.5) return "warning";
      return "normal";
    };

    // Process Water Data
    waterData.forEach((item) => {
      dataMap.set(item.monitorTime, {
        rawTimestamp: item.monitorTime,
        timestamp: formatDisplayTime(item.monitorTime),
        waterLevel: parseFloat(item.monitorValue).toFixed(3), // Format ตาม UI ใหม่ (3 ตำแหน่ง)
        rainfall: "-", // default
        name: stationName,
      });
    });

    // Process Rain Data (Merge into existing or create new)
    rainData.forEach((item) => {
      const existing = dataMap.get(item.monitorTime) || {
        rawTimestamp: item.monitorTime,
        timestamp: formatDisplayTime(item.monitorTime),
        waterLevel: "-",
        name: stationName,
      };

      existing.rainfall = parseFloat(item.monitorValue).toFixed(3);
      dataMap.set(item.monitorTime, existing);
    });

    // Convert Map to Array & Sort by Time (Newest first)
    return Array.from(dataMap.values())
      .map(
        (item) =>
          ({
            ...item,
            id: item.rawTimestamp!,
            status: calculateStatus(item.waterLevel as string),
          }) as TableRowData,
      )
      .sort(
        (a, b) =>
          new Date(b.rawTimestamp).getTime() -
          new Date(a.rawTimestamp).getTime(),
      );
  }, [waterData, rainData, stationName]);

  // 2. Logic การ Export CSV - กู้คืนจากโค้ดทีม
  const handleExportCSV = () => {
    const headers = [
      "Station Name,Timestamp,Water Level (m),Rainfall (mm/h),Status",
    ];
    const rows = tableData.map(
      (row) =>
        `${row.name},${row.rawTimestamp},${row.waterLevel},${row.rainfall},${row.status}`,
    );

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
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
      {/* ส่วนหัวของตาราง พร้อมปุ่ม Export CSV ที่กู้คืนมาจัดวางให้เข้ากับ UI ใหม่ */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          padding: "12px 24px 0",
        }}
      >
        <button
          onClick={handleExportCSV}
          style={{
            padding: "4px 14px",
            backgroundColor: "#FFFFFF",
            border: "none",
            borderRadius: "40px",
            cursor: "pointer",
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: "12px",
            fontWeight: "600",
            color: "#111827",
            letterSpacing: "0.3px",
          }}
        >
          Export CSV
        </button>
      </div>

      {/* Header Row */}
      <div className={styles.tableHeader}>
        <div>ชื่อสถานี</div>
        <div>เวลา</div>
        <div className={`${styles.iconCell} ${styles.centerAlign}`}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M2 20h20M5 20v-4M9 20v-8M13 20v-12M17 20v-16" />
          </svg>
        </div>
        <div className={`${styles.iconCell} ${styles.centerAlign}`}>
          <svg
            width="24"
            height="14"
            viewBox="0 0 24 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="2" y="2" width="18" height="10" rx="2" />
            <path d="M22 5v4" />
          </svg>
        </div>
        <div className={styles.centerAlign}>ระดับน้ำ(เมตร)</div>
        <div className={styles.centerAlign}>ปริมาณน้ำฝน(มิลลิเมตร/ชั่วโมง)</div>
      </div>

      {/* Data Rows */}
      <div className={styles.tableBody}>
        {tableData.length === 0 ? (
          <div className="text-center p-4 text-gray-400">ไม่มีข้อมูลสถานี</div>
        ) : (
          tableData.map((row) => (
            <div key={row.id} className={styles.dataRow}>
              <div>
                {row.name}
                {/* กู้คืน Status Logic กลับมาโชว์คู่กับชื่อสถานีแบบเนียนๆ */}
                {row.status !== "normal" && (
                  <span
                    style={{
                      marginLeft: "8px",
                      fontSize: "10px",
                      color: row.status === "critical" ? "red" : "orange",
                    }}
                  >
                    ({row.status})
                  </span>
                )}
              </div>
              <div>{row.timestamp}</div>

              <div className={`${styles.iconCell} ${styles.centerAlign}`}>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M2 20h20M5 20v-4M9 20v-8M13 20v-12M17 20v-16" />
                </svg>
              </div>

              <div className={`${styles.iconCell} ${styles.centerAlign}`}>
                <svg
                  width="24"
                  height="14"
                  viewBox="0 0 24 14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="2" y="2" width="18" height="10" rx="2" />
                  <path d="M22 5v4" />
                </svg>
              </div>

              <div className={styles.centerAlign}>{row.waterLevel}</div>
              <div className={styles.centerAlign}>{row.rainfall}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default StationTable;
