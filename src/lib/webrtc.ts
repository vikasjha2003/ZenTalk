import type { CallType } from '@/lib/zentalk-types';

const RTC_CONFIGURATION: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
  ],
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
