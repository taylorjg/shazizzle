const errorPanel = document.getElementById('errorPanel')
const errorPanelClose = errorPanel.querySelector('.close')

const showErrorMessage = errorMessage => {
  const errorMessageElement = errorPanel.querySelector('.close + span')
  errorMessageElement.textContent = errorMessage
  errorPanel.style.display = 'block'
}

export const showErrorPanel = error => {
  if (error.response && error.response.data) {
    showErrorMessage(`${error.message} (${error.response.data})`)
  }
  else {
    showErrorMessage(error.message)
  }
}

export const hideErrorPanel = () => errorPanel.style.display = 'none'

errorPanelClose.addEventListener('click', hideErrorPanel)
