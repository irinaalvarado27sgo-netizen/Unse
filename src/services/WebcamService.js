// src/services/WebcamService.js

export class WebcamService {
  constructor(videoEl) {
    this.videoEl = videoEl;
    this._stream = null;
  }

  get isSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  /** @returns {Promise<'active'|'fallback'>} */
  async start() {
    if (!this.isSupported) return 'fallback';
    try {
      this._stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      this.videoEl.srcObject = this._stream;
      await this.videoEl.play().catch(() => {});
      return 'active';
    } catch {
      return 'fallback';
    }
  }

  stop() {
    if (this._stream) {
      this._stream.getTracks().forEach((t) => t.stop());
      this._stream = null;
    }
    this.videoEl.srcObject = null;
  }
}
