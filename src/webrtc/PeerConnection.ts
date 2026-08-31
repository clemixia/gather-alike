import type { SignalMessage } from './types';

// STUN only for now. TURN servers can be added later.
const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  {
    urls: ['stun:stun.l.google.com:19302'],
  },
];

interface PeerConnectionOptions {
  polite: boolean;
  onSignal: (message: SignalMessage) => void;
  onRemoteStream?: (stream: MediaStream) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
}

export class PeerConnection {
  readonly pc: RTCPeerConnection;

  private polite: boolean;
  private makingOffer = false;
  private ignoreOffer = false;
  private options: PeerConnectionOptions;

  constructor(options: PeerConnectionOptions) {
    this.options = options;
    this.polite = options.polite;

    this.pc = new RTCPeerConnection({
      iceServers: DEFAULT_ICE_SERVERS,
    });

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.options.onSignal({
          kind: 'candidate',
          candidate: event.candidate.toJSON(),
        });
      }
    };

    this.pc.onnegotiationneeded = async () => {
      try {
        this.makingOffer = true;
        const offer = await this.pc.createOffer();
        await this.pc.setLocalDescription(offer);

        this.options.onSignal({
          kind: 'description',
          description: this.pc.localDescription?.toJSON(),
        });
      } catch (error) {
        console.error('[PeerConnection] negotiationneeded error:', error);
      } finally {
        this.makingOffer = false;
      }
    };

    this.pc.ontrack = (event) => {
      const stream = event.streams[0];
      if (stream) {
        this.options.onRemoteStream?.(stream);
      }
    };

    this.pc.onconnectionstatechange = () => {
      this.options.onConnectionStateChange?.(this.pc.connectionState);
    };
  }

  addTrack(track: MediaStreamTrack, stream: MediaStream) {
    this.pc.addTrack(track, stream);
  }

  async handleSignal(message: SignalMessage) {
    try {
      if (message.kind === 'description' && message.description) {
        await this.handleDescription(message.description);
      }

      if (message.kind === 'candidate' && message.candidate) {
        await this.pc.addIceCandidate(message.candidate);
      }
    } catch (error) {
      if (!this.ignoreOffer) {
        console.error('[PeerConnection] handleSignal error:', error);
      }
    }
  }

  private async handleDescription(description: RTCSessionDescriptionInit) {
    const offerCollision =
      description.type === 'offer' &&
      (this.makingOffer || this.pc.signalingState !== 'stable');

    this.ignoreOffer = !this.polite && offerCollision;

    if (this.ignoreOffer) {
      return;
    }

    if (offerCollision) {
      await this.pc.setLocalDescription({ type: 'rollback' });
    }

    await this.pc.setRemoteDescription(description);

    if (description.type === 'offer') {
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);

      this.options.onSignal({
        kind: 'description',
        description: this.pc.localDescription?.toJSON(),
      });
    }
  }

  close() {
    this.pc.close();
  }
}