const tbody = document.querySelector('table tbody')

const main = async () => {
  const response = await axios.get('/api/tracks')
  const albums = response.data
  albums.forEach(album => {
    const tr = document.createElement('tr')

    const tdArtwork = document.createElement('td')
    tdArtwork.className = 'album-artwork-cell'
    const img = document.createElement('img')
    img.setAttribute('src', album.artwork)
    img.className = 'album-artwork'
    tdArtwork.appendChild(img)

    const tdAlbumDetails = document.createElement('td')
    tdAlbumDetails.setAttribute('class', 'album-details')

    const details = [
      { label: 'Album:', value: album.albumTitle },
      { label: 'Track:', value: album.trackTitle },
      { label: 'Artist:', value: album.artist }
    ]

    details.forEach(detail => {
      const row = document.createElement('div')
      row.className = 'album-details-row'
      const label = document.createElement('span')
      const value = document.createElement('span')
      label.innerHTML = detail.label
      label.className = 'album-details-row-label'
      value.innerHTML = detail.value
      row.appendChild(label)
      row.appendChild(value)
      tdAlbumDetails.appendChild(row)
    })

    tr.appendChild(tdArtwork)
    tr.appendChild(tdAlbumDetails)
    tbody.appendChild(tr)
  })
}

main()
