import * as UW from './utils/utilsWebAudioApi.js'
import * as F from './logic/fingerprinting.js'

const goButton = document.getElementById('goButton')
const messageArea = document.getElementById('messageArea')

const writeMessage = message =>
  messageArea.innerText += `${messageArea.innerText.length ? '\n' : ''}${message}`

const SOURCE_SAMPLE_RATE = 44100
const TARGET_SAMPLE_RATE = 16000

const fingerprintTrack = async (url, metadata) => {

  writeMessage(`Seeding ${url}`)

  writeMessage(`  Fetching...`)
  const config = { responseType: 'arraybuffer' }
  const getResponse = await axios.get(url, config)
  const data = getResponse.data

  const options = {
    length: SOURCE_SAMPLE_RATE,
    sampleRate: SOURCE_SAMPLE_RATE
  }
  const audioContext = new OfflineAudioContext(options)

  writeMessage(`  Decoding...`)
  const decodedAudioBuffer = await audioContext.decodeAudioData(data)

  writeMessage(`  Resampling...`)
  const resampledAudioBuffer = await UW.resample(decodedAudioBuffer, TARGET_SAMPLE_RATE)

  writeMessage(`  Calculating hashes...`)
  const hashes = await F.getHashes(resampledAudioBuffer)

  writeMessage(`  Saving...`)
  await axios.post('/api/tracks', { ...metadata, hashes })
  writeMessage(`  Saved`)

  writeMessage('')
}

const onGo = async () => {
  try {
    goButton.disabled = true
    const response = await axios.get('/experiments/tracks.json')
    const tracks = response.data
    for (const [url, metadata] of tracks) {
      await fingerprintTrack(url, metadata)
    }
    writeMessage('All done!')
  } finally {
    goButton.disabled = false
  }
}

goButton.addEventListener('click', onGo)
