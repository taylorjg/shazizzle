/* eslint-disable no-console */

import * as C from '../common/constants.js'
import * as U from '../common/utils/utils.js'
import * as UC from '../common/utils/utilsChart.js'
import * as UH from '../common/utils/utilsHtml.js'
import * as UW from '../common/utils/utilsWebAudioApi.js'
import * as F from '../common/logic/fingerprinting.js'

let currentDuration = 5
let currentSliver = 0
let maxSliver = 0
let resampledAudioBuffer = null

const durationValues = [1, 2, 5, 10, 15, 20]

const durationRadioButtons = UH.createRadioButtons(
  'durations',
  'duration',
  durationValues)

const onDurationChange = () => {
  currentDuration = Number(UH.getCheckedRadioButton(durationRadioButtons))
}

UH.setCheckedRadioButton(durationRadioButtons, currentDuration)
UH.buttonsOnChange(durationRadioButtons, onDurationChange)

const recordButton = document.getElementById('record')
const progressRow = document.getElementById('progressRow')
const progressBar = progressRow.querySelector('.progress-bar')
const buttonsRow = document.getElementById('buttonsRow')
const sliderRow = document.getElementById('sliderRow')
const fastBackwardButton = document.getElementById('fastBackward')
const stepBackwardButton = document.getElementById('stepBackward')
const stepForwardButton = document.getElementById('stepForward')
const fastForwardButton = document.getElementById('fastForward')
const currentSliverLabel = document.getElementById('currentSliverLabel')
const maxSliverLabel = document.getElementById('maxSliverLabel')
const slider = document.getElementById('slider')
const spectrogramRow = document.getElementById('spectrogramRow')
const constellationRow = document.getElementById('constellationRow')
const matchScatterplotRow = document.getElementById('matchScatterplotRow')
const matchHistogramRow = document.getElementById('matchHistogramRow')
const detailsRow = document.getElementById('detailsRow')
const detailsPre = detailsRow.querySelector('pre')
const resultsRow = document.getElementById('resultsRow')
const resultsPre = resultsRow.querySelector('pre')

const onRecord = async () => {

  const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const mediaRecorder = new MediaRecorder(mediaStream)

  const chunks = []
  mediaRecorder.ondataavailable = e => chunks.push(e.data)

  mediaRecorder.onstart = () => {
    const liveVisualisationObservable = UW.createLiveVisualisationObservable(mediaRecorder, mediaStream)
    liveVisualisationObservable.subscribe(makeLiveChartingObserver(mediaRecorder, currentDuration))
  }

  mediaRecorder.onstop = async () => {
    mediaStream.getTracks().forEach(track => track.stop())
    resampledAudioBuffer = await UW.decodeChunks(chunks, C.TARGET_SAMPLE_RATE)
    currentSliver = 0
    maxSliver = Math.floor(resampledAudioBuffer.duration / C.SLIVER_DURATION)
    slider.min = 0
    slider.max = maxSliver - 1
    setCurrentSliver(0)()
    drawSpectrogram(resampledAudioBuffer)
    drawConstellation(resampledAudioBuffer)
    showDetails(resampledAudioBuffer)
    U.defer(500, updateUiState, FINISHED_RECORDING)
    const hashes = await F.getHashes(resampledAudioBuffer)
    const config = {
      params: {
        includeMatchingHashes: 1
      }
    }
    const matchResponse = await axios.post('/api/match', hashes, config)
    if (matchResponse.data) {
      const match = matchResponse.data
      const matchingHashes = match.matchingHashes
      matchScatterplotRow.style.display = 'block'
      matchHistogramRow.style.display = 'block'
      drawMatchScatterplot(matchingHashes, match.offset)
      drawMatchHistogram(matchingHashes, match.offset)
      resultsPre.innerHTML = JSON.stringify(
        R.pipe(
          R.assoc('sampleHashesLength', hashes.length),
          R.assoc('matchingHashesLength', matchingHashes.length),
          R.dissoc('matchingHashes')
        )(match),
        null, 2)
    } else {
      resultsPre.innerHTML = 'No match'
    }
  }

  updateUiState(RECORDING)
  mediaRecorder.start()
}

const makeLiveChartingObserver = (mediaRecorder, duration) => ({
  next: value => {
    if (value.currentTime % 1 < 0.5) {
      const percent = R.clamp(0, 100, Math.round(value.currentTime / duration * 100))
      updateProgressBar(percent)
    }
    UC.drawByteTimeDomainChart('timeDomainChart', value.timeDomainData)
    UC.drawFFTChart('fftChart', value.frequencyData, value.sampleRate)
    if (value.currentTime >= (duration + 0.1)) {
      mediaRecorder.stop()
    }
  }
})

const drawSpectrogram = async audioBuffer => {
  const sliverCount = Math.floor(audioBuffer.duration / C.SLIVER_DURATION)
  const sliverIndices = R.range(0, sliverCount)
  const promises = sliverIndices.map(async sliverIndex => {
    const { frequencyData } = await UW.getSliverData(audioBuffer, sliverIndex)
    return frequencyData
  })
  const data = await Promise.all(promises)
  UC.drawSpectrogram('spectrogram', data, audioBuffer.duration, audioBuffer.sampleRate)
}

const drawConstellation = async audioBuffer => {
  const prominentFrequencies = await F.getProminentFrequencies(audioBuffer)
  const data = R.flatten(prominentFrequencies.map((binIndices, sliverIndex) => {
    const filtered = binIndices.filter(binIndex => binIndex >= 0)
    return filtered.map(binIndex => ({
      x: sliverIndex,
      y: binIndex
    }))
  }))
  const dataset = {
    data,
    xAxisIndices: R.range(0, prominentFrequencies.length),
    yAxisIndices: R.range(0, C.FFT_SIZE / 2)
  }
  UC.drawConstellation('constellation', dataset, audioBuffer.duration, audioBuffer.sampleRate)
}

const drawMatchScatterplot = (matchingHashes, bestOffset) => {
  const data = matchingHashes.map(record => ({
    x: record.t1Track,
    y: record.t1Sample
  }))
  const [dataWithHighlight, dataNormal] = R.partition(({ x, y }) => x - y === bestOffset, data)
  UC.drawMatchingHashLocationsScatterplot('matchingHashLocationsScatterplot', dataWithHighlight, dataNormal)
}

const drawMatchHistogram = (matchingHashes, bestOffset) => {
  const grouped = R.groupBy(record => record.offset, matchingHashes)
  const data = R.toPairs(grouped).map(([offset, hashesWithSameOffset]) => ({
    x: Number(offset),
    y: hashesWithSameOffset.length
  }))
  const [dataWithHighlight, dataNormal] = R.partition(({ x }) => x === bestOffset, data)
  UC.drawMatchingHashLocationsHistogram('matchingHashLocationsHistogram', dataWithHighlight, dataNormal)
}

const RECORDING = Symbol('RECORDING')
const FINISHED_RECORDING = Symbol('FINISHED_RECORDING')

const updateUiState = state => {
  recordButton.disabled = state === RECORDING
  progressRow.style.display = state === RECORDING ? 'block' : 'none'
  buttonsRow.style.display = state === FINISHED_RECORDING ? 'block' : 'none'
  sliderRow.style.display = state === FINISHED_RECORDING ? 'block' : 'none'
  spectrogramRow.style.display = state === FINISHED_RECORDING ? 'block' : 'none'
  constellationRow.style.display = state === FINISHED_RECORDING ? 'block' : 'none'
  if (state === RECORDING) {
    matchScatterplotRow.style.display = 'none'
    matchHistogramRow.style.display = 'none'
  }
  detailsRow.style.display = state === FINISHED_RECORDING ? 'block' : 'none'
  resultsRow.style.display = state === FINISHED_RECORDING ? 'block' : 'none'
  state === RECORDING && updateProgressBar(0)
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
  UC.drawByteTimeDomainChart('timeDomainChart', timeDomainData)
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

recordButton.addEventListener('click', onRecord)

const updateProgressBar = percent => {
  const currentPercent = Number(progressBar.getAttribute('aria-valuenow'))
  if (percent !== currentPercent) {
    progressBar.setAttribute('aria-valuenow', percent)
    progressBar.style.width = `${percent}%`
  }
}

const showDetails = resampledAudioBuffer => {

  const formatAudioBuffer = (label, audioBuffer) => `
${label}:
  duration:         ${audioBuffer.duration}
  length:           ${audioBuffer.length}
  numberOfChannels: ${audioBuffer.numberOfChannels}
  sampleRate:       ${audioBuffer.sampleRate}
`.trim()

  detailsPre.innerHTML = formatAudioBuffer('Resampled audio buffer', resampledAudioBuffer)
}
