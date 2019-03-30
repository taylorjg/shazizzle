import { showErrorPanel, hideErrorPanel } from './errorPanel.js'

import * as C from '../common/constants.js'
import * as F from '../common/logic/fingerprinting.js'

const goButton = document.getElementById('goButton')
const verboseCheckbox = document.getElementById('verbose')
const messageArea = document.getElementById('messageArea')

const clearMessages = () => messageArea.innerText = ''

const writeMessage = (message, verbose) => {
  if (verbose && !verboseCheckbox.checked) return
  messageArea.innerText += `${messageArea.innerText.length ? '\n' : ''}${message}`
}

const fingerprintTrack = async (url, metadata) => {

  writeMessage(`Seeding ${url}`)

  writeMessage(`  Fetching...`, true)
  const config = { responseType: 'arraybuffer' }
  const getResponse = await axios.get(url, config)
  const data = getResponse.data

  const options = {
    length: 1,
    sampleRate: C.TARGET_SAMPLE_RATE
  }
  const audioContext = new OfflineAudioContext(options)

  writeMessage(`  Decoding...`, true)
  const decodedAudioBuffer = await audioContext.decodeAudioData(data)

  writeMessage(`  Calculating hashes...`, true)
  const hashes = await F.getHashes(decodedAudioBuffer)

  writeMessage(`  Saving...`, true)
  await axios.post('/api/tracks', { ...metadata, hashes })
  writeMessage(`  Saved`, true)

  writeMessage('', true)
}

const onGo = async () => {
  try {
    goButton.disabled = true
    hideErrorPanel()
    clearMessages()
    const response = await axios.get('tracks.json')
    const tracks = response.data
    for (const [url, metadata] of tracks) {
      await fingerprintTrack(url, metadata)
    }
    writeMessage('All done!')
  } catch (error) {
    showErrorPanel(error)
  } finally {
    goButton.disabled = false
  }
}

goButton.addEventListener('click', onGo)
