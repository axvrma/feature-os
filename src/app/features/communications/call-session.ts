export type CallPhase =
  'idle' | 'dialing' | 'ringing' | 'incoming' | 'connected' | 'ended' | 'canceled';
export class CallSession {
  phase: CallPhase = 'idle';
  started = 0;
  connectedAt: number | null = null;
  endedAt: number | null = null;
  incoming = false;
  constructor(
    readonly phone: string,
    readonly name: string,
  ) {}
  start(now: number, incoming = false): void {
    this.incoming = incoming;
    this.started = now;
    this.phase = incoming ? 'incoming' : 'dialing';
  }
  advance(now: number): void {
    if (this.phase === 'dialing' && now - this.started >= 700) this.phase = 'ringing';
    if (this.phase === 'ringing' && now - this.started >= 2500) this.answer(now);
  }
  answer(now: number): void {
    if (this.phase !== 'ringing' && this.phase !== 'incoming' && this.phase !== 'dialing') return;
    this.connectedAt = now;
    this.phase = 'connected';
  }
  finish(now: number): boolean {
    if (!['dialing', 'ringing', 'incoming', 'connected'].includes(this.phase)) return false;
    this.endedAt = now;
    this.phase = this.connectedAt === null && !this.incoming ? 'canceled' : 'ended';
    return true;
  }
  duration(now: number): number {
    return this.connectedAt === null
      ? 0
      : Math.max(0, Math.floor(((this.endedAt ?? now) - this.connectedAt) / 1000));
  }
  get active(): boolean {
    return ['dialing', 'ringing', 'incoming', 'connected'].includes(this.phase);
  }
}
