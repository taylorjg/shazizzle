export const createCheckboxes = (parentId, name, values) => {
  const parent = document.getElementById(parentId)
  return values.map(value => {
    const valueIsObject = value.label !== undefined && value.value !== undefined
    const label = document.createElement('label')
    label.setAttribute('class', 'checkbox-inline')
    const input = document.createElement('input')
    input.setAttribute('type', 'checkbox')
    input.setAttribute('id', `${name}${value}`)
    input.setAttribute('value', valueIsObject ? value.value : value)
    const text = document.createTextNode(valueIsObject ? value.label : value)
    label.appendChild(input)
    label.appendChild(text)
    parent.appendChild(label)
    return input
  })
}

export const createRadioButtons = (parentId, name, values) => {
  const parent = document.getElementById(parentId)
  return values.map(value => {
    const valueIsObject = value.label !== undefined && value.value !== undefined
    const label = document.createElement('label')
    label.setAttribute('class', 'radio-inline')
    const input = document.createElement('input')
    input.setAttribute('type', 'radio')
    input.setAttribute('name', name)
    input.setAttribute('id', `${name}${value}`)
    input.setAttribute('value', valueIsObject ? value.value : value)
    const text = document.createTextNode(valueIsObject ? value.label : value)
    label.appendChild(input)
    label.appendChild(text)
    parent.appendChild(label)
    return input
  })
}

export const setCheckedRadioButton = (buttons, value) => {
  const valueAsString = String(value)
  buttons.forEach(button =>
    button.checked = button.value === valueAsString)
}

export const getCheckedRadioButton = buttons =>
  buttons
    .map(button => button.checked ? button.value : undefined)
    .filter(value => value !== undefined)[0]

export const setCheckedCheckboxes = (buttons, values) => {
  const valuesAsStrings = values.map(String)
  buttons.forEach(button =>
    button.checked = valuesAsStrings.includes(button.value))
}

export const getCheckedCheckboxes = buttons =>
  buttons
    .map(button => button.checked ? button.value : undefined)
    .filter(value => value !== undefined)

export const buttonsOnChange = (buttons, handler) =>
  buttons.forEach(button => button.addEventListener('change', handler))

export const checkboxesOnChange = buttonsOnChange
export const radioButtonsOnChange = buttonsOnChange

export const createSelect = (parentId, items) => {
  const parent = document.getElementById(parentId)
  const select = document.createElement('select')
  items.forEach(item => {
    const option = document.createElement('option')
    option.setAttribute('value', item.value)
    option.innerText = item.label || item.value
    select.appendChild(option)
  })
  parent.appendChild(select)
  return select
}

export const getSelectedValue = select => select.value
export const setSelectedValue = (select, value) => select.value = value

export const selectOnChange = (select, handler) =>
  select.addEventListener('change', handler)

export const showErrorPanel = errorMessage => {
  hideErrorPanel()
  const parentElement = document.querySelector('body')
  const template = document.getElementById('error-panel-template')
  const clone = document.importNode(template.content, true)
  const errorPanelText = clone.querySelector('.error-panel-text')
  const closeBtn = clone.querySelector('.close')
  errorPanelText.textContent = errorMessage
  closeBtn.addEventListener('click', hideErrorPanel)
  parentElement.appendChild(clone)
}

export const hideErrorPanel = () => {
  const errorPanel = document.getElementById('error-panel')
  if (errorPanel) {
    errorPanel.parentNode.removeChild(errorPanel)
  }
}
