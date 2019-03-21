const tbody = document.querySelector('table tbody')
const template = document.getElementById('tableRow')

const setAttribute = (tr, selector, name, value) => {
  const element = tr.querySelector(selector)
  element.setAttribute(name, value)
}

const setTextContent = (tr, selector, value) => {
  const element = tr.querySelector(selector)
  element.textContent = value
}

const main = async () => {
  const response = await axios.get('/api/tracks')
  const albums = response.data
  albums.forEach(album => {
    const tr = document.importNode(template.content, true)
    setAttribute(tr, '.album-artwork', 'src', album.artwork)
    setTextContent(tr, '.album-title-line + span', album.albumTitle)
    setTextContent(tr, '.track-title-line + span', album.trackTitle)
    setTextContent(tr, '.artist-line + span', album.artist)
    tbody.appendChild(tr)
  })
}

main()
