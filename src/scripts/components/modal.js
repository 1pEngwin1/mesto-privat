let activeModal = null;

export function openModal(modal) {
  if (!modal) return;
  if (activeModal && activeModal !== modal) closeModal(activeModal);

  activeModal = modal;
  modal.classList.add('popup_is-open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('page_has-popup');

  const focusTarget = modal.querySelector('input, button:not([data-close])');
  window.setTimeout(() => focusTarget?.focus(), 0);
}

export function closeModal(modal = activeModal) {
  if (!modal) return;

  modal.classList.remove('popup_is-open');
  modal.setAttribute('aria-hidden', 'true');
  if (activeModal === modal) activeModal = null;
  if (!activeModal) document.body.classList.remove('page_has-popup');
}

export function initModalListeners() {
  document.querySelectorAll('[data-close]').forEach((button) => {
    button.addEventListener('click', () => closeModal(button.closest('.popup')));
  });

  document.querySelectorAll('.popup').forEach((modal) => {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeModal(modal);
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && activeModal) closeModal(activeModal);
  });
}