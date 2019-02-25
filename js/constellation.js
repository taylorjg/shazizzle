Chart.defaults.constellation = Chart.defaults.line

Chart.controllers.constellation = Chart.controllers.line.extend({
  draw: function () {
    const me = this
    const chart = me.chart
    const ctx = chart.ctx
    const chartArea = chart.chartArea
    const dataset = me.getDataset()
    const data = dataset.data
    const xAxisIndices = dataset.xAxisIndices
    const yAxisIndices = dataset.yAxisIndices
    const chartWidth = chartArea.right - chartArea.left
    const chartHeight = chartArea.bottom - chartArea.top
    const dx = chartWidth / xAxisIndices.length
    const dy = chartHeight / yAxisIndices.length
    const size = 3

    data.forEach(pt => {
      const x = chartArea.left + pt.x * dx + dx / 2
      const y = chartArea.bottom - pt.y * dy
      ctx.beginPath()
      ctx.strokeStyle = 'orange'
      ctx.moveTo(x - size, y + size)
      ctx.lineTo(x + size, y - size)
      ctx.moveTo(x - size, y - size)
      ctx.lineTo(x + size, y + size)
      ctx.stroke()
    })
  }
})
