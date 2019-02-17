// https://en.wikipedia.org/wiki/Spectrogram

(function () {

  const toRgb = ([r, g, b]) => `rgb(${r * 255}, ${g * 255}, ${b * 255})`
  const colourMap = CM.getColourMap('CMRmap').map(toRgb)

  Chart.defaults.spectrogram = Chart.defaults.line

  Chart.controllers.spectrogram = Chart.controllers.line.extend({
    draw: function () {
      const me = this
      const chart = me.chart
      const ctx = chart.ctx
      const area = chart.chartArea
      console.dir(area)
      const dataset = me.getDataset()
      console.dir(dataset)
      const binCount = dataset.data[0].length
      const sliverCount = dataset.data.length
      const xs = R.range(0, sliverCount)
      const ys = R.range(0, binCount)
      const width = area.right - area.left
      const height = area.bottom - area.top
      const rectWidth = width / sliverCount
      const rectHeight = height / binCount
      xs.forEach(x => {
        const frequencyData = dataset.data[x]
        ys.forEach(y => {
          const binValue = frequencyData[y]
          const rectColour = colourMap[binValue]
          const rectX = area.left + x * rectWidth
          const rectY = area.bottom - (y * rectHeight) - rectHeight
          ctx.fillStyle = rectColour
          ctx.fillRect(rectX, rectY, rectWidth, rectHeight)
        })
      })
    }
  })
})()
