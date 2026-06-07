const style = `
:host {
  display: block;
  width: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 14px;
  color: #333;
  --top-nav-bg: #fff;
  --top-nav-border: #e4e7ed;
  --top-nav-height: 56px;
  --top-nav-active: #409eff;
  --top-nav-hover: #f5f7fa;
}
.top-nav-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--top-nav-height);
  padding: 0 24px;
  background: var(--top-nav-bg);
  border-bottom: 1px solid var(--top-nav-border);
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  box-sizing: border-box;
}
.top-nav-left { display: flex; align-items: center; gap: 12px; }
.top-nav-logo { font-size: 18px; font-weight: 700; color: #303133; letter-spacing: 1px; cursor: default; }
.top-nav-logo span { color: var(--top-nav-active); }
.top-nav-right { display: flex; align-items: center; gap: 16px; position: relative; margin-left: auto; }
.top-nav-user { display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 4px 8px; border-radius: 4px; transition: background 0.2s; }
.top-nav-user:hover { background: var(--top-nav-hover); }
.top-nav-avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--top-nav-active); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 500; }
.top-nav-user-name { font-size: 13px; color: #303133; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.top-nav-dropdown { display: none; position: absolute; top: calc(100% + 4px); right: 0; background: #fff; border: 1px solid var(--top-nav-border); border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); min-width: 160px; z-index: 9999; overflow: hidden; }
.top-nav-dropdown.open { display: block; }
.top-nav-dropdown-item { padding: 10px 16px; cursor: pointer; font-size: 13px; color: #606266; transition: background 0.15s; }
.top-nav-dropdown-item:hover { background: var(--top-nav-hover); color: #303133; }
.top-nav-dropdown-item.active { color: var(--top-nav-active); font-weight: 500; background: #ecf5ff; }
.top-nav-dropdown-item.danger { color: #f56c6c; }
.top-nav-dropdown-item.danger:hover { background: #fef0f0; }
.top-nav-separator { height: 1px; background: var(--top-nav-border); margin: 4px 0; }
`;

const SUBSYSTEMS = [
  { id: 'dashboard', label: 'Dashboard', url: '/' },
  { id: 'iam', label: 'IAM', url: '/login/personal' },
  { id: 'report', label: 'Report', url: '/report' },
  { id: 'agent', label: 'Agent', url: '/agent/' },
];

class ZawTopNav extends HTMLElement {
  static observedAttributes = ['current', 'user-name', 'user-email'];

  constructor() {
    super();
    this._current = 'dashboard';
    this._userName = '';
    this._userEmail = '';
    this._dropdownOpen = false;
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'current') this._current = newVal || 'dashboard';
    if (name === 'user-name') this._userName = newVal || '';
    if (name === 'user-email') this._userEmail = newVal || '';
    this.render();
  }

  connectedCallback() {
    this.shadow = this.attachShadow({ mode: 'open' });
    this.readAuthState();
    this.render();
    this.addEventListener('click', (e) => this._handleClick(e));
    document.addEventListener('click', (e) => {
      if (this._dropdownOpen && !this.contains(e.target)) {
        this._dropdownOpen = false;
        this.render();
      }
    });
  }

  readAuthState() {
    const cookies = document.cookie.split('; ').reduce((acc, c) => {
      const parts = c.split('=');
      acc[parts[0]] = parts[1];
      return acc;
    }, {});

    const ssoUser = cookies['zaw_user'];
    if (ssoUser) {
      try {
        const parsed = JSON.parse(decodeURIComponent(ssoUser));
        if (!this._userName) this._userName = parsed.name || parsed.email || '';
        if (!this._userEmail) this._userEmail = parsed.email || '';
      } catch (e) {}
    }

    try {
      const lsUser = localStorage.getItem('zaw_user');
      if (lsUser) {
        const parsed = JSON.parse(lsUser);
        if (!this._userName) this._userName = parsed.name || parsed.email || '';
        if (!this._userEmail) this._userEmail = parsed.email || '';
      }
    } catch (e) {}
  }

  _handleClick(e) {
    const path = e.composedPath();
    const userArea = path.find(el => el.classList && el.classList.contains('top-nav-user'));
    if (userArea) {
      this._dropdownOpen = !this._dropdownOpen;
      this.render();
      return;
    }

    const ddItem = path.find(el => el.classList && el.classList.contains('top-nav-dropdown-item'));
    if (ddItem) {
      if (ddItem.dataset.action === 'logout') {
        this.logout();
      } else if (ddItem.dataset.subsystem) {
        this.switchSubsystem(ddItem.dataset.subsystem);
      }
      this._dropdownOpen = false;
      this.render();
      return;
    }
  }

  switchSubsystem(id) {
    if (id === this._current) return;
    const sub = SUBSYSTEMS.find(s => s.id === id);
    if (sub) window.location.href = sub.url;
  }

  logout() {
    document.cookie = 'zaw_token=; path=/; domain=.zaw.zxtech.info; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'zaw_user=; path=/; domain=.zaw.zxtech.info; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    localStorage.removeItem('zaw_token');
    localStorage.removeItem('zaw_user');
    window.location.href = '/login';
  }

  render() {
    const shadow = this.shadow || this;
    const initial = (this._userName || this._userEmail || 'U').charAt(0).toUpperCase();
    const displayName = this._userName || this._userEmail || '用户';
    const ddClass = this._dropdownOpen ? ' open' : '';

    const dropdownOrder = ['dashboard', 'report', 'agent', 'iam'];
    const ddItemsHtml = dropdownOrder.map(id => {
      const sub = SUBSYSTEMS.find(s => s.id === id);
      if (!sub) return '';
      const active = this._current === id ? ' active' : '';
      return `<div class="top-nav-dropdown-item${active}" data-subsystem="${id}">${sub.label}</div>`;
    }).join('');

    shadow.innerHTML = `
      <style>${style}</style>
      <div class="top-nav-container">
        <div class="top-nav-left"><div class="top-nav-logo">Z<span>AW</span></div></div>
        <div class="top-nav-right">
          <div class="top-nav-user">
            <div class="top-nav-avatar">${initial}</div>
            <span class="top-nav-user-name">${displayName}</span>
          </div>
          <div class="top-nav-dropdown${ddClass}">
            ${ddItemsHtml}
            <div class="top-nav-separator"></div>
            <div class="top-nav-dropdown-item danger" data-action="logout">退出登录</div>
          </div>
        </div>
      </div>`;
  }
}

customElements.define('zaw-top-nav', ZawTopNav);
