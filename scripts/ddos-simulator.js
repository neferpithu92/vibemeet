// DDoS Simulation Script
const http = require('http');

const TARGET_HOST = '127.0.0.1';
const TARGET_PORT = 3000;
const TARGET_PATH = '/api/tickets/validate';
const TOTAL_REQUESTS = 100;
const BURST_INTERVAL_MS = 20;

console.log(`[BOTNET] Preparativi attacco: ${TOTAL_REQUESTS} burst requests verso ${TARGET_HOST}:${TARGET_PORT}${TARGET_PATH}`);

let successCount = 0;
let blockedCount = 0;
let failedCount = 0;
let activeReqs = 0;

const startTime = Date.now();

const sendRequest = (id) => {
  activeReqs++;
  const postData = JSON.stringify({ ticketId: 'test-ddos-id' });
  const options = {
    hostname: TARGET_HOST,
    port: TARGET_PORT,
    path: TARGET_PATH,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'x-forwarded-for': '203.0.113.88' // Simulate external IP
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
      activeReqs--;
      if (res.statusCode === 429) {
        blockedCount++;
        process.stdout.write('🛡️ '); // Shield emoji for rate limit
      } else if (res.statusCode === 401 || res.statusCode === 200 || res.statusCode === 400 || res.statusCode === 500) {
        successCount++;
        process.stdout.write('🎯 '); // Hit indicator
      } else {
        failedCount++;
        process.stdout.write('❌ ');
      }
      
      if (activeReqs === 0 && id >= TOTAL_REQUESTS) {
        console.log('\n\n--- [BATTLE REPORT] ---');
        console.log(`Time elapsed: ${Date.now() - startTime}ms`);
        console.log(`Requests processed exactly: TARGET REACHED OR RATE LIMITED`);
        console.log(`Hits Penetrated: ${successCount}`);
        console.log(`Hits BLOCKED by Rate Limiter (429): ${blockedCount}`);
        console.log(`Hits Failed (Other errors): ${failedCount}`);
        if(blockedCount > 80) {
            console.log("CONCLUSION: 🛡️ DEFENSE SUCCESSFUL! Server is Enterprise Grade.");
        } else {
            console.log("CONCLUSION: ⚠️ SERVER BREACHED! Rate Limiter failed or not strict enough.");
        }
      }
    });
  });

  req.on('error', (e) => {
    activeReqs--;
    failedCount++;
    process.stdout.write('❌ ');
  });

  req.write(postData);
  req.end();
};

let i = 1;
const interval = setInterval(() => {
  sendRequest(i);
  i++;
  if (i > TOTAL_REQUESTS) {
    clearInterval(interval);
  }
}, BURST_INTERVAL_MS);
