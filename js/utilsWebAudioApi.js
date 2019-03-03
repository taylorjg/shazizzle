import * as C from './constants.js'

export const decodeChunks = async (chunks, sampleRate) => {
  const blob = new Blob(chunks)
  const url = URL.createObjectURL(blob)
  try {
    const config = { responseType: 'arraybuffer' }
    const response = await axios.get(url, config)
    const data = response.data
    const options = {
      length: sampleRate,
      sampleRate
    }
    const audioContext = new OfflineAudioContext(options)
    const audioBuffer = await audioContext.decodeAudioData(data)
    return audioBuffer
  } finally {
    URL.revokeObjectURL(url)
  }
}

const copySliver = (srcBuffer, dstBuffer, sliverIndex) => {
  const startOffset = Math.floor(srcBuffer.sampleRate * sliverIndex * C.SLIVER_DURATION)
  const channelIndices = R.range(0, srcBuffer.numberOfChannels)
  channelIndices.forEach(channelIndex => {
    const dstChannelData = dstBuffer.getChannelData(channelIndex)
    srcBuffer.copyFromChannel(dstChannelData, channelIndex, startOffset)
  })
}

export const getSliverData = async (inputBuffer, sliverIndex) => {
  const options = {
    numberOfChannels: inputBuffer.numberOfChannels,
    length: Math.ceil(inputBuffer.numberOfChannels * inputBuffer.sampleRate * C.SLIVER_DURATION),
    sampleRate: inputBuffer.sampleRate
  }
  const sliverBuffer = new AudioBuffer(options)
  copySliver(inputBuffer, sliverBuffer, sliverIndex)
  // TODO: figure out correct thing to do re stero => mono conversion
  // This is mainly relevant to MP3 files
  // (oscillator nodes = 1 channel, recording = 1 channel)
  // I think we want sliverBuffer to have duration = C.SLIVER_DURATION, numberOfChannels = 1
  // console.dir(sliverBuffer)
  const audioContext = new OfflineAudioContext(options)
  const sourceNode = new AudioBufferSourceNode(audioContext, { buffer: sliverBuffer })
  const analyserNode = new AnalyserNode(audioContext, { fftSize: C.FFT_SIZE })
  sourceNode.connect(audioContext.destination)
  sourceNode.connect(analyserNode)
  sourceNode.start()
  await audioContext.startRendering()
  const timeDomainData = new Uint8Array(analyserNode.frequencyBinCount)
  const frequencyData = new Uint8Array(analyserNode.frequencyBinCount)
  analyserNode.getByteTimeDomainData(timeDomainData)
  analyserNode.getByteFrequencyData(frequencyData)
  return {
    timeDomainData,
    frequencyData
  }
}

export const createLiveVisualisationObservable = (mediaRecorder, mediaStream) => {

  const track = R.head(mediaStream.getTracks())
  const sampleRate = track.getSettings().sampleRate

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

  const analyser = new AnalyserNode(audioContext, { fftSize: C.FFT_SIZE })
  source.connect(analyser)

  let keepVisualising = true

  const rafCallback = () => {

    const currentTime = audioContext.currentTime
    const timeDomainData = new Uint8Array(analyser.frequencyBinCount)
    const frequencyData = new Uint8Array(analyser.frequencyBinCount)

    analyser.getByteTimeDomainData(timeDomainData)
    analyser.getByteFrequencyData(frequencyData)

    observers.forEach(observer => observer.next({
      timeDomainData,
      frequencyData,
      sampleRate,
      currentTime
    }))

    if (keepVisualising) {
      requestAnimationFrame(rafCallback)
    }
  }

  mediaRecorder.addEventListener('stop', () => {
    keepVisualising = false
    observers.forEach(observer => observer.complete())
  })

  requestAnimationFrame(rafCallback)

  return new rxjs.Observable(observer => {
    addObserver(observer)
    return () => removeObserver(observer)
  })
}

export const resample = async (srcBuffer, targetSampleRate) => {
  const options = {
    numberOfChannels: srcBuffer.numberOfChannels,
    length: srcBuffer.duration * srcBuffer.numberOfChannels * targetSampleRate,
    sampleRate: targetSampleRate
  }
  const audioContext = new OfflineAudioContext(options)
  const source = audioContext.createBufferSource()
  source.buffer = srcBuffer
  source.connect(audioContext.destination)
  source.start()
  const dstBuffer = await audioContext.startRendering()
  return dstBuffer
}
