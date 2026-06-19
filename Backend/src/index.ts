import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { authRoutes } from "./api/v2/auth";
import { deviceRoutes } from "./api/v2/device";
import { userRoutes } from "./api/v2/user";
import { initialize } from "./db/database";
import { startMainStreamCorrectionSync, startMainStreamLatestSync } from "./services/mainStream";

export const db = initialize();
const port = Number(process.env.PORT ?? 3000);

db
  .then((database) => {
    console.log("Database connected successfully");
    startMainStreamLatestSync(database);
    startMainStreamCorrectionSync(database);
  })
  .catch((error) => {
    console.error("Failed to connect to the database", error);
  });

const app = new Elysia()
  .use(
    cors({
      origin: "*"
    })
  )
  .use(deviceRoutes)
  .use(authRoutes)
  .use(userRoutes)
  .get("/", () => "Hello Elysia")
  .listen({ port, hostname: "0.0.0.0" });

console.log(
  `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`
);
