import { Routes, Route, Link, useLocation } from "react-router-dom";
import DashboardPage from '../pages/DashboardPage';
import Station from '../pages/Station';
import styles from '../styles/NavBar.module.css';

// Component ส่วนเมนู
const MenuBar = () => {
  const location = useLocation();
  
  // Helper function: เช็ค Path เพื่อเลือก Class
  const getNavClass = (path: string) => {
    // ถ้า URL ปัจจุบันตรงกับ path ที่ส่งมา ให้เพิ่ม class .active
    return location.pathname === path 
      ? `${styles.navItem} ${styles.active}` 
      : styles.navItem;
  };

  return (
    <nav className={styles.navbarContainer}>
      
      {/* 1. ปุ่ม Logout (ซ้ายสุด) */}
      <div>
        <button 
          className={styles.logoutBtn} 
          onClick={() => {
            if(confirm("ต้องการออกจากระบบใช่หรือไม่?")) {
                localStorage.clear();
                window.location.reload();
            }
          }}
        >
          Logout
        </button>
      </div>

      {/* 2. กลุ่มเมนู (ขวาสุด) */}
      <div className={styles.menuGroup}>
        
        {/* เมนู 1: แดชบอร์ด */}
        <Link to="/" className={getNavClass('/')}>
          <span className={styles.navTitle}>แดชบอร์ด</span>
          <span className={styles.navSubtitle}>ภาพรวมของระบบ</span>
        </Link>

        {/* เมนู 2: แผนที่ GIS (สมมติ) */}
        <Link to="/map" className={getNavClass('/map')}>
          <span className={styles.navTitle}>แผนที่ GIS</span>
          <span className={styles.navSubtitle}>มุมมองแผนที่</span>
        </Link>

        {/* เมนู 3: ข้อมูลสถานี */}
        <Link to="/station" className={getNavClass('/station')}>
          <span className={styles.navTitle}>ข้อมูลสถานี</span>
          <span className={styles.navSubtitle}>ข้อมูลโดยละเอียด</span>
        </Link>
        
        {/* เมนู 4: การตั้งค่า (สมมติ) */}
        <Link to="/settings" className={getNavClass('/settings')}>
          <span className={styles.navTitle}>การตั้งค่า</span>
          <span className={styles.navSubtitle}>หน้าต่างตั้งค่า</span>
        </Link>

      </div>

    </nav>
  );
};

// Component หลัก
function Navbar() {
  return (
    <div className={styles.layoutContainer}>
      
      {/* ส่วนบน: Navbar */}
      <MenuBar />

      {/* ส่วนล่าง: เนื้อหา */}
      <div className={styles.contentArea}>
        <Routes>
          <Route path='/' element={<DashboardPage />} />
          <Route path='/station' element={<Station />} />
          <Route path='/map' element={<div className="text-h1">หน้าแผนที่ GIS (Demo)</div>} />
          <Route path='/settings' element={<div className="text-h1">หน้าการตั้งค่า (Demo)</div>} />
        </Routes>
      </div>

    </div>
  );
}

export default Navbar;