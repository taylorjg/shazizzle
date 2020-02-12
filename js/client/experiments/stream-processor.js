const combineChannels = channels => {
  const numberOfChannels = channels.length
  if (numberOfChannels === 1) return channels[0]
  if (numberOfChannels === 2) {
    const [channel0, channel1] = channels
    return channel0.map((value, idx) => 0.5 * (value + channel1[idx]))
  }
  throw new Error(`[combineChannels] expected 1 or 2 channels but got ${numberOfChannels}`)
}

class StreamProcessor extends AudioWorkletProcessor {

  constructor(options) {
    console.log('[StreamProcessor#constructor]', options)
    super(options)
    this.bufferSize = options.processorOptions.bufferSize
    this.buffer = undefined
    this.count = 0
  }

  process(inputs) {
    const channels = inputs[0]
    const channelData0 = channels[0]
    const channelDataLength = channelData0.length
    console.log(`[StreamProcessor#process] channelDataLength: ${channelDataLength}`)
    if (!this.buffer) {
      const bufferSize = Math.max(this.bufferSize, channelDataLength)
      this.buffer = new Float32Array(bufferSize)
    }
    const combinedChannelData = combineChannels(channels)
    this.buffer.set(combinedChannelData, this.count)
    this.count += channelDataLength
    if (this.count === this.buffer.length) {
      this.port.postMessage(this.buffer)
      this.count = 0
    }
    return true
  }
}

registerProcessor('stream-processor', StreamProcessor)
