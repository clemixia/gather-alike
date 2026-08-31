export type SignalKind = 'description' | 'candidate' | 'call-start' | 'call-end';

export interface SignalMessage {
  kind: SignalKind;
  from?: string;
  description?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

export type CallState =
  | 'idle'
  | 'starting'
  | 'connecting'
  | 'connected'
  | 'ended'
  | 'error';