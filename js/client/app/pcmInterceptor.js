/* eslint-disable no-console */

import * as C from '../common/constants.js'

const SAMPLE_RATE = 44100 // TODO: add param for this
const NUM_SLIVERS_TO_BUFFER = 5 // TODO: add param for this
const BUFFER_SIZE = SAMPLE_RATE * C.SLIVER_DURATION * NUM_SLIVERS_TO_BUFFER

class PcmInterceptorWorkletProcessor extends AudioWorkletProcessor {

  constructor() {
    console.log(`[PcmInterceptorWorkletProcessor#constructor]`)
    super()
    this.buffer = new Float32Array(BUFFER_SIZE)
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

  sendMessage() {
    console.log(`[PcmInterceptorWorkletProcessor#sendMessage] this.bufferCount: ${this.bufferCount}`)
    // TODO: send a message
    this.buffer.fill(0)
    this.bufferCount = 0
  }

  appendToBuffer(channelData) {
    const remainingSize = BUFFER_SIZE - this.bufferCount
    if (remainingSize >= channelData.length) {
      this.buffer.set(channelData, this.bufferCount)
      this.bufferCount += channelData.length
      if (this.bufferCount === BUFFER_SIZE) {
        this.sendMessage()
      }
      return
    }
    this.buffer.set(channelData.slice(0, remainingSize), this.bufferCount)
    this.bufferCount += remainingSize
    this.sendMessage()
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
