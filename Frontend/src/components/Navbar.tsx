import { Routes, Route, Link, useLocation } from "react-router-dom";
import DashboardPage from "../pages/DashboardPage";
import Station from "../pages/Station";
import styles from "../styles/NavBar.module.css";
import MapGIS from "./MapGIS";

// Component ส่วนเมนู
const MenuBar = () => {
  const location = useLocation();

  const getNavClass = (path: string) => {
    return location.pathname === path
      ? `${styles.navItem} ${styles.active}`
      : styles.navItem;
  };

  return (
    <nav className={styles.navbarContainer}>
      {/* 1. Logo */}
      <div className={styles.logoGroup}>
        <h1 className={styles.logoText}>Water Flow</h1>
      </div>

      {/* 2. Menu */}
      <div className={styles.menuGroup}>
        <Link to="/" className={getNavClass("/")}>
          <span className={styles.navTitle}>แดชบอร์ด</span>
          <span className={styles.navSubtitle}>ภาพรวมของระบบ</span>
        </Link>
        <Link to="/map" className={getNavClass("/map")}>
          <span className={styles.navTitle}>แผนที่ GIS</span>
          <span className={styles.navSubtitle}>มุมมองแผนที่</span>
        </Link>
        <Link to="/station" className={getNavClass("/station")}>
          <span className={styles.navTitle}>ข้อมูลสถานี</span>
          <span className={styles.navSubtitle}>ข้อมูลโดยละเอียด</span>
        </Link>
        <Link to="/settings" className={getNavClass("/settings")}>
          <span className={styles.navTitle}>การตั้งค่า</span>
          <span className={styles.navSubtitle}>หน้าต่างตั้งค่า</span>
        </Link>
      </div>

      {/* 3. Search & Log out */}
      <div className={styles.rightGroup}>
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
          />
        </div>
        <button
          className={styles.profileBtn}
          onClick={() => {
            if (confirm("ต้องการออกจากระบบใช่หรือไม่?")) {
              localStorage.clear();
              window.location.reload();
            }
          }}
        >
          Log out
        </button>
      </div>
    </nav>
  );
};

// Layout wrapper ที่รู้จัก path ปัจจุบัน
const Layout = () => {
  const location = useLocation();
  const isMap = location.pathname === "/map";

  return (
    <div className={styles.layoutContainer}>
      <MenuBar />
      <div
        className={isMap ? styles.contentAreaFullHeight : styles.contentArea}
      >
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/map" element={<MapGIS />} />
          <Route path="/station" element={<Station />} />
          <Route
            path="/settings"
            element={<div className="text-h1">หน้าการตั้งค่า (Demo)</div>}
          />
        </Routes>
      </div>
    </div>
  );
};

export default Layout;
