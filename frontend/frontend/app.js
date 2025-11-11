
let ws = null;      // WebSocket activo
let yo = null;      // Nombre de usuario autenticado

// Utilidades de selección de nodos
const $  = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

// Referencias a secciones/nodos clave
const seccionLogin = $('#login');
const seccionChat  = $('#chat');
const cajaMensajes = $('#messages');

// Variables para videollamada grupal
let inCall = false;
let localStream = null;
let peerConnections = {}; // {username: RTCPeerConnection}
let participants = new Set(); // Lista de participantes en la llamada

const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

// Eventos de UI
$('#btnLogin').onclick = conectar;
$('#send').onclick = enviarMensaje;
$('#txt').addEventListener('keydown', e => { if (e.key === 'Enter') enviarMensaje(); });
$('#file').onchange = enviarArchivo;
$('#btnLogout').onclick = cerrarSesion;

// Eventos de videollamada
$('#btnJoinCall').onclick = toggleVideoCall;
$('#btnLeaveCall').onclick = leaveVideoCall;
$('#btnToggleMic').onclick = toggleMicrophone;
$('#btnToggleCam').onclick = toggleCamera;
$('#btnShareScreen').onclick = shareScreen;

// Establece la conexión y realiza autenticación
function conectar() {
  const usuario = $('#user').value.trim();
  const contrasena = $('#pass').value.trim();
  if (!usuario || !contrasena) {
    $('#loginMsg').textContent = 'Completa usuario y contraseña';
    return;
  }

  // Ajusta host/puerto si es necesario
  ws = new WebSocket('ws://10.159.125.105:8081/');

  ws.onopen = () => {
    ws.send(JSON.stringify({ type:'auth', username: usuario, password: contrasena }));
  };

  ws.onmessage = (ev) => {
    if (typeof ev.data === 'string') {
      manejarJson(ev.data);
    } else {
      // Binario recibido → lo tratamos como archivo descargable
      const blob = ev.data;
      const url = URL.createObjectURL(blob);
    }
  };

  ws.onclose = (ev) => {
    console.log('WS cerrado:', ev.reason || ev.code);
    if (seccionChat && !seccionLogin.classList.contains('hidden')) return; // ya en login
    notificarSistema('Conexión cerrada');
  };

  ws.onerror = (err) => {
    console.error('WS error:', err);
  };
}

// Maneja mensajes JSON recibidos desde el servidor
function manejarJson(texto) {
  let m;
  try { m = JSON.parse(texto); } catch { return; }

  switch (m.type) {
    case 'auth_ok':
      yo = m.username;
      seccionLogin.classList.add('hidden');
      seccionChat.classList.remove('hidden');
      $('#loginMsg').textContent = '';
      // Añadir el usuario actual a la lista de conectados de inmediato
      renderizarListaUsuarios([yo]);
      break;

    case 'auth_fail':
      // Mostrar mensaje genérico en español ignorando texto en inglés del servidor
      $('#loginMsg').textContent = 'Datos incorrectos';
      try { ws.close(); } catch {}
      break;

    case 'userlist':
      // Renderizar la lista de usuarios conectados (array de nombres)
      renderizarListaUsuarios(m.users || []);
      break;

    case 'text':
      renderizarTexto(m.from, m.content, m.timestamp, m.from === yo);
      break;

    case 'file':
      // Recibir archivo con metadatos y tipo MIME correcto
      recibirArchivoRemoto(m.from, m.filename, m.mimetype, m.data, m.timestamp);
      break;

    case 'error':
      notificarSistema(`Error: ${m.msg || 'desconocido'}`);
      break;

    // ========== Mensajes de Videollamada Grupal ==========
    case 'room_users':
      // Recibir lista de usuarios ya en la sala
      handleRoomUsers(m.users);
      break;

    case 'user_joined':
      // Nuevo usuario se unió a la llamada
      handleUserJoined(m.username);
      break;

    case 'user_left':
      // Usuario salió de la llamada
      handleUserLeft(m.username);
      break;

    case 'webrtc_offer':
      // Recibir oferta WebRTC de otro peer
      handleWebRTCOffer(m.from, m.offer);
      break;

    case 'webrtc_answer':
      // Recibir respuesta WebRTC
      handleWebRTCAnswer(m.from, m.answer);
      break;

    case 'webrtc_ice':
      // Recibir ICE candidate
      handleWebRTCIce(m.from, m.candidate);
      break;
  }
}

// Envía un mensaje de texto
function enviarMensaje() {
  const t = $('#txt').value.trim();
  if (!t || !ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ type:'text', content: t }));
  $('#txt').value = '';
}

// Envía un archivo seleccionado
async function enviarArchivo(e) {
  const f = e.target.files[0];
  if (!f || !ws || ws.readyState !== WebSocket.OPEN) return;

  try {
    // Leer archivo como ArrayBuffer
    const buf = await f.arrayBuffer();
    
    // Convertir a Base64
    const base64 = arrayBufferToBase64(buf);
    
    // Enviar como JSON con metadatos completos
    ws.send(JSON.stringify({
      type: 'file',
      filename: f.name,
      mimetype: f.type || 'application/octet-stream',
      size: f.size,
      data: base64
    }));

    // Mostrar archivo propio en el chat
    const url = URL.createObjectURL(new Blob([buf], { type: f.type || 'application/octet-stream' }));
    renderizarArchivoEnChat(url, f.name, yo, true, Date.now());
    
    e.target.value = '';
  } catch (err) {
    console.error('Error al enviar archivo:', err);
    notificarSistema('Error al enviar el archivo');
  }
}

// Cierra sesión y limpia UI
function cerrarSesion() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type:'logout' }));
    ws.close();
  }
  seccionChat.classList.add('hidden');
  seccionLogin.classList.remove('hidden');
  cajaMensajes.innerHTML = '';
  const ul = document.getElementById('userList'); if (ul) ul.innerHTML = '';
  yo = null;
}

// Dibuja un mensaje de texto con avatar, nombre y hora
function renderizarTexto(desde, contenido, ts, mio=false) {
  const wrap = document.createElement('div');
  wrap.className = 'msg-container' + (mio ? ' mine' : '');
  
  const avatarSvg = `<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <clipPath id="clip-circle">
      <circle cx="20" cy="20" r="20"/>
    </clipPath>
    <circle cx="20" cy="20" r="20" fill="#BBBCBC"/>
    <g clip-path="url(#clip-circle)">
      <circle cx="20" cy="15" r="6.5" fill="#F2F2F2"/>
      <ellipse cx="20" cy="38" rx="14" ry="12" fill="#F2F2F2"/>
    </g>
  </svg>`;
  
  wrap.innerHTML = `
    <div class="msg-avatar">
      ${avatarSvg}
      <div class="msg-username">${escaparHtml(desde)}</div>
    </div>
    <div class="msg-bubble ${mio ? 'me' : ''}">
      <div class="msg-content">${escaparHtml(contenido)}</div>
      <div class="msg-time">${formatearHora(ts)}</div>
    </div>
  `;
  cajaMensajes.appendChild(wrap);
  cajaMensajes.scrollTop = cajaMensajes.scrollHeight;
}

// Renderiza la lista de usuarios conectados en la barra lateral
function renderizarListaUsuarios(usuarios) {
  const ul = document.getElementById('userList');
  if (!ul) return;
  ul.innerHTML = '';
  
  // Ordenar para mostrar primero al usuario actual
  const ordenados = (usuarios || []).sort((a, b) => {
    if (a === yo) return -1;
    if (b === yo) return 1;
    return a.localeCompare(b);
  });

  ordenados.forEach(u => {
    const li = document.createElement('li');
    li.className = 'user' + (u === yo ? ' me' : '');
    li.innerHTML = `<span class="status"></span><span class="name">${escaparHtml(u)}</span>`;
    ul.appendChild(li);
  });
}

// Muestra un archivo enviado como mensaje propio con enlace de descarga
function renderizarArchivo(url, nombre) {
  const wrap = document.createElement('div');
  wrap.className = 'msg me';
  wrap.innerHTML = `
    <div class="meta"><strong>${escaparHtml(yo || 'Yo')}</strong> · ${formatearHora(Date.now())}</div>
    <div class="content">📎 <a class="file" href="${url}" download="${escaparAtributo(nombre)}">${escaparHtml(nombre)}</a></div>
  `;
  cajaMensajes.appendChild(wrap);
  cajaMensajes.scrollTop = cajaMensajes.scrollHeight;
}

// Inserta un aviso del sistema en el chat
function notificarSistema(texto) {
  const wrap = document.createElement('div');
  wrap.className = 'msg';
  wrap.innerHTML = `<div class="meta">Sistema</div><div class="content">${escaparHtml(texto)}</div>`;
  cajaMensajes.appendChild(wrap);
  cajaMensajes.scrollTop = cajaMensajes.scrollHeight;
}

// Utilidades varias
function formatearHora(ts) {
  try {
    const d = new Date(ts);
    // Solo horas y minutos, respetando formato 12/24h del sistema
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}
function escaparHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function escaparAtributo(s) { return String(s).replace(/"/g, '&quot;'); }

// ==================== FUNCIONES DE MANEJO DE ARCHIVOS ====================

// Convertir ArrayBuffer a Base64
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convertir Base64 a ArrayBuffer
function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Recibir archivo de otro usuario
function recibirArchivoRemoto(desde, filename, mimetype, base64Data, timestamp) {
  try {
    // Convertir base64 a blob con el tipo MIME correcto
    const arrayBuffer = base64ToArrayBuffer(base64Data);
    const blob = new Blob([arrayBuffer], { type: mimetype });
    const url = URL.createObjectURL(blob);
    
    // Renderizar en el chat
    renderizarArchivoEnChat(url, filename, desde, false, timestamp);
  } catch (err) {
    console.error('Error al recibir archivo:', err);
    notificarSistema(`Error al recibir archivo de ${desde}`);
  }
}

// Renderizar archivo en el chat
function renderizarArchivoEnChat(url, nombre, desde, mio = false, timestamp = Date.now()) {
  const wrap = document.createElement('div');
  wrap.className = 'msg-container' + (mio ? ' mine' : '');
  
  const avatarSvg = `<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <clipPath id="clip-circle">
      <circle cx="20" cy="20" r="20"/>
    </clipPath>
    <circle cx="20" cy="20" r="20" fill="#BBBCBC"/>
    <g clip-path="url(#clip-circle)">
      <circle cx="20" cy="15" r="6.5" fill="#F2F2F2"/>
      <ellipse cx="20" cy="38" rx="14" ry="12" fill="#F2F2F2"/>
    </g>
  </svg>`;

  // Obtener extensión y emoji del archivo
  const extension = nombre.includes('.') ? nombre.split('.').pop().toUpperCase() : 'FILE';
  const emoji = obtenerEmojiPorExtension(extension);
  
  wrap.innerHTML = `
    <div class="msg-avatar">
      ${avatarSvg}
      <div class="msg-username">${escaparHtml(desde)}</div>
    </div>
    <div class="msg-bubble ${mio ? 'me' : ''}">
      <div class="msg-content file-message">
        <div class="file-icon">${emoji}</div>
        <div class="file-info">
          <a class="file-link" href="${url}" download="${escaparAtributo(nombre)}">${escaparHtml(nombre)}</a>
          <span class="file-badge">${extension}</span>
        </div>
      </div>
      <div class="msg-time">${formatearHora(timestamp)}</div>
    </div>
  `;
  cajaMensajes.appendChild(wrap);
  cajaMensajes.scrollTop = cajaMensajes.scrollHeight;
}

// Obtener emoji según extensión de archivo
function obtenerEmojiPorExtension(ext) {
  const extensiones = {
    // Imágenes
    'JPG': '🖼️', 'JPEG': '🖼️', 'PNG': '🖼️', 'GIF': '🖼️', 'SVG': '🖼️', 
    'WEBP': '🖼️', 'BMP': '🖼️', 'ICO': '🖼️',
    
    // Documentos
    'PDF': '📄', 'DOC': '📝', 'DOCX': '📝', 'TXT': '📝', 'RTF': '📝',
    'ODT': '📝', 'PAGES': '📝',
    
    // Hojas de cálculo
    'XLS': '📊', 'XLSX': '📊', 'CSV': '📊', 'ODS': '📊', 'NUMBERS': '📊',
    
    // Presentaciones
    'PPT': '📊', 'PPTX': '📊', 'KEY': '📊', 'ODP': '📊',
    
    // Archivos comprimidos
    'ZIP': '🗜️', 'RAR': '🗜️', '7Z': '🗜️', 'TAR': '🗜️', 'GZ': '🗜️',
    'BZ2': '🗜️', 'XZ': '🗜️',
    
    // Audio
    'MP3': '🎵', 'WAV': '🎵', 'OGG': '🎵', 'M4A': '🎵', 'FLAC': '🎵',
    'AAC': '🎵', 'WMA': '🎵', 'OPUS': '🎵',
    
    // Video
    'MP4': '🎬', 'AVI': '🎬', 'MKV': '🎬', 'MOV': '🎬', 'WMV': '🎬',
    'FLV': '🎬', 'WEBM': '🎬', 'M4V': '🎬',
    
    // Código fuente
    'JS': '💻', 'JAVA': '💻', 'PY': '💻', 'HTML': '💻', 'CSS': '💻',
    'JSON': '💻', 'XML': '💻', 'CPP': '💻', 'C': '💻', 'H': '💻',
    'PHP': '💻', 'SQL': '💻', 'SH': '💻', 'BAT': '💻', 'TS': '💻',
    'JSX': '💻', 'VUE': '💻', 'GO': '💻', 'RUST': '💻', 'SWIFT': '💻',
    
    // Otros
    'EXE': '⚙️', 'DLL': '⚙️', 'APK': '📱', 'IPA': '📱',
    'FONT': '🔤', 'TTF': '🔤', 'OTF': '🔤', 'WOFF': '🔤'
  };
  
  return extensiones[ext] || '📎';
}

// ==================== FUNCIONES DE VIDEOLLAMADA GRUPAL ====================

// Toggle unirse/salir de la videollamada
async function toggleVideoCall() {
  if (inCall) {
    leaveVideoCall();
  } else {
    await joinVideoCall();
  }
}

// Unirse a la videollamada
async function joinVideoCall() {
  try {
    // Obtener permisos de cámara y micrófono
    localStream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    inCall = true;
    $('#videoCallModal').classList.remove('hidden');
    $('#btnJoinCall').classList.add('in-call');

    // Agregar video propio al grid
    addLocalVideo();

    // Notificar al servidor que nos unimos a la sala
    ws.send(JSON.stringify({ type: 'join_room' }));

    notificarSistema('Te has unido a la videollamada');
  } catch (err) {
    console.error('Error al acceder a medios:', err);
    alert('No se pudo acceder a la cámara/micrófono. Por favor verifica los permisos.');
  }
}

// Salir de la videollamada
function leaveVideoCall() {
  // Cerrar todas las conexiones peer
  Object.values(peerConnections).forEach(pc => pc.close());
  peerConnections = {};

  // Detener stream local
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }

  // Limpiar UI
  $('#videoGrid').innerHTML = '';
  $('#callParticipants').innerHTML = '';
  $('#videoCallModal').classList.add('hidden');
  $('#btnJoinCall').classList.remove('in-call');

  participants.clear();
  inCall = false;

  // Notificar al servidor
  ws.send(JSON.stringify({ type: 'leave_room' }));

  notificarSistema('Has salido de la videollamada');
}

// Agregar video local al grid
function addLocalVideo() {
  const videoGrid = $('#videoGrid');
  
  const videoContainer = document.createElement('div');
  videoContainer.className = 'video-participant local';
  videoContainer.id = 'video-local';
  
  const video = document.createElement('video');
  video.srcObject = localStream;
  video.autoplay = true;
  video.muted = true;
  video.playsinline = true;
  
  const info = document.createElement('div');
  info.className = 'participant-info';
  info.textContent = `${yo} (Tú)`;
  
  videoContainer.appendChild(video);
  videoContainer.appendChild(info);
  videoGrid.appendChild(videoContainer);

  // Agregar a lista de participantes
  addParticipantToList(yo, true);
  updateParticipantCount();
}

// Manejar lista de usuarios ya en la sala
async function handleRoomUsers(users) {
  console.log('Usuarios en la sala:', users);
  
  for (const user of users) {
    if (user !== yo) {
      participants.add(user);
      await createPeerConnection(user, true); // true = somos el que llama
    }
  }
}

// Manejar nuevo usuario que se unió
async function handleUserJoined(username) {
  console.log('Usuario se unió:', username);
  notificarSistema(`${username} se unió a la videollamada`);
  
  if (username !== yo && inCall) {
    participants.add(username);
    // El nuevo usuario nos enviará una oferta
  }
}

// Manejar usuario que salió
function handleUserLeft(username) {
  console.log('Usuario salió:', username);
  notificarSistema(`${username} salió de la videollamada`);
  
  participants.delete(username);
  
  // Cerrar conexión peer
  if (peerConnections[username]) {
    peerConnections[username].close();
    delete peerConnections[username];
  }
  
  // Remover video del grid
  const videoElement = document.getElementById(`video-${username}`);
  if (videoElement) videoElement.remove();
  
  // Remover de lista
  removeParticipantFromList(username);
  updateParticipantCount();
}

// Crear conexión peer con otro usuario
async function createPeerConnection(username, isInitiator) {
  console.log(`Creando peer connection con ${username}, iniciador: ${isInitiator}`);
  
  const pc = new RTCPeerConnection(rtcConfig);
  peerConnections[username] = pc;

  // Agregar tracks locales
  localStream.getTracks().forEach(track => {
    pc.addTrack(track, localStream);
  });

  // Manejar tracks remotos
  pc.ontrack = (event) => {
    console.log(`Track remoto recibido de ${username}`);
    addRemoteVideo(username, event.streams[0]);
  };

  // Manejar ICE candidates
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      ws.send(JSON.stringify({
        type: 'webrtc_ice',
        to: username,
        candidate: event.candidate
      }));
    }
  };

  // Manejar estado de conexión
  pc.onconnectionstatechange = () => {
    console.log(`Estado de conexión con ${username}: ${pc.connectionState}`);
    if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
      handleUserLeft(username);
    }
  };

  // Si somos el iniciador, crear oferta
  if (isInitiator) {
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      ws.send(JSON.stringify({
        type: 'webrtc_offer',
        to: username,
        offer: offer
      }));
    } catch (err) {
      console.error('Error al crear oferta:', err);
    }
  }

  return pc;
}

// Manejar oferta WebRTC recibida
async function handleWebRTCOffer(from, offer) {
  console.log(`Oferta WebRTC recibida de ${from}`);
  
  if (!inCall) return;
  
  participants.add(from);
  
  // Crear peer connection si no existe
  if (!peerConnections[from]) {
    await createPeerConnection(from, false);
  }
  
  const pc = peerConnections[from];
  
  try {
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    
    ws.send(JSON.stringify({
      type: 'webrtc_answer',
      to: from,
      answer: answer
    }));
  } catch (err) {
    console.error('Error al manejar oferta:', err);
  }
}

// Manejar respuesta WebRTC recibida
async function handleWebRTCAnswer(from, answer) {
  console.log(`Respuesta WebRTC recibida de ${from}`);
  
  const pc = peerConnections[from];
  if (pc) {
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (err) {
      console.error('Error al manejar respuesta:', err);
    }
  }
}

// Manejar ICE candidate recibido
async function handleWebRTCIce(from, candidate) {
  const pc = peerConnections[from];
  if (pc && candidate) {
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error('Error al agregar ICE candidate:', err);
    }
  }
}

// Agregar video remoto al grid
function addRemoteVideo(username, stream) {
  // Verificar si ya existe
  let videoContainer = document.getElementById(`video-${username}`);
  
  if (!videoContainer) {
    const videoGrid = $('#videoGrid');
    videoContainer = document.createElement('div');
    videoContainer.className = 'video-participant';
    videoContainer.id = `video-${username}`;
    
    const video = document.createElement('video');
    video.autoplay = true;
    video.playsinline = true;
    
    const info = document.createElement('div');
    info.className = 'participant-info';
    info.textContent = username;
    
    videoContainer.appendChild(video);
    videoContainer.appendChild(info);
    videoGrid.appendChild(videoContainer);
    
    addParticipantToList(username, false);
    updateParticipantCount();
  }
  
  const video = videoContainer.querySelector('video');
  video.srcObject = stream;
}

// Agregar participante a la lista
function addParticipantToList(username, isLocal) {
  const list = $('#callParticipants');
  
  const item = document.createElement('li');
  item.className = 'call-participant-item' + (isLocal ? ' local' : '');
  item.id = `participant-${username}`;
  
  const avatar = document.createElement('div');
  avatar.className = 'participant-avatar';
  avatar.textContent = username.charAt(0).toUpperCase();
  
  const name = document.createElement('span');
  name.textContent = username + (isLocal ? ' (Tú)' : '');
  
  const status = document.createElement('div');
  status.className = 'participant-status';
  
  const statusIcon = document.createElement('div');
  statusIcon.className = 'status-icon';
  status.appendChild(statusIcon);
  
  item.appendChild(avatar);
  item.appendChild(name);
  item.appendChild(status);
  list.appendChild(item);
}

// Remover participante de la lista
function removeParticipantFromList(username) {
  const item = document.getElementById(`participant-${username}`);
  if (item) item.remove();
}

// Actualizar contador de participantes
function updateParticipantCount() {
  const count = document.querySelectorAll('.video-participant').length;
  $('#participantCount').textContent = `${count} participante${count !== 1 ? 's' : ''}`;
  
  // Actualizar layout del grid
  $('#videoGrid').setAttribute('data-count', count);
}

// Toggle micrófono
function toggleMicrophone() {
  if (!localStream) return;
  
  const audioTrack = localStream.getAudioTracks()[0];
  if (audioTrack) {
    audioTrack.enabled = !audioTrack.enabled;
    const btn = $('#btnToggleMic');
    
    if (audioTrack.enabled) {
      btn.classList.remove('muted');
      btn.title = 'Silenciar micrófono';
    } else {
      btn.classList.add('muted');
      btn.title = 'Activar micrófono';
    }
    
    // Actualizar UI del video local
    const localInfo = document.querySelector('#video-local .participant-info');
    if (localInfo) {
      if (audioTrack.enabled) {
        localInfo.classList.remove('muted');
      } else {
        localInfo.classList.add('muted');
      }
    }
  }
}

// Toggle cámara
function toggleCamera() {
  if (!localStream) return;
  
  const videoTrack = localStream.getVideoTracks()[0];
  if (videoTrack) {
    videoTrack.enabled = !videoTrack.enabled;
    const btn = $('#btnToggleCam');
    
    if (videoTrack.enabled) {
      btn.classList.remove('active');
      btn.title = 'Desactivar cámara';
    } else {
      btn.classList.add('active');
      btn.title = 'Activar cámara';
    }
  }
}

// Compartir pantalla
async function shareScreen() {
  try {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: { cursor: 'always' },
      audio: false
    });
    
    const screenTrack = screenStream.getVideoTracks()[0];
    
    // Reemplazar track de video en todas las conexiones peer
    for (const [username, pc] of Object.entries(peerConnections)) {
      const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
      if (sender) {
        sender.replaceTrack(screenTrack);
      }
    }
    
    // Actualizar video local
    const localVideo = document.querySelector('#video-local video');
    if (localVideo) {
      localVideo.srcObject = new MediaStream([screenTrack]);
    }
    
    // Cuando se detenga compartir, volver a la cámara
    screenTrack.onended = () => {
      const videoTrack = localStream.getVideoTracks()[0];
      for (const [username, pc] of Object.entries(peerConnections)) {
        const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      }
      
      const localVideo = document.querySelector('#video-local video');
      if (localVideo) {
        localVideo.srcObject = localStream;
      }
    };
    
    $('#btnShareScreen').classList.add('active');
  } catch (err) {
    console.error('Error al compartir pantalla:', err);
  }
}
