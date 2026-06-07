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
.top-nav-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.top-nav-logo {
  font-size: 18px;
  font-weight: 700;
  color: #303133;
  letter-spacing: 1px;
  cursor: default;
}
.top-nav-logo span {
  color: var(--top-nav-active);
}
.top-nav-center {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #f5f7fa;
  border-radius: 6px;
  padding: 2px;
}
.top-nav-item {
  padding: 6px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  color: #606266;
  transition: all 0.2s;
  user-select: none;
  white-space: nowrap;
}
.top-nav-item:hover {
  color: #303133;
  background: #e8eaed;
}
.top-nav-item.active {
  color: #fff;
  background: var(--top-nav-active);
  font-weight: 500;
}
.top-nav-right {
  display: flex;
  align-items: center;
  gap: 16px;
  position: relative;
}
.top-nav-user {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.2s;
}
.top-nav-user:hover {
  background: var(--top-nav-hover);
}
.top-nav-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--top-nav-active);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 500;
}
.top-nav-user-name {
  font-size: 13px;
  color: #303133;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.top-nav-dropdown {
  display: none;
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  background: #fff;
  border: 1px solid var(--top-nav-border);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  min-width: 150px;
  z-index: 9999;
  overflow: hidden;
}
.top-nav-dropdown.open {
  display: block;
}
.top-nav-dropdown-item {
  padding: 10px 16px;
  cursor: pointer;
  font-size: 13px;
  color: #606266;
  transition: background 0.15s;
}
.top-nav-dropdown-item:hover {
  background: var(--top-nav-hover);
  color: #303133;
}
.top-nav-dropdown-item.danger {
  color: #f56c6c;
}
.top-nav-dropdown-item.danger:hover {
  background: #fef0f0;
}
.top-nav-separator {
  height: 1px;
  background: var(--top-nav-border);
  margin: 4px 0;
}
`;

var SUBSYSTEMS = [
  { id: 'dashboard', label: 'Dashboard', url: '/' },
  { id: 'iam', label: 'IAM', url: '/login/personal' },
  { id: 'report', label: 'Report', url: '/report' },
  { id: 'agent', label: 'Agent', url: '/agent/' },
];

var ZawTopNav = (function () {
  function ZawTopNav() {
    HTMLElement.call(this);
    this._current = 'dashboard';
    this._userName = '';
    this._userEmail = '';
    this._dropdownOpen = false;
  }

  ZawTopNav.prototype = Object.create(HTMLElement.prototype);
  ZawTopNav.prototype.constructor = ZawTopNav;

  ZawTopNav.observedAttributes = ['current', 'user-name', 'user-email'];

  ZawTopNav.prototype.attributeChangedCallback = function (name, oldVal, newVal) {
    if (name === 'current') this._current = newVal || 'dashboard';
    if (name === 'user-name') this._userName = newVal || '';
    if (name === 'user-email') this._userEmail = newVal || '';
    this.render();
  };

  ZawTopNav.prototype.connectedCallback = function () {
    this.readAuthState();
    this.render();
    this.shadow = this.attachShadow({ mode: 'open' });
    this.addEventListener('click', this._handleClick.bind(this));
    document.addEventListener('click', function (e) {
      if (this._dropdownOpen && !this.contains(e.target)) {
        this._dropdownOpen = false;
        this.render();
      }
    }.bind(this));
  };

  ZawTopNav.prototype.readAuthState = function () {
    var cookies = document.cookie.split('; ').reduce(function (acc, c) {
      var parts = c.split('=');
      acc[parts[0]] = parts[1];
      return acc;
    }, {});

    var ssoUser = cookies['zaw_user'];
    if (ssoUser) {
      try {
        var parsed = JSON.parse(decodeURIComponent(ssoUser));
        if (!this._userName) this._userName = parsed.name || parsed.email || '';
        if (!this._userEmail) this._userEmail = parsed.email || '';
      } catch (e) {}
    }

    try {
      var lsUser = localStorage.getItem('zaw_user');
      if (lsUser) {
        var parsed = JSON.parse(lsUser);
        if (!this._userName) this._userName = parsed.name || parsed.email || '';
        if (!this._userEmail) this._userEmail = parsed.email || '';
      }
    } catch (e) {}
  };

  ZawTopNav.prototype._handleClick = function (e) {
    var target = e.target;
    var item = target.closest('.top-nav-item');
    if (item && item.dataset.subsystem) {
      this.switchSubsystem(item.dataset.subsystem);
      return;
    }

    var userArea = target.closest('.top-nav-user');
    if (userArea) {
      this._dropdownOpen = !this._dropdownOpen;
      this.render();
      return;
    }

    var ddItem = target.closest('.top-nav-dropdown-item');
    if (ddItem) {
      if (ddItem.dataset.action === 'logout') {
        this.logout();
      } else if (ddItem.dataset.action === 'settings') {
        window.location.href = '/login/personal';
      }
      this._dropdownOpen = false;
      this.render();
      return;
    }
  };

  ZawTopNav.prototype.switchSubsystem = function (id) {
    if (id === this._current) return;
    var sub = SUBSYSTEMS.find(function (s) { return s.id === id; });
    if (sub) {
      window.location.href = sub.url;
    }
  };

  ZawTopNav.prototype.logout = function () {
    document.cookie = 'zaw_token=; path=/; domain=.zaw.zxtech.info; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'zaw_user=; path=/; domain=.zaw.zxtech.info; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    localStorage.removeItem('zaw_token');
    localStorage.removeItem('zaw_user');
    window.location.href = '/login';
  };

  ZawTopNav.prototype.render = function () {
    var initial = (this._userName || this._userEmail || 'U').charAt(0).toUpperCase();
    var subsHtml = SUBSYSTEMS.map(function (s) {
      var active = this._current === s.id ? ' active' : '';
      return '<div class="top-nav-item' + active + '" data-subsystem="' + s.id + '">' + s.label + '</div>';
    }.bind(this)).join('');

    var displayName = this._userName || this._userEmail || '用户';
    var ddClass = this._dropdownOpen ? ' open' : '';

    var shadow = this.shadow || this;

    shadow.innerHTML =
      '<style>' + style + '</style>' +
      '<div class="top-nav-container">' +
        '<div class="top-nav-left"><div class="top-nav-logo">Z<span>AW</span></div></div>' +
        '<div class="top-nav-center">' + subsHtml + '</div>' +
        '<div class="top-nav-right">' +
          '<div class="top-nav-user">' +
            '<div class="top-nav-avatar">' + initial + '</div>' +
            '<span class="top-nav-user-name">' + displayName + '</span>' +
          '</div>' +
          '<div class="top-nav-dropdown' + ddClass + '">' +
            '<div class="top-nav-dropdown-item" data-action="settings">个人设置</div>' +
            '<div class="top-nav-separator"></div>' +
            '<div class="top-nav-dropdown-item danger" data-action="logout">退出登录</div>' +
          '</div>' +
        '</div>' +
      '</div>';
  };

  return ZawTopNav;
})();

customElements.define('zaw-top-nav', ZawTopNav);
