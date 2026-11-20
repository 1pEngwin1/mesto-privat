const PROFILE_NAME_PATTERN = /^[A-Za-zА-Яа-яЁё -]+$/u;
const PROFILE_NAME_CHARACTER = /^[A-Za-zА-Яа-яЁё -]$/u;
const INVALID_PROFILE_NAME_CHARACTERS = /[^A-Za-zА-Яа-яЁё -]/gu;

function getInputs(form) {
  return [...form.querySelectorAll('.form__input')];
}

function getSnapshot(form) {
  return JSON.stringify(getInputs(form).map((input) => [input.name, input.value.trim()]));
}

function hasFormChanged(form) {
  if (form.dataset.requireChange !== 'true') return true;
  return form.dataset.initialValues !== getSnapshot(form);
}

function getInputError(input) {
  const value = input.value.trim();
  if (input.required && !value) return 'Заполните это поле.';
  if (!value) return '';

  const minLength = Number(input.minLength);
  if (minLength > 0 && value.length < minLength) {
    return `Введите не менее ${minLength} символов.`;
  }

  const maxLength = Number(input.maxLength);
  if (maxLength >= 0 && value.length > maxLength) {
    return `Введите не более ${maxLength} символов.`;
  }

  if (input.dataset.validation === 'profile-name' && !PROFILE_NAME_PATTERN.test(value)) {
    return 'Имя может содержать только латинские и русские буквы, пробел и дефис.';
  }

  if (input.type === 'url') {
    try {
      const url = new URL(value);
      if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) {
        return 'Введите корректную ссылку, начинающуюся с http:// или https://.';
      }
    } catch {
      return 'Введите корректную ссылку, начинающуюся с http:// или https://.';
    }
  }

  return '';
}

function updateInputState(input, showError) {
  const message = getInputError(input);
  input.setCustomValidity(message);
  input.setAttribute('aria-invalid', String(Boolean(message)));

  const errorElement = input.getAttribute('aria-describedby')
    ? document.getElementById(input.getAttribute('aria-describedby'))
    : null;
  if (errorElement) errorElement.textContent = showError ? message : '';

  return !message;
}

function updateFormState(form, showAllErrors = false) {
  const inputs = getInputs(form);
  const isValid = inputs.every((input) => updateInputState(
    input,
    showAllErrors || input.dataset.touched === 'true',
  ));
  const submitButton = form.querySelector('button[type="submit"]');
  const isDisabled = !isValid || !hasFormChanged(form);

  if (submitButton) {
    submitButton.disabled = isDisabled;
    submitButton.classList.toggle('form__submit_disabled', isDisabled);
  }

  return isValid && hasFormChanged(form);
}

function sanitizeProfileName(input) {
  const value = input.value;
  const caretPosition = input.selectionStart ?? value.length;
  const prefix = value.slice(0, caretPosition);
  const sanitized = value.replace(INVALID_PROFILE_NAME_CHARACTERS, '');

  if (sanitized === value) return;

  input.value = sanitized;
  const nextCaretPosition = prefix.replace(INVALID_PROFILE_NAME_CHARACTERS, '').length;
  input.setSelectionRange(nextCaretPosition, nextCaretPosition);
}

function blockInvalidNameInsertion(input, event) {
  if (input.dataset.validation !== 'profile-name') return;
  if (!event.inputType?.startsWith('insert') || !event.data) return;

  if ([...event.data].some((character) => !PROFILE_NAME_CHARACTER.test(character))) {
    event.preventDefault();
  }
}

function blockInvalidNamePaste(input, event) {
  if (input.dataset.validation !== 'profile-name') return;
  const pastedText = event.clipboardData?.getData('text');
  if (pastedText && [...pastedText].some((character) => !PROFILE_NAME_CHARACTER.test(character))) {
    event.preventDefault();
  }
}

export function refreshSubmitButton(form) {
  if (!form) return;
  updateFormState(form);
}

export function validateForm(form) {
  if (!form) return false;
  getInputs(form).forEach((input) => { input.dataset.touched = 'true'; });
  return updateFormState(form, true);
}

export function setFormValues(form, values, { requireChange = false } = {}) {
  if (!form) return;

  Object.entries(values).forEach(([name, value]) => {
    const input = getInputs(form).find((item) => item.name === name);
    if (input) input.value = value ?? '';
  });

  getInputs(form).forEach((input) => {
    input.dataset.touched = 'false';
    input.setCustomValidity('');
  });
  form.dataset.requireChange = String(requireChange);
  form.dataset.initialValues = getSnapshot(form);
  updateFormState(form);
}

export function resetFormState(form) {
  if (!form) return;
  form.reset();
  getInputs(form).forEach((input) => {
    input.dataset.touched = 'false';
    input.setCustomValidity('');
  });
  form.dataset.requireChange = String(form.id === 'profile-form');
  form.dataset.initialValues = getSnapshot(form);
  updateFormState(form);
}

export function enableValidation() {
  document.querySelectorAll('.form').forEach((form) => {
    form.dataset.requireChange = String(form.id === 'profile-form');
    form.dataset.initialValues = getSnapshot(form);

    getInputs(form).forEach((input) => {
      input.dataset.touched = 'false';
      input.addEventListener('beforeinput', (event) => blockInvalidNameInsertion(input, event));
      input.addEventListener('paste', (event) => blockInvalidNamePaste(input, event));
      input.addEventListener('input', () => {
        if (input.dataset.validation === 'profile-name') sanitizeProfileName(input);
        input.dataset.touched = 'true';
        updateFormState(form);
      });
      input.addEventListener('blur', () => {
        input.dataset.touched = 'true';
        updateFormState(form);
      });
    });

    form.addEventListener('submit', (event) => {
      if (!validateForm(form)) event.preventDefault();
    });

    updateFormState(form);
  });
}