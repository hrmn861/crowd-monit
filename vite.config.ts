import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

// Server-side fallback & escalation logger middleware for Vite dev server
function crowdMonitorApiPlugin(): Plugin {
  // In-memory telemetry and alert store
  let activeModel = 'YOLO';
  const alerts = [
    {
      id: 101,
      zone_id: 1,
      zone_code: 'Z1',
      zone_name: 'Lower Stairs',
      status: 'active',
      count: 68,
      density: 1.51,
      threshold: 65,
      triggered_at: new Date(Date.now() - 75000).toISOString(),
      confirmed_at: null,
      escalated_at: null,
      resolved_at: null,
      notes: 'Continuous stair congestion breached critical threshold for >60s',
    },
  ];

  return {
    name: 'crowd-monitor-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/') && !req.url?.startsWith('/upload-video')) {
          return next();
        }

        // Try proxying to FastAPI backend on port 8000 first if running
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 200);
          const backendTest = await fetch('http://localhost:8000/api/status', {
            signal: controller.signal,
          }).catch(() => null);
          clearTimeout(timeout);

          if (backendTest && backendTest.ok) {
            // Forward directly to FastAPI
            const targetUrl = `http://localhost:8000${req.url}`;

            // Handle video-feed streaming specifically
            if (req.url.startsWith('/api/video-feed')) {
              const streamRes = await fetch(targetUrl);
              res.writeHead(streamRes.status, {
                'Content-Type': streamRes.headers.get('content-type') || 'multipart/x-mixed-replace; boundary=frame',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
              });
              if (streamRes.body) {
                const reader = streamRes.body.getReader();
                req.on('close', () => reader.cancel());
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  res.write(value);
                }
              }
              res.end();
              return;
            }

            const fHeaders: Record<string, string> = {};
            if (req.headers['content-type']) {
              fHeaders['Content-Type'] = req.headers['content-type'];
            }
            let bodyData: any = undefined;
            if (req.method === 'POST' || req.method === 'PATCH') {
              const buffers: any[] = [];
              for await (const chunk of req) buffers.push(chunk);
              bodyData = Buffer.concat(buffers);
            }
            const proxyRes = await fetch(targetUrl, {
              method: req.method,
              headers: fHeaders,
              body: bodyData,
            });
            res.statusCode = proxyRes.status;
            res.setHeader('Content-Type', proxyRes.headers.get('content-type') || 'application/json');
            const data = await proxyRes.arrayBuffer();
            res.end(Buffer.from(data));
            return;
          }
        } catch {
          // Fall through to local middleware
        }

        // Local video-feed fallback when FastAPI backend is not running
        if (req.url?.startsWith('/api/video-feed')) {
          res.writeHead(200, {
            'Content-Type': 'multipart/x-mixed-replace; boundary=frame',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          });

          let standbyBuf: Buffer;
          try {
            const fs = await import('fs');
            standbyBuf = fs.readFileSync(path.resolve(__dirname, 'backend/standby.jpg'));
          } catch {
            standbyBuf = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');
          }

          const timer = setInterval(() => {
            try {
              res.write(`--frame\r\nContent-Type: image/jpeg\r\nContent-Length: ${standbyBuf.length}\r\n\r\n`);
              res.write(standbyBuf);
              res.write('\r\n');
            } catch {
              clearInterval(timer);
            }
          }, 150);

          req.on('close', () => clearInterval(timer));
          return;
        }

        // Local middleware handling
        res.setHeader('Content-Type', 'application/json');

        if (req.url === '/api/alerts' && req.method === 'GET') {
          res.end(JSON.stringify({ alerts }));
          return;
        }

        const statusMatch = req.url.match(/\/api\/alerts\/(\d+)\/status/);
        if (statusMatch && req.method === 'PATCH') {
          const alertId = parseInt(statusMatch[1], 10);
          const buffers: any[] = [];
          for await (const chunk of req) buffers.push(chunk);
          const body = JSON.parse(Buffer.concat(buffers).toString() || '{}');
          const alert = alerts.find((a) => a.id === alertId);
          if (alert) {
            alert.status = body.status;
            if (body.status === 'confirmed') alert.confirmed_at = new Date().toISOString() as any;
            if (body.status === 'escalated') alert.escalated_at = new Date().toISOString() as any;
            if (body.notes) alert.notes = body.notes;
          }
          res.end(JSON.stringify({ status: 'success', alert_id: alertId, new_status: body.status }));
          return;
        }

        const escalateMatch = req.url.match(/\/api\/alerts\/(\d+)\/escalate/);
        if (escalateMatch && req.method === 'POST') {
          const alertId = parseInt(escalateMatch[1], 10);
          const alert = alerts.find((a) => a.id === alertId);
          const nowIso = new Date().toISOString();
          if (alert) {
            alert.status = 'escalated';
            alert.escalated_at = nowIso as any;
          }

          const escalationPayload = {
            site_name: 'Times Square - Red Steps & Broadway Walkway',
            viewpoint: 'North View - Father Duffy Square (TSQ-CAM-01)',
            alert_id: alertId,
            zone_code: alert?.zone_code || 'Z1',
            zone_name: alert?.zone_name || 'Lower Stairs',
            current_count: alert?.count || 70,
            density_per_sqm: alert?.density || 1.56,
            critical_threshold: alert?.threshold || 65,
            exceeded_by: Math.max(0, (alert?.count || 70) - (alert?.threshold || 65)),
            timestamp: nowIso,
            operator_action: 'REVIEW_CONFIRMED_ESCALATE',
            recommended_measures: [
              'Dispatch Plaza Safety Team to redirect pedestrian flow at 7th Ave corridor',
              'Activate digital signage warning: Stairs closed for congestion management',
              'Notify NYPD Transit Bureau Sector 2 if stairs aggregation exceeds 120%',
            ],
          };

          // Print cleanly to the terminal logger as specified in Phase 3
          console.log('\n' + '='.repeat(70));
          console.log('🚨 [CROWD MONITOR ESCALATION SUMMARY] DISPATCH LOG 🚨');
          console.log('='.repeat(70));
          console.log(JSON.stringify(escalationPayload, null, 2));
          console.log('='.repeat(70) + '\n');

          res.end(JSON.stringify({ status: 'escalated', summary: escalationPayload }));
          return;
        }

        // Auth endpoints fallback
        if (req.url === '/api/auth/login' && req.method === 'POST') {
          res.end(JSON.stringify({
            access_token: 'demo-jwt-token-control-room-supervisor',
            token_type: 'bearer',
            expires_in_minutes: 10080,
            user: { id: 1, username: 'operator', email: 'operator@crowdmonitor.io', role: 'supervisor', is_active: true }
          }));
          return;
        }

        if (req.url === '/api/auth/me' && req.method === 'GET') {
          res.end(JSON.stringify({ id: 1, username: 'operator', email: 'operator@crowdmonitor.io', role: 'supervisor', is_active: true }));
          return;
        }

        // Videos endpoints fallback
        if (req.url === '/api/videos' && req.method === 'GET') {
          res.end(JSON.stringify([
            {
              id: 1,
              filename: 'Screen Recording 2026-11-03 221109.mp4',
              original_name: 'Times Square North View (Screen Recording 2026-11-03 221109.mp4)',
              duration_seconds: 120,
              fps: 30,
              width: 960,
              height: 720,
              is_active: true,
              uploaded_at: new Date(Date.now() - 86400000).toISOString(),
              first_frame_url: '/backend/standby.jpg',
              zone_count: 4
            }
          ]));
          return;
        }

        if ((req.url === '/api/videos/upload' || req.url === '/upload-video') && req.method === 'POST') {
          res.end(JSON.stringify({
            id: Date.now(),
            filename: 'custom_feed.mp4',
            original_name: 'Custom Surveillance Feed (uploaded.mp4)',
            duration_seconds: 60,
            fps: 30,
            width: 960,
            height: 720,
            is_active: true,
            uploaded_at: new Date().toISOString(),
            first_frame_url: '/backend/standby.jpg',
            zone_count: 0
          }));
          return;
        }

        const zonesMatch = req.url.match(/\/api\/videos\/(\d+)\/zones/);
        if (zonesMatch && req.method === 'POST') {
          res.end(JSON.stringify({ status: 'success', video_id: parseInt(zonesMatch[1], 10), message: 'Dynamic zones deployed' }));
          return;
        }

        const activateMatch = req.url.match(/\/api\/videos\/(\d+)\/activate/);
        if (activateMatch && req.method === 'POST') {
          res.end(JSON.stringify({ status: 'success', active_video_id: parseInt(activateMatch[1], 10) }));
          return;
        }

        const firstFrameMatch = req.url.match(/\/api\/videos\/(\d+)\/first-frame/);
        if (firstFrameMatch && req.method === 'GET') {
          let standbyBuf: Buffer;
          try {
            const fs = await import('fs');
            standbyBuf = fs.readFileSync(path.resolve(__dirname, 'backend/standby.jpg'));
          } catch {
            standbyBuf = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');
          }
          res.setHeader('Content-Type', 'image/jpeg');
          res.end(standbyBuf);
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), crowdMonitorApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
      },
    },
  };
});
