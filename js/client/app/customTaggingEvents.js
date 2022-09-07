export const matchSuccess = match => {
  const {
    artist,
    trackTitle,
    albumTitle,
    offset,
    time
  } = match
  const parameters = {
    artist,
    track_title: trackTitle,
    album_title: albumTitle,
    offset,
    time
  }
  gtag('event', 'match_success', parameters)
}

export const matchFailure = () => {
  gtag('event', 'match_failure')
}
