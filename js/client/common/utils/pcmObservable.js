/* eslint-disable no-console */

class PcmInterceptorWorkletNode extends AudioWorkletNode {
  constructor(context, sampleRate, numSliversToBuffer, callback) {
    console.log(`[PcmInterceptorWorkletNode#constructor] sampleRate: ${sampleRate}; numSliversToBuffer: ${numSliversToBuffer}`)
    const options = {
      numberOfOutputs: 0,
      processorOptions: {
        sampleRate,
        numSliversToBuffer
      }
    }
    super(context, 'PcmInterceptor', options)
    this.port.onmessage = message => callback && callback(message.data)
  }
}

export const createPcmObservable = async (mediaRecorder, mediaStream, numSliversToBuffer) => {

  const observers = []

  const addObserver = observer => {
    observers.push(observer)
  }

  const removeObserver = observer => {
    const index = observers.findIndex(value => value === observer)
    index >= 0 && observers.splice(index, 1)
  }

  const audioContext = new AudioContext()
  const source = audioContext.createMediaStreamSource(mediaStream)
  await audioContext.audioWorklet.addModule('pcmInterceptor.js')
  const sampleRate = audioContext.sampleRate
  const callback = channelData => observers.forEach(observer =>
    observer.next({ channelData, sampleRate }))
  const workletNode = new PcmInterceptorWorkletNode(
    audioContext,
    sampleRate,
    numSliversToBuffer,
    callback)
  source.connect(workletNode)

  mediaRecorder.addEventListener('stop', () => {
    audioContext.close()
    observers.forEach(observer => observer.complete())
  })

  return new rxjs.Observable(observer => {
    addObserver(observer)
    return () => removeObserver(observer)
  })
}
