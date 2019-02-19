const UH = {};

(function (exports) {

  const createCheckboxes = (parentId, name, values) => {
    const parent = document.getElementById(parentId)
    return values.map(value => {
      const label = document.createElement('label')
      label.setAttribute('class', 'checkbox-inline')
      const input = document.createElement('input')
      input.setAttribute('type', 'checkbox')
      input.setAttribute('id', `${name}${value}`)
      input.setAttribute('value', value)
      const text = document.createTextNode(value)
      label.appendChild(input)
      label.appendChild(text)
      parent.appendChild(label)
      return input
    })
  }

  const createRadioButtons = (parentId, name, values) => {
    const parent = document.getElementById(parentId)
    return values.map(value => {
      const label = document.createElement('label')
      label.setAttribute('class', 'radio-inline')
      const input = document.createElement('input')
      input.setAttribute('type', 'radio')
      input.setAttribute('name', name)
      input.setAttribute('id', `${name}${value}`)
      input.setAttribute('value', value)
      const text = document.createTextNode(value)
      label.appendChild(input)
      label.appendChild(text)
      parent.appendChild(label)
      return input
    })
  }

  const setCheckedRadioButton = (buttons, value) =>
    buttons.forEach(button =>
      button.checked = value === Number(button.value))

  const getCheckedRadioButton = buttons =>
    buttons
      .map(button => button.checked ? Number(button.value) : undefined)
      .filter(R.identity)[0]

  const setCheckedCheckboxes = (buttons, values) =>
    buttons.forEach(button =>
      button.checked = values.includes(Number(button.value)))

  const getCheckedCheckboxes = buttons =>
    buttons
      .map(button => button.checked ? Number(button.value) : undefined)
      .filter(R.identity)

  const buttonsOnChange = (buttons, fn) =>
    buttons.forEach(button => button.addEventListener('change', fn))

  exports.createCheckboxes = createCheckboxes
  exports.createRadioButtons = createRadioButtons
  exports.getCheckedCheckboxes = getCheckedCheckboxes
  exports.setCheckedCheckboxes = setCheckedCheckboxes
  exports.getCheckedRadioButton = getCheckedRadioButton
  exports.setCheckedRadioButton = setCheckedRadioButton
  exports.buttonsOnChange = buttonsOnChange
})(UH)
