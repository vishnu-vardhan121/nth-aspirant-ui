class MicProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._bufferSize = 2048; // At 16kHz, 2048 samples ≈ 128ms
    this._buffer = new Float32Array(this._bufferSize);
    this._ptr = 0;
  }

  process(inputs) {
    const input = inputs[0] && inputs[0][0];
    if (!input) return true;

    for (let i = 0; i < input.length; i++) {
      this._buffer[this._ptr++] = input[i];
      if (this._ptr >= this._bufferSize) {
        const pcm16 = this.floatTo16BitPCM(this._buffer);
        this.port.postMessage(pcm16.buffer, [pcm16.buffer]);
        this._ptr = 0;
      }
    }
    return true;
  }

  floatTo16BitPCM(float32Array) {
    const buffer = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      buffer[i] = float32Array[i] * 32768;
    }
    return buffer;
  }
}

registerProcessor('mic-processor', MicProcessor);
