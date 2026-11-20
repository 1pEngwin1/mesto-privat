const heartIcon = `
  <svg viewBox="0 0 22 20" aria-hidden="true" focusable="false">
    <path d="M20.3 1.7a5.8 5.8 0 0 0-8.2 0L11 2.8l-1.1-1.1a5.8 5.8 0 0 0-8.2 8.1L11 19l9.3-9.2a5.8 5.8 0 0 0 0-8.1Z" />
  </svg>`;

export function createCardElement(cardData, { userId, onLike, onDelete, onImageClick, onInfoClick }) {
  const template = document.querySelector('#card-template');
  const cardElement = template.content.firstElementChild.cloneNode(true);
  const image = cardElement.querySelector('.card__image');
  const title = cardElement.querySelector('.card__title');
  const likeButton = cardElement.querySelector('.card__like-button');
  const deleteButton = cardElement.querySelector('.card__delete-button');
  const infoButton = cardElement.querySelector('.card__info-button');
  const likes = Array.isArray(cardData.likes) ? cardData.likes : [];
  const isLiked = likes.some((like) => like._id === userId);
  const isOwner = Boolean(userId && cardData.owner?._id === userId);

  cardElement.dataset.cardId = cardData._id;
  image.src = cardData.link;
  image.alt = cardData.name ? `Фотография: ${cardData.name}` : 'Фотография места';
  image.addEventListener('error', () => {
    image.classList.add('card__image_is-broken');
    image.alt = 'Изображение не загрузилось';
  }, { once: true });

  title.textContent = cardData.name || 'Без названия';
  likeButton.innerHTML = heartIcon + `<span class="card__like-count">${likes.length}</span>`;
  likeButton.setAttribute('aria-pressed', String(isLiked));
  likeButton.setAttribute('aria-label', isLiked ? 'Убрать лайк' : 'Поставить лайк');
  likeButton.classList.toggle('card__like-button_is-active', isLiked);

  if (!isOwner) {
    deleteButton.remove();
  } else {
    deleteButton.addEventListener('click', () => onDelete(cardData));
  }

  likeButton.addEventListener('click', () => onLike(cardData, cardElement));
  image.addEventListener('click', () => onImageClick(cardData));
  infoButton.addEventListener('click', () => onInfoClick(cardData));

  return cardElement;
}

export function updateCardLikeState(cardElement, cardData, userId) {
  if (!cardElement) return;

  const likes = Array.isArray(cardData.likes) ? cardData.likes : [];
  const isLiked = likes.some((like) => like._id === userId);
  const button = cardElement.querySelector('.card__like-button');
  const count = cardElement.querySelector('.card__like-count');

  count.textContent = String(likes.length);
  button.setAttribute('aria-pressed', String(isLiked));
  button.setAttribute('aria-label', isLiked ? 'Убрать лайк' : 'Поставить лайк');
  button.classList.toggle('card__like-button_is-active', isLiked);
}
