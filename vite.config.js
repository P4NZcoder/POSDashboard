import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/POSDashboard/', // เปลี่ยนตรงนี้ให้ตรงกับชื่อ Repo บน GitHub
})
