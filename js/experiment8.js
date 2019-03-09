import * as C from './constants.js'
import * as UC from './utilsChart.js'
import * as UW from './utilsWebAudioApi.js'
import * as F from './fingerprinting.js'

let currentSliver = 0
let maxSliver = 0
let resampledAudioBuffer = null

const fastBackwardButton = document.getElementById('fastBackward')
const stepBackwardButton = document.getElementById('stepBackward')
const stepForwardButton = document.getElementById('stepForward')
const fastForwardButton = document.getElementById('fastForward')
const currentSliverLabel = document.getElementById('currentSliverLabel')
const maxSliverLabel = document.getElementById('maxSliverLabel')
const slider = document.getElementById('slider')
const prominentFrequenciesPre = document.getElementById('prominentFrequencies')

const main = async () => {
  const config = { responseType: 'arraybuffer' }
  const response = await axios.get('signals/private/touch-her-soft-lips.m4a', config)
  const data = response.data
  const audioContext = new OfflineAudioContext({ length: 44100, sampleRate: 44100 })
  const audioBuffer = await audioContext.decodeAudioData(data)
  resampledAudioBuffer = audioBuffer
  console.dir(resampledAudioBuffer)
  currentSliver = 0
  maxSliver = Math.floor(resampledAudioBuffer.duration / C.SLIVER_DURATION)
  slider.min = 0
  slider.max = maxSliver - 1
  setCurrentSliver(0)()
  const prominentFrequencies = await F.getProminentFrequencies(resampledAudioBuffer)
  const lines = prominentFrequencies.map((pfs, index) => `[${index}]: ${JSON.stringify(pfs)}`)
  prominentFrequenciesPre.innerHTML = lines.join('\n')
  const postResponse = await axios.post('/api/tracks', {
    albumTitle: 'Walton: Henry V - A Musical Scenario after Shakespeare',
    trackTitle: 'Henry V: IV. Interlude: Touch Her Soft Lips and Part',
    fingerprint: prominentFrequencies
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
  const { timeDomainData, frequencyData } = await UW.getSliverData(resampledAudioBuffer, currentSliver)
  UC.drawTimeDomainChart('timeDomainChart', timeDomainData)
  UC.drawFFTChart('fftChart', frequencyData, resampledAudioBuffer.sampleRate)
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
