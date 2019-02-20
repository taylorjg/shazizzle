const isArray = Array.isArray || function (obj) {
  return Object.prototype.toString.call(obj) === '[object Array]'
}

it_multiple = (testCases, description, fn) => {

  const numTests = testCases.length
  const formattedTestCount = ` (${numTests} ${numTests === 1 ? 'test' : 'tests'})`

  const invokeNormalItForTestCase = testCase => {
    const formattedTestCase = ` (${JSON.stringify(testCase).slice(0, 50)})`
    it(description + formattedTestCase, () =>
      isArray(testCase)
        ? fn.apply(this, testCase)
        : fn.call(this, testCase)
    )
  }

  describe(description + formattedTestCount, () =>
    testCases.forEach(invokeNormalItForTestCase)
  )
}
