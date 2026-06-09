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
  height: var(--top-nav-height);
  padding: 0 24px;
  background: var(--top-nav-bg);
  border-bottom: 1px solid var(--top-nav-border);
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  box-sizing: border-box;
}
.top-nav-logo { font-size: 18px; font-weight: 700; color: var(--top-nav-active); letter-spacing: 1px; cursor: default; white-space: nowrap; margin-right: 24px; }
.top-nav-center { display: flex; align-items: center; gap: 4px; flex: 1; overflow: hidden; }
.top-nav-subnav-item {
  padding: 6px 14px;
  cursor: pointer;
  font-size: 13px;
  color: #606266;
  border-radius: 4px;
  white-space: nowrap;
  transition: background 0.15s, color 0.15s;
}
.top-nav-subnav-item:hover { background: var(--top-nav-hover); color: #303133; }
.top-nav-subnav-item.active { color: var(--top-nav-active); font-weight: 500; background: #ecf5ff; }
.top-nav-right { display: flex; align-items: center; gap: 16px; position: relative; flex-shrink: 0; margin-left: 12px; }
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
  static observedAttributes = ['current', 'user-name', 'user-email', 'subnav'];

  constructor() {
    super();
    this._current = 'dashboard';
    this._userName = '';
    this._userEmail = '';
    this._userRole = '';
    this._subnav = [];
    this._dropdownOpen = false;
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'current') this._current = newVal || 'dashboard';
    if (name === 'user-name') this._userName = newVal || '';
    if (name === 'user-email') this._userEmail = newVal || '';
    if (name === 'subnav') {
      try { this._subnav = JSON.parse(newVal || '[]'); } catch (e) { this._subnav = []; }
    }
    this.render();
  }

  connectedCallback() {
    this.shadow = this.attachShadow({ mode: 'open' });
    if (!this._subnav.length) {
      try { this._subnav = JSON.parse(this.getAttribute('subnav') || '[]'); } catch (e) {}
    }
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
        if (!this._userRole) this._userRole = parsed.role || '';
      } catch (e) {}
    }

    try {
      const lsUser = localStorage.getItem('zaw_user');
      if (lsUser) {
        const parsed = JSON.parse(lsUser);
        if (!this._userName) this._userName = parsed.name || parsed.email || '';
        if (!this._userEmail) this._userEmail = parsed.email || '';
        if (!this._userRole) this._userRole = parsed.role || '';
      }
    } catch (e) {}

    if (!this._userRole) {
      const dashRole = cookies['dash_role'];
      if (dashRole) this._userRole = decodeURIComponent(dashRole);
    }
  }

  visibleSubnav() {
    if (!this._subnav.length) return [];
    return this._subnav.filter(item => {
      if (!item.roles) return true;
      const allowed = item.roles.split(',');
      return allowed.includes(this._userRole);
    });
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

    const subItem = path.find(el => el.classList && el.classList.contains('top-nav-subnav-item'));
    if (subItem) {
      const url = subItem.dataset.url;
      if (url) this.navigate(url);
      return;
    }
  }

  navigate(url) {
    if (window.__zawNavHandler) {
      const handled = window.__zawNavHandler(url);
      if (handled) return;
    }
    window.location.href = url;
  }

  switchSubsystem(id) {
    if (id === this._current) return;
    const sub = SUBSYSTEMS.find(s => s.id === id);
    if (sub) window.location.href = sub.url;
  }

  logout() {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    const domain = !isLocalhost && hostname.endsWith('.zaw.zxtech.info') ? '.zaw.zxtech.info' : undefined;
    const domainAttr = domain ? `;domain=${domain}` : '';
    const secure = window.location.protocol === 'https:' ? ';Secure' : '';

    const cookies = ['zaw_token', 'zaw_user', 'dash_token', 'dash_user_id', 'dash_role', 'dash_eid', 'dash_nick', 'dash_refresh', 'dash_expires', 'dash_role'];
    for (const name of cookies) {
      document.cookie = `${name}=;path=/${domainAttr};max-age=0${secure};SameSite=Lax`;
      document.cookie = `${name}=;path=/;max-age=0${secure};SameSite=Lax`;
    }

    localStorage.removeItem('zaw_token');
    localStorage.removeItem('zaw_user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('expiresAt');
    localStorage.removeItem('user');

    window.location.href = '/login';
  }

  render() {
    const shadow = this.shadow || this;
    const initial = (this._userName || this._userEmail || 'U').charAt(0).toUpperCase();
    const displayName = this._userName || this._userEmail || '用户';
    const ddClass = this._dropdownOpen ? ' open' : '';
    const pathname = window.location.pathname;

    const dropdownOrder = ['dashboard', 'report', 'agent', 'iam'];
    const ddItemsHtml = dropdownOrder.map(id => {
      const sub = SUBSYSTEMS.find(s => s.id === id);
      if (!sub) return '';
      const active = this._current === id ? ' active' : '';
      return `<div class="top-nav-dropdown-item${active}" data-subsystem="${id}">${sub.label}</div>`;
    }).join('');

    const visibleItems = this.visibleSubnav();
    const subnavHtml = visibleItems.map(item => {
      const active = item.url === pathname || (item.url !== '/' && pathname.startsWith(item.url)) ? ' active' : '';
      return `<span class="top-nav-subnav-item${active}" data-url="${item.url}">${item.label}</span>`;
    }).join('');

    shadow.innerHTML = `
      <style>${style}</style>
      <div class="top-nav-container">
        <div class="top-nav-logo">ZAW</div>
        <div class="top-nav-center">${subnavHtml}</div>
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
