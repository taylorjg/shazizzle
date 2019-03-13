// https://en.wikipedia.org/wiki/Spectrogram

import { getColourMap } from '../matplotlib-colour-maps/colourMaps.js'

const toRgb = ([r, g, b]) => `rgb(${r * 255}, ${g * 255}, ${b * 255})`
const colourMap = getColourMap('CMRmap').map(toRgb)

Chart.defaults.spectrogram = Chart.defaults.line

Chart.controllers.spectrogram = Chart.controllers.line.extend({
  draw: function () {
    const me = this
    const chart = me.chart
    const ctx = chart.ctx
    const chartArea = chart.chartArea
    const dataset = me.getDataset()
    const binCount = dataset.data[0].length
    const sliverCount = dataset.data.length
    const sliverIndices = R.range(0, sliverCount) // x-axis
    const binIndices = R.range(0, binCount) // y-axis
    const chartWidth = chartArea.right - chartArea.left
    const chartHeight = chartArea.bottom - chartArea.top
    const rectWidth = chartWidth / sliverCount
    const rectHeight = chartHeight / binCount

    sliverIndices.forEach(sliverIndex => {
      const frequencyData = dataset.data[sliverIndex]
      binIndices.forEach(binIndex => {
        const binValue = frequencyData[binIndex]
        const rectColour = colourMap[binValue]
        const rectX = chartArea.left + sliverIndex * rectWidth
        const rectY = chartArea.bottom - (binIndex * rectHeight)
        ctx.fillStyle = rectColour
        ctx.fillRect(rectX, rectY, rectWidth, -rectHeight)
      })
    })
  }
})
