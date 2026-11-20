const groupId = import.meta.env.VITE_MESTO_GROUP_ID?.trim();
const token = import.meta.env.VITE_MESTO_TOKEN?.trim();

const baseUrl = groupId
  ? `https://mesto.nomoreparties.co/v1/${groupId}`
  : '';

export const isApiConfigured = Boolean(groupId && token);

async function getResponseData(response) {
  const rawBody = await response.text();
  let data = null;

  if (rawBody) {
    try {
      data = JSON.parse(rawBody);
    } catch {
      data = rawBody;
    }
  }

  if (!response.ok) {
    const message = typeof data === 'object' && data?.message
      ? data.message
      : `Ошибка запроса: ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return data;
}

function request(path, options = {}) {
  if (!isApiConfigured) {
    return Promise.reject(new Error('API не настроен. Заполни VITE_MESTO_GROUP_ID и VITE_MESTO_TOKEN в .env.local.'));
  }

  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      authorization: token,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  }).then(getResponseData);
}

const withJsonBody = (method, body) => ({
  method,
  body: JSON.stringify(body),
});

export const api = {
  getUserInfo() {
    return request('/users/me');
  },

  getCards() {
    return request('/cards');
  },

  updateProfile({ name, about }) {
    return request('/users/me', withJsonBody('PATCH', { name, about }));
  },

  updateAvatar(avatar) {
    return request('/users/me/avatar', withJsonBody('PATCH', { avatar }));
  },

  addCard({ name, link }) {
    return request('/cards', withJsonBody('POST', { name, link }));
  },

  deleteCard(cardId) {
    return request(`/cards/${encodeURIComponent(cardId)}`, { method: 'DELETE' });
  },

  changeLikeCardStatus(cardId, isLiked) {
    const method = isLiked ? 'DELETE' : 'PUT';
    return request(`/cards/likes/${encodeURIComponent(cardId)}`, { method });
  },
};
