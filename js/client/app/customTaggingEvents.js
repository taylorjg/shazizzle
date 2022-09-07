export const matchSuccess = (match) => {
  const {
    artist,
    trackTitle,
    albumTitle,
    offset,
    time,
    matchingHashes
  } = match
  const parameters = {
    artist,
    track_title: trackTitle,
    album_title: albumTitle,
    offset,
    time,
    matching_hashes_length: matchingHashes.length
  }
  gtag('event', 'match_success', parameters)
}

export const matchFailure = () => {
  gtag('event', 'match_failure')
}
