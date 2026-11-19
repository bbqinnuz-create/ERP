const messages = {
  ru: {
    language: 'Язык',
    title: 'Ожидание разрешения подключения',
    checking: 'Проверяем подключение…',
    pending: 'Этот компьютер ожидает разрешения администратора.',
    denied: 'Доступ с этого компьютера запрещён. Обратитесь к администратору.',
    allowed: 'Подключение разрешено. Открываем систему…',
    unavailable: 'Нет связи с сервером. Повторяем проверку…',
    client: 'IP компьютера: {ip}',
  },
  uz: {
    language: 'Til',
    title: 'Ulanishga ruxsat kutilmoqda',
    checking: 'Ulanish tekshirilmoqda…',
    pending: 'Bu kompyuter administrator ruxsatini kutmoqda.',
    denied: 'Bu kompyuterdan foydalanish taqiqlangan. Administratorga murojaat qiling.',
    allowed: 'Ulanishga ruxsat berildi. Tizim ochilmoqda…',
    unavailable: 'Server bilan aloqa yo‘q. Tekshiruv takrorlanmoqda…',
    client: 'Kompyuter IP manzili: {ip}',
  },
};

const language = document.querySelector('#language');
const clientIp = document.querySelector('#client-ip');
const detail = document.querySelector('#detail');
const message = document.querySelector('#message');
let currentIp = '';
language.value = localStorage.getItem('kassa_lang') === 'uz' ? 'uz' : 'ru';

function localize() {
  const strings = messages[language.value];
  document.documentElement.lang = language.value;
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    element.textContent = strings[element.dataset.i18n];
  });
  clientIp.textContent = currentIp ? strings.client.replace('{ip}', currentIp) : '';
  localStorage.setItem('kassa_lang', language.value);
}

language.addEventListener('change', localize);
localize();

async function checkAccess() {
  try {
    const response = await fetch('/ip-wait-status', { cache: 'no-store' });
    if (!response.ok) throw new Error('status');
    const result = await response.json();
    currentIp = result.ip;
    clientIp.textContent = messages[language.value].client.replace('{ip}', currentIp);
    if (result.status === 'allowed') {
      message.textContent = messages[language.value].allowed;
      window.location.replace('/');
      return;
    }
    message.textContent = '';
    detail.textContent = messages[language.value][result.status];
  } catch {
    message.textContent = messages[language.value].unavailable;
  }
  window.setTimeout(checkAccess, 3000);
}

void checkAccess();
