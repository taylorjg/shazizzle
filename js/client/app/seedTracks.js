import * as C from '../common/constants.js'
import * as F from '../common/logic/fingerprinting.js'

const goButton = document.getElementById('goButton')
const messageArea = document.getElementById('messageArea')

const writeMessage = message =>
  messageArea.innerText += `${messageArea.innerText.length ? '\n' : ''}${message}`

const fingerprintTrack = async (url, metadata) => {

  writeMessage(`Seeding ${url}`)

  writeMessage(`  Fetching...`)
  const config = { responseType: 'arraybuffer' }
  const getResponse = await axios.get(url, config)
  const data = getResponse.data

  const options = {
    length: 1,
    sampleRate: C.TARGET_SAMPLE_RATE
  }
  const audioContext = new OfflineAudioContext(options)

  writeMessage(`  Decoding...`)
  const decodedAudioBuffer = await audioContext.decodeAudioData(data)

  writeMessage(`  Calculating hashes...`)
  const hashes = await F.getHashes(decodedAudioBuffer)

  writeMessage(`  Saving...`)
  await axios.post('/api/tracks', { ...metadata, hashes })
  writeMessage(`  Saved`)

  writeMessage('')
}

const onGo = async () => {
  try {
    goButton.disabled = true
    const response = await axios.get('tracks.json')
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
