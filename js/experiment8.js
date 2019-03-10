/* eslint-disable no-console */

import * as C from './constants.js'
import * as UC from './utilsChart.js'
import * as UW from './utilsWebAudioApi.js'
import * as F from './fingerprinting.js'

let currentSliver = 0
let maxSliver = 0
let audioBuffer = null

const fastBackwardButton = document.getElementById('fastBackward')
const stepBackwardButton = document.getElementById('stepBackward')
const stepForwardButton = document.getElementById('stepForward')
const fastForwardButton = document.getElementById('fastForward')
const currentSliverLabel = document.getElementById('currentSliverLabel')
const maxSliverLabel = document.getElementById('maxSliverLabel')
const slider = document.getElementById('slider')

const TRACKS = [
  {
    url: 'signals/private/touch-her-soft-lips.m4a',
    albumTitle: 'Walton: Henry V - A Musical Scenario after Shakespeare',
    trackTitle: 'Henry V: IV. Interlude: Touch Her Soft Lips and Part'
  },
  {
    url: 'signals/almost-blue.mp3',
    albumTitle: 'Jo & Jon',
    trackTitle: 'Almost Blue'
  }
]

const TRACK = TRACKS[1]

const main = async () => {
  const config = { responseType: 'arraybuffer' }
  const response = await axios.get(TRACK.url, config)
  const data = response.data
  const audioContext = new OfflineAudioContext({ length: 44100, sampleRate: 44100 })
  const decodedAudioBuffer = await audioContext.decodeAudioData(data)
  console.dir(decodedAudioBuffer)
  const resampledAudioBuffer = await UW.resample(decodedAudioBuffer, 16000)
  console.dir(resampledAudioBuffer)
  audioBuffer = await UW.steroToMono(resampledAudioBuffer)
  console.dir(audioBuffer)
  currentSliver = 0
  maxSliver = Math.floor(audioBuffer.duration / C.SLIVER_DURATION)
  slider.min = 0
  slider.max = maxSliver - 1
  setCurrentSliver(0)()
  const hashes = await F.getHashes(audioBuffer)
  const postResponse = await axios.post('/api/tracks', {
    albumTitle: TRACK.albumTitle,
    trackTitle: TRACK.trackTitle,
    hashes
  })
  console.log(`postResponse: ${JSON.stringify(postResponse.data)}`)
}

const updateSliverControlsState = () => {
  fastBackwardButton.disabled = currentSliver < 10
  stepBackwardButton.disabled = currentSliver < 1
  stepForwardButton.disabled = currentSliver >= (maxSliver - 1)
  fastForwardButton.disabled = currentSliver >= (maxSliver - 10)
}

const setCurrentSliver = adjustment => async () => {
  currentSliver += adjustment
  slider.value = currentSliver
  updateSliverControlsState()
  currentSliverLabel.innerText = `${currentSliver + 1}`
  maxSliverLabel.innerText = `${maxSliver}`
  const { timeDomainData, frequencyData } = await UW.getSliverData(audioBuffer, currentSliver)
  UC.drawTimeDomainChart('timeDomainChart', timeDomainData)
  UC.drawFFTChart('fftChart', frequencyData, audioBuffer.sampleRate)
}

const onSliverSliderChange = e => {
  currentSliver = e.target.valueAsNumber
  setCurrentSliver(0)()
}

fastBackwardButton.addEventListener('click', setCurrentSliver(-10))
stepBackwardButton.addEventListener('click', setCurrentSliver(-1))
stepForwardButton.addEventListener('click', setCurrentSliver(+1))
fastForwardButton.addEventListener('click', setCurrentSliver(+10))

slider.addEventListener('click', onSliverSliderChange)
// TODO: use RxJS's debounceTime ?
slider.addEventListener('input', onSliverSliderChange)

main()
