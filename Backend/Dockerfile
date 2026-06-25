# /Backend/Dockerfile

FROM oven/bun:1-alpine

WORKDIR /app

# 1. ก๊อปปี้แค่ไฟล์รายชื่อไลบรารีมาก่อน เพื่อใช้ประโยชน์จาก Layer Cache
COPY package.json bun.lock ./

# 2. ลงไลบรารี (ใช้ --production เพื่อไม่เอาเครื่องมือ Dev ติดไปด้วย ช่วยลดขนาด Image และปลอดภัยขึ้น)
RUN bun install --frozen-lockfile --production

COPY --chown=bun:bun . .

# 4. สลับไปใช้ User ธรรมดาที่ไม่ใช่ Root เพื่อป้องกันโดนแฮกแล้วยึดเครื่อง
USER bun

EXPOSE 3000

# 5. คำสั่งตั้งต้นสำหรับ Production 
CMD ["bun", "run", "src/index.ts"]