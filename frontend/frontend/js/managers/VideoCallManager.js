import DOMUtils from '../utils/DOMUtils.js';
import WebSocketManager from './WebSocketManager.js';
import UIManager from './UIManager.js';

/**
 * VideoCallManager - Gestiona videollamadas grupales con WebRTC
 * Patrón Singleton para mantener estado de la llamada
 */
class VideoCallManager {
  static instance = null;

  constructor() {
    if (VideoCallManager.instance) {
      return VideoCallManager.instance;
    }

    this.wsManager = WebSocketManager.getInstance();
    
    // Estado de la llamada
    this.inCall = false;
    this.localStream = null;
    this.peerConnections = {}; // {username: RTCPeerConnection}
    this.participants = new Set();
    
    // Configuración RTC
    this.rtcConfig = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    // Referencias DOM
    this.modal = null;
    this.videoGrid = null;
    this.participantsList = null;
    this.joinButton = null;

    VideoCallManager.instance = this;
  }

  /**
   * Obtiene la instancia única
   * @returns {VideoCallManager}
   */
  static getInstance() {
    if (!VideoCallManager.instance) {
      VideoCallManager.instance = new VideoCallManager();
    }
    return VideoCallManager.instance;
  }

  /**
   * Inicializa referencias DOM
   */
  initDOMReferences() {
    this.modal = DOMUtils.$('#videoCallModal');
    this.videoGrid = DOMUtils.$('#videoGrid');
    this.participantsList = DOMUtils.$('#callParticipants');
    this.joinButton = DOMUtils.$('#btnJoinCall');
    this.videoCallModal = DOMUtils.$('.video-call-modal');
    this.videoCallHeader = DOMUtils.$('.video-call-header');
    
    // Inicializar arrastre de ventana
    this.initDraggable();
  }

  /**
   * Inicializa la funcionalidad de arrastrar ventana
   */
  initDraggable() {
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    const header = this.videoCallHeader;
    const modal = this.videoCallModal;

    if (!header || !modal) return;

    header.addEventListener('mousedown', (e) => {
      if (modal.classList.contains('maximized')) return;
      
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;

      if (e.target === header || e.target.closest('.call-info')) {
        isDragging = true;
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        xOffset = currentX;
        yOffset = currentY;

        modal.style.transform = `translate(${currentX}px, ${currentY}px)`;
        modal.style.right = 'auto';
        modal.style.bottom = 'auto';
        modal.style.left = '20px';
        modal.style.top = '20px';
      }
    });

    document.addEventListener('mouseup', () => {
      initialX = currentX;
      initialY = currentY;
      isDragging = false;
    });
  }

  /**
   * Toggle entre maximizar y restaurar la ventana
   */
  toggleMaximize() {
    const modal = this.videoCallModal;
    const btn = DOMUtils.$('#btnMaximizeCall');
    
    if (!modal) return;

    if (modal.classList.contains('maximized')) {
      modal.classList.remove('maximized');
      modal.style.transform = '';
      modal.style.right = '20px';
      modal.style.bottom = '20px';
      modal.style.left = 'auto';
      modal.style.top = 'auto';
      if (btn) btn.textContent = '⛶';
      if (btn) btn.title = 'Maximizar';
    } else {
      modal.classList.add('maximized');
      modal.style.transform = '';
      if (btn) btn.textContent = '◱';
      if (btn) btn.title = 'Restaurar';
    }
  }

  /**
   * Toggle unirse/salir de videollamada
   */
  async toggleCall() {
    if (this.inCall) {
      this.leaveCall();
    } else {
      await this.joinCall();
    }
  }

  /**
   * Une a la videollamada
   * @param {string} currentUser - Usuario actual
   */
  async joinCall(currentUser) {
    try {
      // Solicitar permisos de cámara y micrófono
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      this.inCall = true;
      this.modal.classList.remove('hidden');
      this.joinButton.classList.add('in-call');

      // Agregar video local
      this.addLocalVideo(currentUser);

      // Notificar al servidor
      this.wsManager.send({ type: 'join_room' });

      return true;
    } catch (err) {
      console.error('Error al acceder a medios:', err);
      alert('No se pudo acceder a la cámara/micrófono. Verifica los permisos.');
      return false;
    }
  }

  /**
   * Sale de la videollamada
   */
  leaveCall() {
    // Cerrar todas las conexiones peer
    Object.values(this.peerConnections).forEach(pc => pc.close());
    this.peerConnections = {};

    // Detener stream local
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Limpiar UI
    this.videoGrid.innerHTML = '';
    this.participantsList.innerHTML = '';
    this.modal.classList.add('hidden');
    this.joinButton.classList.remove('in-call');

    this.participants.clear();
    this.inCall = false;

    // Notificar al servidor
    this.wsManager.send({ type: 'leave_room' });
  }

  /**
   * Agrega video local al grid
   * @param {string} username - Nombre de usuario
   */
  addLocalVideo(username) {
    const videoContainer = document.createElement('div');
    videoContainer.className = 'video-participant local';
    videoContainer.id = 'video-local';
    
    const video = document.createElement('video');
    video.srcObject = this.localStream;
    video.autoplay = true;
    video.muted = true;
    video.playsinline = true;
    
    const info = document.createElement('div');
    info.className = 'participant-info';
    info.textContent = `${username} (Tú)`;
    
    videoContainer.appendChild(video);
    videoContainer.appendChild(info);
    this.videoGrid.appendChild(videoContainer);

    this.addParticipantToList(username, true);
    this.updateParticipantCount();
  }

  /**
   * Maneja lista de usuarios en la sala
   * @param {Array<string>} users - Lista de usuarios
   */
  async handleRoomUsers(users) {
    console.log('Usuarios en la sala:', users);
    
    for (const user of users) {
      const currentUser = this.wsManager.currentUser || '';
      if (user !== currentUser) {
        this.participants.add(user);
        await this.createPeerConnection(user, true);
      }
    }
  }

  /**
   * Maneja nuevo usuario que se unió
   * @param {string} username - Nombre de usuario
   */
  handleUserJoined(username) {
    console.log('Usuario se unió:', username);
    
    if (username !== this.getCurrentUser() && this.inCall) {
      this.participants.add(username);
    }
  }

  /**
   * Maneja usuario que salió
   * @param {string} username - Nombre de usuario
   */
  handleUserLeft(username) {
    console.log('Usuario salió:', username);
    
    this.participants.delete(username);
    
    // Cerrar conexión peer
    if (this.peerConnections[username]) {
      this.peerConnections[username].close();
      delete this.peerConnections[username];
    }
    
    // Remover video
    const videoElement = document.getElementById(`video-${username}`);
    if (videoElement) videoElement.remove();
    
    this.removeParticipantFromList(username);
    this.updateParticipantCount();
  }

  /**
   * Crea conexión peer con otro usuario
   * @param {string} username - Nombre de usuario
   * @param {boolean} isInitiator - Si inicia la conexión
   */
  async createPeerConnection(username, isInitiator) {
    console.log(`Creando peer connection con ${username}, iniciador: ${isInitiator}`);
    
    const pc = new RTCPeerConnection(this.rtcConfig);
    this.peerConnections[username] = pc;

    // Agregar tracks locales
    this.localStream.getTracks().forEach(track => {
      pc.addTrack(track, this.localStream);
    });

    // Manejar tracks remotos
    pc.ontrack = (event) => {
      console.log(`Track remoto recibido de ${username}`);
      this.addRemoteVideo(username, event.streams[0]);
    };

    // Manejar ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.wsManager.send({
          type: 'webrtc_ice',
          to: username,
          candidate: event.candidate
        });
      }
    };

    // Manejar estado de conexión
    pc.onconnectionstatechange = () => {
      console.log(`Estado de conexión con ${username}: ${pc.connectionState}`);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        this.handleUserLeft(username);
      }
    };

    // Si somos iniciadores, crear oferta
    if (isInitiator) {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        this.wsManager.send({
          type: 'webrtc_offer',
          to: username,
          offer: offer
        });
      } catch (err) {
        console.error('Error al crear oferta:', err);
      }
    }

    return pc;
  }

  /**
   * Maneja oferta WebRTC
   * @param {string} from - Usuario que envía
   * @param {RTCSessionDescriptionInit} offer - Oferta
   */
  async handleOffer(from, offer) {
    console.log(`Oferta WebRTC recibida de ${from}`);
    
    if (!this.inCall) return;
    
    this.participants.add(from);
    
    if (!this.peerConnections[from]) {
      await this.createPeerConnection(from, false);
    }
    
    const pc = this.peerConnections[from];
    
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      this.wsManager.send({
        type: 'webrtc_answer',
        to: from,
        answer: answer
      });
    } catch (err) {
      console.error('Error al manejar oferta:', err);
    }
  }

  /**
   * Maneja respuesta WebRTC
   * @param {string} from - Usuario que envía
   * @param {RTCSessionDescriptionInit} answer - Respuesta
   */
  async handleAnswer(from, answer) {
    console.log(`Respuesta WebRTC recibida de ${from}`);
    
    const pc = this.peerConnections[from];
    if (pc) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (err) {
        console.error('Error al manejar respuesta:', err);
      }
    }
  }

  /**
   * Maneja ICE candidate
   * @param {string} from - Usuario que envía
   * @param {RTCIceCandidateInit} candidate - Candidato ICE
   */
  async handleIceCandidate(from, candidate) {
    const pc = this.peerConnections[from];
    if (pc && candidate) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('Error al agregar ICE candidate:', err);
      }
    }
  }

  /**
   * Agrega video remoto al grid
   * @param {string} username - Nombre de usuario
   * @param {MediaStream} stream - Stream de video
   */
  addRemoteVideo(username, stream) {
    let videoContainer = document.getElementById(`video-${username}`);
    
    if (!videoContainer) {
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
      this.videoGrid.appendChild(videoContainer);
      
      this.addParticipantToList(username, false);
      this.updateParticipantCount();
    }
    
    const video = videoContainer.querySelector('video');
    video.srcObject = stream;
  }

  /**
   * Agrega participante a la lista
   * @param {string} username - Nombre de usuario
   * @param {boolean} isLocal - Si es usuario local
   */
  addParticipantToList(username, isLocal) {
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
    this.participantsList.appendChild(item);
  }

  /**
   * Remueve participante de la lista
   * @param {string} username - Nombre de usuario
   */
  removeParticipantFromList(username) {
    const item = document.getElementById(`participant-${username}`);
    if (item) item.remove();
  }

  /**
   * Actualiza contador de participantes
   */
  updateParticipantCount() {
    const count = this.videoGrid.querySelectorAll('.video-participant').length;
    const counter = DOMUtils.$('#participantCount');
    if (counter) {
      counter.textContent = `${count} participante${count !== 1 ? 's' : ''}`;
    }
    this.videoGrid.setAttribute('data-count', count);
  }

  /**
   * Toggle micrófono
   */
  toggleMicrophone() {
    if (!this.localStream) return;
    
    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      const btn = DOMUtils.$('#btnToggleMic');
      
      if (audioTrack.enabled) {
        btn.classList.remove('muted');
        btn.title = 'Silenciar micrófono';
      } else {
        btn.classList.add('muted');
        btn.title = 'Activar micrófono';
      }
    }
  }

  /**
   * Toggle cámara
   */
  toggleCamera() {
    if (!this.localStream) return;
    
    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      const btn = DOMUtils.$('#btnToggleCam');
      
      if (videoTrack.enabled) {
        btn.classList.remove('active');
        btn.title = 'Desactivar cámara';
      } else {
        btn.classList.add('active');
        btn.title = 'Activar cámara';
      }
    }
  }

  /**
   * Compartir pantalla
   */
  async shareScreen() {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false
      });
      
      const screenTrack = screenStream.getVideoTracks()[0];
      
      // Reemplazar track en todas las conexiones
      for (const pc of Object.values(this.peerConnections)) {
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
      
      // Restaurar cámara cuando termine
      screenTrack.onended = () => {
        const videoTrack = this.localStream.getVideoTracks()[0];
        for (const pc of Object.values(this.peerConnections)) {
          const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        }
        
        if (localVideo) {
          localVideo.srcObject = this.localStream;
        }
      };
      
      DOMUtils.$('#btnShareScreen').classList.add('active');
    } catch (err) {
      console.error('Error al compartir pantalla:', err);
    }
  }

  /**
   * Obtiene usuario actual
   * @returns {string}
   */
  getCurrentUser() {
    return UIManager.getInstance().getCurrentUser();
  }
}

export default VideoCallManager;
