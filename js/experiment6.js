import * as UC from './utilsChart.js'

const SAMPLE_RATE = 44100

const main = async () => {
  const config = { responseType: 'arraybuffer' }
  const response = await axios.get('signals/440.pcm', config)
  const data = response.data
  const view = new Int8Array(data)
  const start = 1024 * 40
  const end = start + 1024
  const samples = view.slice(start, end)
  const array = Array.from(samples)

  const options = {
    numberOfChannels: 1,
    length: 1024,
    sampleRate: SAMPLE_RATE
  }

  // Create and populate AudioBuffer
  const audioBuffer = new AudioBuffer(options)
  const channelData = audioBuffer.getChannelData(0)
  // Scale from [-127, 128] to [-1, 1]
  array.forEach((by, i) => channelData[i] = by / 128)

  // Create OfflineAudioContext
  const audioContext = new OfflineAudioContext(options)

  // Analyse the AudioBuffer
  const sourceNode = new AudioBufferSourceNode(audioContext, { buffer: audioBuffer })
  const analyserNode = new AnalyserNode(audioContext, { fftSize: 1024 })
  sourceNode.connect(audioContext.destination)
  sourceNode.connect(analyserNode)
  sourceNode.start()
  await audioContext.startRendering()
  const timeDomainData = new Uint8Array(analyserNode.frequencyBinCount)
  const frequencyData = new Uint8Array(analyserNode.frequencyBinCount)
  analyserNode.getByteTimeDomainData(timeDomainData)
  analyserNode.getByteFrequencyData(frequencyData)

  UC.drawTimeDomainChart('timeDomainChart', timeDomainData)
  UC.drawFFTChart('fftChart', frequencyData, SAMPLE_RATE)
}

main()
