const { spawn } = require('child_process');
const https = require('https');
const http = require('http');

let activeUrl = null;
let pingInterval = null;

function pingTunnel(url) {
  if (!url) return;
  try {
    const parsed = new URL(url);
    const req = https.get(url + '/api/market-data', { timeout: 10000 }, (res) => {
      // consume response to free memory
      res.on('data', () => {});
    });
    req.on('error', (err) => {
      // ignore transient network errors during ping
    });
  } catch (e) {}
}

function startTunnel() {
  console.log('[Tunnel] Launching persistent localhost.run tunnel with active keep-alive...');

  const ssh = spawn('ssh', [
    '-o', 'StrictHostKeyChecking=no',
    '-o', 'ServerAliveInterval=15',
    '-o', 'ServerAliveCountMax=5',
    '-R', '80:127.0.0.1:3000',
    'nokey@localhost.run'
  ], {
    stdio: ['ignore', 'pipe', 'pipe']
  });

  ssh.stdout.on('data', (data) => {
    const text = data.toString();
    const match = text.match(/https:\/\/[a-z0-9]+\.lhr\.life/i);
    if (match) {
      const newUrl = match[0];
      if (newUrl !== activeUrl) {
        activeUrl = newUrl;
        console.log('\n============================================================');
        console.log(`🚀 LIVE TEMPORARY WEBSITE IS ACTIVE:`);
        console.log(`   ${activeUrl}`);
        console.log('============================================================\n');

        // Immediately ping and start recurring keep-alive every 20 seconds
        if (pingInterval) clearInterval(pingInterval);
        pingTunnel(activeUrl);
        pingInterval = setInterval(() => {
          pingTunnel(activeUrl);
        }, 20000);
      }
    }
  });

  ssh.stderr.on('data', (data) => {
    const text = data.toString();
    if (!text.includes('Pseudo-terminal will not be allocated') && !text.includes('Warning: Permanently added')) {
      // only log unusual stderr
      // console.error('[Tunnel stderr]:', text.trim());
    }
  });

  ssh.on('close', (code) => {
    console.log(`[Tunnel] SSH closed with code ${code}. Reconnecting in 3 seconds...`);
    if (pingInterval) clearInterval(pingInterval);
    setTimeout(startTunnel, 3000);
  });

  ssh.on('error', (err) => {
    console.error('[Tunnel Error]:', err.message);
  });
}

startTunnel();
