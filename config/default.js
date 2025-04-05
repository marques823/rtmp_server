const path = require('path');

module.exports = {
  rtmp: {
    port: 1936,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60
  },
  http: {
    port: 8095,
    allow_origin: '*',
    mediaroot: path.join(__dirname, '..'),
    api: true
  },
  relay: {
    ffmpeg: '/usr/bin/ffmpeg',
    tasks: []
  },
  trans: {
    ffmpeg: '/usr/bin/ffmpeg',
    tasks: [
      {
        app: 'live',
        mp4: true,
        mp4Flags: '[movflags=frag_keyframe+empty_moov]',
        hls: true,
        hlsFlags: '[hls_time=2:hls_list_size=3:hls_flags=delete_segments]',
        dash: true,
        dashFlags: '[f=dash:window_size=3:extra_window_size=5]'
      }
    ]
  },
  auth: {
    api: true,
    api_user: 'admin',
    api_pass: 'admin',
    play: false,
    publish: false,
    secret: 'nodemedia2023privatekey'
  },
  storage: {
    mediaPath: path.join(__dirname, '..', 'rtmp-server', 'media'),
    maxAgeDays: 7
  },
  logs: {
    logType: 3,
    logPath: path.join(__dirname, '..', 'logs')
  }
}; 