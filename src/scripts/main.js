import '../styles.css';
import avatarImage from '../images/avatar-cousteau.jpg';
import churchImage from '../images/caucasus-church.jpg';
import churchCropImage from '../images/caucasus-crop.jpg';
import { api, isApiConfigured } from './api.js';
import { createCardElement, updateCardLikeState } from './card.js';

const byId = (id) => document.getElementById(id);

const refs = {
  cardsList: byId('cards-list'),
  emptyState: byId('empty-state'),
  demoBanner: byId('demo-banner'),
  avatar: byId('profile-avatar'),
  profileName: byId('profile-name'),
  profileAbout: byId('profile-about'),
  statsPopup: byId('stats-popup'),
  statsList: byId('stats-list'),
  popularCards: byId('popular-cards-list'),
  cardInfoPopup: byId('card-info-popup'),
  cardInfoList: byId('card-info-list'),
  cardLikers: byId('card-likers-list'),
  imagePopup: byId('image-popup'),
  popupImage: byId('popup-image'),
  popupImageCaption: byId('popup-image-caption'),
  deletePopup: byId('delete-popup'),
  deleteConfirmButton: byId('delete-confirm-button'),
  toast: byId('toast'),
};

const demoUser = {
  _id: 'demo-owner',
  name: 'Жак-Ив Кусто',
  about: 'Исследователь океана',
  avatar: avatarImage,
};

const demoLikers = [
  { _id: 'demo-liker-1', name: 'Юрий' },
  { _id: 'demo-liker-2', name: 'Дмитрий' },
  { _id: 'demo-liker-3', name: 'Екатерина' },
];

const demoCards = [
  {
    _id: 'demo-card-1', name: 'Карачаевск', link: churchImage,
    owner: demoUser, likes: [demoLikers[0], demoLikers[1]], createdAt: '2025-05-25T10:00:00.000Z',
  },
  {
    _id: 'demo-card-2', name: 'Гора Эльбрус', link: churchCropImage,
    owner: { _id: 'demo-owner-2', name: 'Юрий' }, likes: [demoLikers[0]], createdAt: '2025-05-24T10:00:00.000Z',
  },
  {
    _id: 'demo-card-3', name: 'Домбай', link: churchImage,
    owner: demoUser, likes: [demoLikers[0], demoLikers[1], demoLikers[2]], createdAt: '2025-05-23T10:00:00.000Z',
  },
  {
    _id: 'demo-card-4', name: 'Кисловодск', link: churchCropImage,
    owner: { _id: 'demo-owner-3', name: 'Дмитрий' }, likes: [demoLikers[1]], createdAt: '2025-05-22T10:00:00.000Z',
  },
  {
    _id: 'demo-card-5', name: 'Чегемские водопады', link: churchImage,
    owner: demoUser, likes: [demoLikers[0], demoLikers[2]], createdAt: '2025-05-21T10:00:00.000Z',
  },
  {
    _id: 'demo-card-6', name: 'Софийские озёра', link: churchCropImage,
    owner: { _id: 'demo-owner-2', name: 'Юрий' }, likes: [], createdAt: '2025-05-20T10:00:00.000Z',
  },
];

let currentUser = null;
let cards = [];
let pendingDeleteCard = null;
let activePopup = null;
let toastTimer = null;

function showToast(message) {
  refs.toast.textContent = message;
  refs.toast.classList.add('toast_is-visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => refs.toast.classList.remove('toast_is-visible'), 4200);
}

function openPopup(popup) {
  if (activePopup && activePopup !== popup) closePopup(activePopup);
  activePopup = popup;
  popup.classList.add('popup_is-open');
  popup.setAttribute('aria-hidden', 'false');
  document.body.classList.add('page_has-popup');
  const focusTarget = popup.querySelector('input, button:not([data-close])');
  window.setTimeout(() => focusTarget?.focus(), 0);
}

function closePopup(popup = activePopup) {
  if (!popup) return;
  popup.classList.remove('popup_is-open');
  popup.setAttribute('aria-hidden', 'true');
  if (activePopup === popup) activePopup = null;
  if (!activePopup) document.body.classList.remove('page_has-popup');
}

function updateProfileView(user) {
  currentUser = { ...currentUser, ...user };
  refs.profileName.textContent = currentUser.name || 'Имя пользователя';
  refs.profileAbout.textContent = currentUser.about || '';
  refs.avatar.src = currentUser.avatar || avatarImage;
  refs.avatar.alt = `Аватар: ${currentUser.name || 'пользователь'}`;
}

function renderCards() {
  refs.cardsList.replaceChildren();
  cards.forEach((card) => {
    const element = createCardElement(card, {
      userId: currentUser?._id,
      onLike: handleLike,
      onDelete: openDeleteConfirmation,
      onImageClick: openImagePreview,
      onInfoClick: openCardInfo,
    });
    refs.cardsList.append(element);
  });
  refs.emptyState.hidden = cards.length > 0;
}

function appendStatRow(label, value) {
  const template = byId('stat-row-template');
  const row = template.content.firstElementChild.cloneNode(true);
  row.querySelector('.stat-row__label').textContent = label;
  row.querySelector('.stat-row__value').textContent = String(value);
  return row;
}

function appendChip(list, text) {
  const template = byId('stat-chip-template');
  const chip = template.content.firstElementChild.cloneNode(true);
  chip.textContent = text;
  list.append(chip);
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Не указана';
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getCardStatistics(list) {
  const owners = new Map();
  const likers = new Map();
  let totalLikes = 0;

  list.forEach((card) => {
    const owner = card.owner;
    if (owner) {
      const ownerKey = owner._id || owner.name;
      if (ownerKey) owners.set(ownerKey, owner);
    }

    const cardLikers = Array.isArray(card.likes) ? card.likes : [];
    totalLikes += cardLikers.length;

    cardLikers.forEach((person) => {
      const personKey = person._id || person.name;
      if (!personKey) return;
      if (!likers.has(personKey)) {
        likers.set(personKey, { person, likedCards: new Set() });
      }
      likers.get(personKey).likedCards.add(card._id || card.name);
    });
  });

  const ranking = [...likers.values()].sort((a, b) => b.likedCards.size - a.likedCards.size);
  const champion = ranking[0] || null;
  const mostLikes = champion ? champion.likedCards.size : 0;
  const popular = [...list]
    .sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0))
    .slice(0, 3);

  return {
    totalUsers: owners.size,
    totalLikes,
    mostLikes,
    champion: champion?.person?.name || 'Пока нет',
    popular,
  };
}

function renderStatistics(list) {
  const stats = getCardStatistics(list);
  refs.statsList.replaceChildren(
    appendStatRow('Всего пользователей:', stats.totalUsers),
    appendStatRow('Всего лайков:', stats.totalLikes),
    appendStatRow('Максимально лайков от одного:', stats.mostLikes),
    appendStatRow('Чемпион лайков:', stats.champion),
  );

  refs.popularCards.replaceChildren();
  if (stats.popular.length === 0) {
    appendChip(refs.popularCards, 'Карточек пока нет');
    return;
  }
  stats.popular.forEach((card) => appendChip(refs.popularCards, card.name || 'Без названия'));
}

async function handleStatsClick() {
  try {
    if (isApiConfigured) {
      cards = await api.getCards();
      renderCards();
    }
    renderStatistics(cards);
    openPopup(refs.statsPopup);
  } catch (error) {
    showToast(`Не удалось загрузить статистику: ${error.message}`);
  }
}

function openCardInfo(card) {
  const likes = Array.isArray(card.likes) ? card.likes : [];
  const rows = [
    ['Описание:', card.name || 'Без названия'],
    ['Дата создания:', formatDate(card.createdAt)],
    ['Владелец:', card.owner?.name || 'Неизвестен'],
    ['Количество лайков:', likes.length],
  ];
  refs.cardInfoList.replaceChildren(...rows.map(([label, value]) => appendStatRow(label, value)));
  refs.cardLikers.replaceChildren();
  if (likes.length === 0) appendChip(refs.cardLikers, 'Пока никто');
  likes.forEach((person) => appendChip(refs.cardLikers, person.name || 'Пользователь'));
  openPopup(refs.cardInfoPopup);
}

function openImagePreview(card) {
  refs.popupImage.src = card.link;
  refs.popupImage.alt = card.name || 'Фотография места';
  refs.popupImageCaption.textContent = card.name || '';
  openPopup(refs.imagePopup);
}

async function handleLike(card, cardElement) {
  const button = cardElement.querySelector('.card__like-button');
  const wasLiked = card.likes?.some((person) => person._id === currentUser?._id) || false;
  button.disabled = true;
  try {
    const updatedCard = await api.changeLikeCardStatus(card._id, wasLiked);
    cards = cards.map((item) => item._id === updatedCard._id ? updatedCard : item);
    updateCardLikeState(cardElement, updatedCard, currentUser?._id);
  } catch (error) {
    showToast(`Не удалось обновить лайк: ${error.message}`);
  } finally {
    button.disabled = false;
  }
}

function openDeleteConfirmation(card) {
  pendingDeleteCard = card;
  openPopup(refs.deletePopup);
}

async function runWithButtonState(button, loadingText, action) {
  const originalText = button.textContent;
  button.textContent = loadingText;
  button.disabled = true;
  try {
    await action();
  } catch (error) {
    showToast(error.message || 'Не удалось выполнить действие. Попробуй ещё раз.');
  } finally {
    button.textContent = originalText;
    button.disabled = false;
  }
}

function attachForm(formId, loadingText, action) {
  const form = byId(formId);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const button = form.querySelector('[type="submit"]');
    void runWithButtonState(button, loadingText, () => action(new FormData(form), form));
  });
}

attachForm('profile-form', 'Сохранение...', async (formData, form) => {
  const updatedUser = await api.updateProfile({
    name: String(formData.get('name')).trim(),
    about: String(formData.get('about')).trim(),
  });
  updateProfileView(updatedUser);
  form.reset();
  closePopup(byId('profile-popup'));
  showToast('Профиль обновлён.');
});

attachForm('avatar-form', 'Сохранение...', async (formData, form) => {
  const updatedUser = await api.updateAvatar(String(formData.get('avatar')).trim());
  updateProfileView(updatedUser);
  form.reset();
  closePopup(byId('avatar-popup'));
  showToast('Аватар обновлён.');
});

attachForm('card-form', 'Создание...', async (formData, form) => {
  const newCard = await api.addCard({
    name: String(formData.get('name')).trim(),
    link: String(formData.get('link')).trim(),
  });
  cards.unshift(newCard);
  renderCards();
  form.reset();
  closePopup(byId('card-popup'));
  showToast('Карточка создана.');
});

refs.deleteConfirmButton.addEventListener('click', () => {
  if (!pendingDeleteCard) return;
  void runWithButtonState(refs.deleteConfirmButton, 'Удаление...', async () => {
    await api.deleteCard(pendingDeleteCard._id);
    cards = cards.filter((card) => card._id !== pendingDeleteCard._id);
    pendingDeleteCard = null;
    renderCards();
    closePopup(refs.deletePopup);
    showToast('Карточка удалена.');
  });
});

byId('stats-trigger').addEventListener('click', () => { void handleStatsClick(); });
byId('profile-edit-button').addEventListener('click', () => {
  const form = byId('profile-form');
  form.elements.name.value = currentUser?.name || '';
  form.elements.about.value = currentUser?.about || '';
  openPopup(byId('profile-popup'));
});
byId('avatar-edit-button').addEventListener('click', () => openPopup(byId('avatar-popup')));
byId('add-card-button').addEventListener('click', () => openPopup(byId('card-popup')));

document.querySelectorAll('[data-close]').forEach((button) => {
  button.addEventListener('click', () => closePopup(button.closest('.popup')));
});

document.querySelectorAll('.popup').forEach((popup) => {
  popup.addEventListener('click', (event) => {
    if (event.target === popup) closePopup(popup);
  });
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && activePopup) closePopup(activePopup);
});

async function initialize() {
  if (!isApiConfigured) {
    currentUser = demoUser;
    cards = demoCards;
    refs.demoBanner.hidden = false;
    updateProfileView(demoUser);
    renderCards();
    return;
  }

  try {
    const [cardData, userData] = await Promise.all([api.getCards(), api.getUserInfo()]);
    cards = Array.isArray(cardData) ? cardData : [];
    updateProfileView(userData);
    renderCards();
  } catch (error) {
    refs.demoBanner.hidden = false;
    currentUser = demoUser;
    cards = demoCards;
    updateProfileView(demoUser);
    renderCards();
    showToast(`Не удалось загрузить данные API. Показан предпросмотр: ${error.message}`);
  }
}

void initialize();
