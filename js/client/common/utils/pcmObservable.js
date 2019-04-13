class PcmInterceptorWorkletNode extends AudioWorkletNode {
  constructor(context, processorOptions, callback) {
    // eslint-disable-next-line
    console.log(`[PcmInterceptorWorkletNode#constructor] processorOptions: ${JSON.stringify(processorOptions)}`)
    const options = {
      numberOfOutputs: 0,
      processorOptions
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
  const processorOptions = {
    sampleRate,
    numSliversToBuffer
  }
  const callback = channelData => observers.forEach(observer =>
    observer.next({ channelData, sampleRate }))
  const workletNode = new PcmInterceptorWorkletNode(audioContext, processorOptions, callback)
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
