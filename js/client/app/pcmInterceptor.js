import * as C from '../common/constants.js'

class PcmInterceptorWorkletProcessor extends AudioWorkletProcessor {

  constructor(options) {
    console.log(`[PcmInterceptorWorkletProcessor#constructor] options: ${JSON.stringify(options)}`)
    super(options)
    const sampleRate = options.processorOptions && options.processorOptions.sampleRate || 44100
    const numSliversToBuffer = options.processorOptions && options.processorOptions.numSliversToBuffer || 5
    this.bufferSize = sampleRate * numSliversToBuffer * C.SLIVER_DURATION
    console.log(`[PcmInterceptorWorkletProcessor#constructor] this.bufferSize: ${this.bufferSize}`)
    this.buffer = new Float32Array(this.bufferSize)
    this.bufferCount = 0
  }

  combineChannels(channelData0, channelData1) {
    const channelData = channelData0.map((v0, index) => {
      const v1 = channelData1[index]
      const v = 0.5 * (v0 + v1)
      return v
    })
    return channelData
  }

  postBuffer() {
    console.log(`[PcmInterceptorWorkletProcessor#postBuffer] this.bufferCount: ${this.bufferCount}`)
    this.port.postMessage(this.buffer)
    this.buffer.fill(0)
    this.bufferCount = 0
  }

  appendToBuffer(channelData) {
    const remainingSize = this.bufferSize - this.bufferCount
    if (remainingSize >= channelData.length) {
      this.buffer.set(channelData, this.bufferCount)
      this.bufferCount += channelData.length
      if (this.bufferCount === this.bufferSize) {
        this.postBuffer()
      }
      return
    }
    this.buffer.set(channelData.slice(0, remainingSize), this.bufferCount)
    this.bufferCount += remainingSize
    this.postBuffer()
    this.buffer.set(channelData.slice(remainingSize), this.bufferCount)
    this.bufferCount = channelData.length - remainingSize
  }

  process(inputs) {

    if (inputs.length !== 1) {
      console.log(`[PcmInterceptorWorkletProcessor#process] expected 1 input but got ${inputs.length}`)
      console.log(`[PcmInterceptorWorkletProcessor#process] returning false`)
      return false
    }

    const input = inputs[0]
    const numChannels = input.length
    switch (numChannels) {
      case 1:
        {
          const channelData = input[0]
          this.appendToBuffer(channelData)
          break
        }

      case 2:
        {
          const channelData = this.combineChannels(input[0], input[1])
          this.appendToBuffer(channelData)
          break
        }

      default:
        console.log(`[PcmInterceptorWorkletProcessor#process] expected 1 or 2 channels but got ${numChannels}`)
        console.log(`[PcmInterceptorWorkletProcessor#process] returning false`)
        return false
    }

    return true
  }
}

registerProcessor('PcmInterceptor', PcmInterceptorWorkletProcessor)
