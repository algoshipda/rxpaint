const ws = require('websocket').server;
const http = require('http');

const fs = require('fs');
const path = require('path');

const room = [];

const arg = new Map((process.argv[2] || '')
  .split('&')
  .map(s => s.split('=')));

console.log(arg);

const wsip = arg.get('wsip') || 'ws://localhost';
const port = arg.get('port') || 8080;

const wsUrl = `${wsip}:${port}`;

console.log(wsUrl);

const server = http.createServer((req, res) => {
  console.log(req.url);
  if (req.url === '/') {
    res.setHeader('content-type', 'text/html; charset=utf-8');
    const html = fs.readFileSync(path.resolve(__dirname, '../dist/index.html'))
      .toString()
      .replace('{{ws}}', wsUrl);
    res.write(html);
    res.end();
    return;
  }

  if (req.url === '/bundle.js') {
    res.setHeader('content-type', 'text/javascript; charset=utf-8');
    res.write(fs.readFileSync(path.resolve(__dirname, '../dist/bundle.js')));
    res.end();
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(port, function () {
  console.log(port);
});

const wsServer = new ws({
  httpServer: server,
  autoAccepConnections: false,
});

function originIsAllowed(origin) {
  return true;
}

wsServer.on('request', (req) => {
  if (!originIsAllowed(req.origin)) {
    req.reject();
    return;
  } 

  const connection = req.accept();
  room.push(connection);
  console.log('connection accepted');
  connection.on('message', (_msg) => {
    console.log('msg', _msg);
    if (_msg.type ==='utf8') {
      const msg = JSON.parse(_msg.utf8Data);
      room.filter((conn) => connection !== conn)
        .forEach((conn) => conn.sendUTF(JSON.stringify({
          ...msg
        })));
      console.log('received message', msg);
    }
  })

  connection.on('close', (code, desc) => {
    const idx = room.indexOf(connection);
    room.splice(idx, 1);
    console.log(connection.remoteAddress);
  });
});
