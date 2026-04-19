import type { CallType } from '@/lib/zentalk-types';

function parseIceServerUrls(value: string | undefined): string[] {
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function buildRtcConfiguration(): RTCConfiguration {
  const stunUrls = parseIceServerUrls(import.meta.env.VITE_STUN_SERVERS)
    .concat([
      'stun:stun.l.google.com:19302',
      'stun:stun1.l.google.com:19302',
      'stun:stun2.l.google.com:19302',
    ]);

  const uniqueStunUrls = Array.from(new Set(stunUrls));
  const iceServers: RTCIceServer[] = uniqueStunUrls.length > 0 ? [{ urls: uniqueStunUrls }] : [];

  const turnUrls = parseIceServerUrls(import.meta.env.VITE_TURN_SERVERS);
  if (turnUrls.length > 0) {
    iceServers.push({
      urls: turnUrls,
      username: import.meta.env.VITE_TURN_USERNAME,
      credential: import.meta.env.VITE_TURN_CREDENTIAL,
    });
  }

  return {
    iceServers,
    iceTransportPolicy: 'all',
  };
}

const RTC_CONFIGURATION: RTCConfiguration = {
  ...buildRtcConfiguration(),
};

export function createPeerConnection(): RTCPeerConnection {
  return new RTCPeerConnection(RTC_CONFIGURATION);
}

export async function getLocalStream(type: CallType): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Your browser does not support camera or microphone access.');
  }

  return navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: type === 'video'
      ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        }
      : false,
  });
}

export function stopStream(stream: MediaStream | null | undefined): void {
  if (!stream) return;
  stream.getTracks().forEach(track => track.stop());
}

export function setAudioEnabled(stream: MediaStream | null | undefined, enabled: boolean): void {
  if (!stream) return;
  stream.getAudioTracks().forEach(track => {
    track.enabled = enabled;
  });
}

export function setVideoEnabled(stream: MediaStream | null | undefined, enabled: boolean): void {
  if (!stream) return;
  stream.getVideoTracks().forEach(track => {
    track.enabled = enabled;
  });
}
