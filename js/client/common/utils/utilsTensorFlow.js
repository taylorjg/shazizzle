export const getFrequencyData = async channelData => {
  const real = tf.tensor1d(channelData)
  const imag = tf.zerosLike(real)
  const x = tf.complex(real, imag)
  const X = x.fft()
  const reX = await tf.real(X).data()
  return reX.slice(0, reX.length / 2)
}
