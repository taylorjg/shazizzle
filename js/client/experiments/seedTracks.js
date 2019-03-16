import * as UW from './utils/utilsWebAudioApi.js'
import * as F from './logic/fingerprinting.js'

const TRACKS = new Map([
  [
    '/signals/almost-blue.mp3',
    {
      albumTitle: 'Jo & Jon',
      trackTitle: 'Almost Blue',
      artist: 'Joanna Webster, Jonathan Taylor',
      artwork: '/artwork/placeholder.png'
    }
  ],
  [
    '/signals/private/touch-her-soft-lips.m4a',
    {
      albumTitle: 'Walton: Henry V - A Musical Scenario after Shakespeare',
      trackTitle: 'Henry V: IV. Interlude: Touch Her Soft Lips and Part',
      artist: 'Anton Lesser, Michael Sheen, RTE Concert Orchestra & Andrew Penny',
      artwork: '/artwork/touch-her-soft-lips.jpg'
    }
  ],
  [
    '/signals/private/caro-mio-ben.m4a',
    {
      albumTitle: `Cecilia Bartoli - Arie Antiche: Se tu m'ami`,
      trackTitle: 'Caro mio ben',
      artist: 'Cecilia Bartoli, György Fischer',
      artwork: '/artwork/caro-mio-ben.jpg'
    }
  ],
  [
    '/signals/private/morgen.m4a',
    {
      albumTitle: 'Strauss: Vier letzte Lieder, Die Nacht, Allerseelen',
      trackTitle: 'Morgen, Op. 27, No. 4',
      artist: 'Dame Kiri Te Kanawa, Sir Georg Solti',
      artwork: '/artwork/morgen.jpg'
    }
  ]
])

const go = document.getElementById('go')
const pre = document.querySelector('pre')

const writeMessage = message =>
  pre.innerText += `${pre.innerText.length ? '\n' : ''}${message}`

const TRACK_SAMPLE_RATE = 44100
const TARGET_SAMPLE_RATE = 16000

const fingerprintTrack = async (url, metadata) => {

  writeMessage(`Fetching ${url}...`)
  const config = { responseType: 'arraybuffer' }
  const getResponse = await axios.get(url, config)
  const data = getResponse.data

  const options = {
    length: TRACK_SAMPLE_RATE,
    sampleRate: TRACK_SAMPLE_RATE
  }
  const audioContext = new OfflineAudioContext(options)

  writeMessage(`Decoding ${url}...`)
  const decodedAudioBuffer = await audioContext.decodeAudioData(data)

  writeMessage(`Resampling ${url}...`)
  const resampledAudioBuffer = await UW.resample(decodedAudioBuffer, TARGET_SAMPLE_RATE)

  writeMessage(`Getting hashes for ${url}...`)
  const hashes = await F.getHashes(resampledAudioBuffer)

  writeMessage(`Saving hashes for ${url}...`)
  const postResponse = await axios.post('/api/tracks', { ...metadata, hashes })
  writeMessage(`Saved (_id: ${postResponse.data._id})`)
}

const onGo = async () => {
  try {
    go.disabled = true
    for (const [url, metadata] of TRACKS.entries()) {
      await fingerprintTrack(url, metadata)
    }
    writeMessage('All done!')
  } finally {
    go.disabled = false
  }
}

go.addEventListener('click', onGo)
