
let ws = null;      // WebSocket activo
let yo = null;      // Nombre de usuario autenticado

// Utilidades de selección de nodos
const $  = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

// Referencias a secciones/nodos clave
const seccionLogin = $('#login');
const seccionChat  = $('#chat');
const cajaMensajes = $('#messages');

// Eventos de UI
$('#btnLogin').onclick = conectar;
$('#send').onclick = enviarMensaje;
$('#txt').addEventListener('keydown', e => { if (e.key === 'Enter') enviarMensaje(); });
$('#file').onchange = enviarArchivo;
$('#btnLogout').onclick = cerrarSesion;

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
