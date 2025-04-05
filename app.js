const NodeMediaServer = require('node-media-server');
const fs = require('fs');
const path = require('path');
const config = require('./config/default');

// Ensure logs directory exists
const logsDir = config.logs.logPath;
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Ensure media directory exists
const mediaDir = config.storage.mediaPath;
if (!fs.existsSync(mediaDir)) {
  fs.mkdirSync(mediaDir, { recursive: true });
}

// Extract RTMP server configuration
const rtmpConfig = {
  rtmp: config.rtmp,
  http: {
    ...config.http,
    api: true,
    api_user: config.auth.api_user,
    api_pass: config.auth.api_pass
  },
  relay: config.relay,
  trans: config.trans,
  auth: config.auth,
  logType: config.logs.logType,
  logPath: config.logs.logPath
};

// Print config for debugging
console.log('RTMP Server Configuration:');
console.log(JSON.stringify(rtmpConfig, null, 2));

// Create and start the server
const nms = new NodeMediaServer(rtmpConfig);
nms.run();

// Log server start
console.log('RTMP Server started');
console.log(`RTMP: rtmp://localhost:${config.rtmp.port}/live/[stream-key]`);
console.log(`HTTP-FLV: http://localhost:${config.http.port}/live/[stream-key].flv`);
console.log(`HLS: http://localhost:${config.http.port}/live/[stream-key]/index.m3u8`);
console.log(`DASH: http://localhost:${config.http.port}/live/[stream-key]/index.mpd`);
