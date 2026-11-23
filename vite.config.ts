import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // 5173은 다른 프로젝트가 쓰고 있어 충돌했다 (TROUBLESHOOTING TS-002)
  server: { host: true, port: 5180, strictPort: true },
});
