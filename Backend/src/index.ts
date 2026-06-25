import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { authRoutes } from "./api/v2/auth";
import { deviceRoutes } from "./api/v2/device";
import { userRoutes } from "./api/v2/user";
import {db, initialize } from "./db/database";
import { startMainStreamCorrectionSync, startMainStreamLatestSync } from "./services/mainStream";
import { staticPlugin } from "@elysiajs/static";

const port = Number(process.env.PORT) || 3000;

// 1. ลองดึงค่า URL ของเว็บ Frontend เราจาก .env (ถ้าไม่มีให้ยอมรับหมดแบบชั่วคราวไปก่อน)
const allowedOrigin = process.env.FRONTEND_URL ?? "*";

try {
    // 2. รอ DB พร้อมก่อน
    const database = await initialize();
    console.log("✅ Database connected successfully");

    // 3. แยกกั้นห้อง (Error Isolation) ให้ Service ย่อย
    // เพื่อป้องกันไม่ให้โปรแกรมหลักตายถ้า Service ย่อยมีปัญหา
    try {
      startMainStreamLatestSync(db);
      console.log("✅ MainStream Latest Sync started");
    } catch (err) {
      console.error("⚠️ MainStream Latest Sync failed, but proceeding...", err);
    }

    try {
      startMainStreamCorrectionSync(db);
      console.log("✅ MainStream Correction Sync started");
    } catch (err) {
      console.error("⚠️ MainStream Correction Sync failed, but proceeding...", err);
    }

    // 4. สร้าง App
    const app = new Elysia()
      // เสิร์ฟหน้าเว็บจากโฟลเดอร์ public
      .use(staticPlugin({
        assets: './public',
        prefix: '/'
      }))
      // ใช้ CORS
      .use(cors({ origin: allowedOrigin }))
      // รวม Routes API ไว้ใน group เดียวกัน
      .group("/api", (api) => api
        .use(deviceRoutes)
        .use(authRoutes)
        .use(userRoutes)
      )

      .get("*", () => Bun.file("./public/index.html"))
      // รับ Request
      .listen({ 
      port: port, 
      hostname: "0.0.0.0" 
     });
    console.log(`🦊 Elysia is running at port ${port}`);

  } catch (error) {
    // 5. ถ้า DB ต่อไม่ได้จริงๆ ให้หยุดทำงานทันที (Fail-Fast)
    console.error("❌ Fatal Error: Failed to start server", error);
    process.exit(1);
  }