class StreamProcessor extends AudioWorkletProcessor {

  constructor(options) {
    console.log('[StreamProcessor#constructor]', options)
    super(options)
    this.bufferSize = options.processorOptions.bufferSize
    this.buffers = []
    this.count = 0
  }

  process(inputs) {
    const input0 = inputs[0]
    const length = input0[0].length
    console.log(`[StreamProcessor#process] length: ${length}`)
    if (this.buffers.length === 0) {
      this.buffers = input0.map(() => new Float32Array(this.bufferSize))
    }
    input0.forEach((channelData, index) => {
      this.buffers[index].set(channelData, this.count)
    })
    this.count += length
    if (this.count === this.bufferSize) {
      this.port.postMessage(this.buffers)
      this.count = 0
    }
    return true
  }
}

registerProcessor('stream-processor', StreamProcessor)
