// Frontend configuration for WebSocket connection
// You can override host/port at runtime via localStorage:
// localStorage.setItem('WS_HOST', 'your-ip');
// localStorage.setItem('WS_PORT', '8081');
export const CONFIG = {
  wsProtocol: window.location.protocol === 'https:' ? 'wss' : 'ws',
  wsHost: (localStorage.getItem('WS_HOST') || window.location.hostname || 'localhost'),
  wsPort: (() => {
    const v = localStorage.getItem('WS_PORT');
    const n = v ? parseInt(v, 10) : NaN;
    return Number.isFinite(n) ? n : 8081;
  })(),
  wsPath: '/',
  get wsUrl() {
    return `${this.wsProtocol}://${this.wsHost}:${this.wsPort}${this.wsPath}`;
  }
};
