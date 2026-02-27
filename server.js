// server.js
const http = require('http');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';

// Railway/Render/Fly/etc. всегда прокидывают PORT
const port = parseInt(process.env.PORT || '3000', 10);

// В контейнере надо слушать на 0.0.0.0, не на localhost
const hostname = process.env.HOSTNAME || '0.0.0.0';

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    const server = http.createServer((req, res) => {
      // healthcheck-ответ, иногда полезно (не мешает)
      if (req.url === '/health' || req.url === '/__health') {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('ok');
        return;
      }

      handle(req, res);
    });

    server.listen(port, hostname, () => {
      console.log(`[server] Next.js started: http://${hostname}:${port} (dev=${dev})`);
    });
  })
  .catch((err) => {
    console.error('[server] Failed to start:', err);
    process.exit(1);
  });
