export const createCheckboxes = (parentId, name, values) => {
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

export const createRadioButtons = (parentId, name, values) => {
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

export const setCheckedRadioButton = (buttons, value) =>
  buttons.forEach(button =>
    button.checked = value === Number(button.value))

export const getCheckedRadioButton = buttons =>
  buttons
    .map(button => button.checked ? Number(button.value) : undefined)
    .filter(R.identity)[0]

export const setCheckedCheckboxes = (buttons, values) =>
  buttons.forEach(button =>
    button.checked = values.includes(Number(button.value)))

export const getCheckedCheckboxes = buttons =>
  buttons
    .map(button => button.checked ? Number(button.value) : undefined)
    .filter(R.identity)

export const buttonsOnChange = (buttons, fn) =>
  buttons.forEach(button => button.addEventListener('change', fn))
