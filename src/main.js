import './styles/theme.css';
import './styles/layout.css';
import { Game } from './controller/Game.js';
import { GameView } from './view/GameView.js';
import { AccountManager } from './utils/AccountManager.js';
import { LocalStorageStore } from './utils/LocalStorageStore.js';

const root = document.querySelector('#app');
let store;
let accounts;
let game;
let view;

try {
  store = new LocalStorageStore();
  accounts = new AccountManager({ store });
  game = new Game(accounts);
  view = new GameView(root, game);
} catch (error) {
  const message = document.createElement('p');
  message.setAttribute('role', 'alert');
  message.textContent = `页面初始化失败：${error.message} 请使用现代浏览器，通过 npm run dev 提供的本机地址打开。`;
  root.replaceChildren(message);
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    view?.dispose();
    game?.dispose();
    accounts?.dispose();
    store?.dispose?.();
  });
}
