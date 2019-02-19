const U = {};

(function (exports) {

  const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

  exports.delay = delay
})(U)
