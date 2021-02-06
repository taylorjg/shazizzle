const combineChannels = ([channel0, channel1], combinedChannelData) => {
  if (channel0.length !== combinedChannelData.length) throw new Error('Wrong channel0 length!')
  if (channel1.length !== combinedChannelData.length) throw new Error('Wrong channel1 length!')
  combinedChannelData.forEach((_, index) => {
    const value0 = channel0[index]
    const value1 = channel1[index]
    combinedChannelData[index] = 0.5 * (value0 + value1)
  })
}

class StreamWorkletProcessor extends AudioWorkletProcessor {

  constructor(options) {
    console.log('[StreamWorkletProcessor#constructor]', options)
    super(options)
    this.combinedChannelData = undefined
    this.bufferSize = options.processorOptions.bufferSize
    this.buffer = undefined
    this.offset = 0
    this.messagesSent = 0
  }

  process(inputs) {
    const channels = inputs[0]
    const channelData0 = channels[0]
    const channelDataLength = channelData0.length
    console.log(`[StreamWorkletProcessor#process] channels: ${channels.length}; channelDataLength: ${channelDataLength}; messagesSent: ${this.messagesSent}`)
    if (!this.buffer) {
      const bufferSize = Math.max(this.bufferSize, channelDataLength)
      this.buffer = new Float32Array(bufferSize)
    }
    if (channels.length === 2) {
      if (!this.combinedChannelData) {
        this.combinedChannelData = new Float32Array(channelDataLength)
      }
      combineChannels(channels, this.combinedChannelData)
      this.buffer.set(this.combinedChannelData, this.offset)
    } else {
      this.buffer.set(channelData0, this.offset)
    }
    this.offset += channelDataLength
    if (this.offset === this.buffer.length) {
      this.port.postMessage(this.buffer)
      this.offset = 0
      this.messagesSent++
    }
    return true
  }
}

registerProcessor('stream-processor', StreamWorkletProcessor)
