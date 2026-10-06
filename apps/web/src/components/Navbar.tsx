import React from 'react';
import { Package, ShieldAlert, LayoutDashboard, Tag, Layers, Camera, Moon, Sun } from 'lucide-react';
import { ApiHeaders } from '../services/api';

interface NavbarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  auth: ApiHeaders;
  onAuthChange: (auth: ApiHeaders) => void;
  qcCount: number;
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  auth,
  onAuthChange,
  qcCount,
  theme,
  onThemeToggle,
}) => {
  const tabs = [
    { id: 'verify', label: 'Verify Carton', icon: Camera },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'qc-queue', label: 'QC Rework Queue', icon: ShieldAlert, count: qcCount },
    { id: 'pack-detail', label: 'Pack Detail', icon: Layers },
    { id: 'catalog', label: 'Product Catalog', icon: Tag },
  ];

  return (
    <>
      <aside className="sidebar" aria-label="Pack Manager navigation">
        <div className="sidebar-logo">
          <span className="logo-icon"><Package size={21} /></span>
          <span>PackManager AI</span>
        </div>
        <nav className="sidebar-nav" aria-label="Main navigation">
          {tabs.map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              type="button"
              aria-label={label}
              aria-current={currentTab === id ? 'page' : undefined}
              className={`nav-button ${currentTab === id ? 'active' : ''}`}
              onClick={() => onTabChange(id)}
            >
              <Icon size={18} />
              <span className="nav-label">{label}</span>
              {count != null && count > 0 && <span className="nav-count">{count}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">Outbound verification workspace</div>
      </aside>
      <header className="topbar">
          <div className="topbar-title">Pack Manager</div>
          <div className="topbar-right">
            <div className="tenant-selector">
              <label className="tenant-control">
                Tenant
                <select
                  aria-label="Tenant"
                  value={auth.orgId}
                  onChange={(e) => onAuthChange({ ...auth, orgId: e.target.value })}
                >
                  <option value="org_demo_alpha">org_demo_alpha</option>
                  <option value="org_demo_bravo">org_demo_bravo</option>
                </select>
              </label>
              <label className="tenant-control">
                Role
                <select
                  aria-label="Role"
                  value={auth.role}
                  onChange={(e) => onAuthChange({ ...auth, role: e.target.value })}
                >
                  <option value="QC_OPERATOR">QC_OPERATOR</option>
                  <option value="SUPERVISOR">SUPERVISOR</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="VIEWER">VIEWER</option>
                </select>
              </label>
            </div>
            <button
              type="button"
              className="theme-toggle"
              onClick={onThemeToggle}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            >
              {theme === 'light' ? <Moon size={15} aria-hidden="true" /> : <Sun size={15} aria-hidden="true" />}
              {theme === 'light' ? 'Dark' : 'Light'}
            </button>
          </div>
      </header>
    </>
  );
};
