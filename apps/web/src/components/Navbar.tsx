import React from 'react';
import { Package, ShieldAlert, LayoutDashboard, Tag, Layers, Camera } from 'lucide-react';
import { ApiHeaders } from '../services/api';

interface NavbarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  auth: ApiHeaders;
  onAuthChange: (auth: ApiHeaders) => void;
  qcCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  auth,
  onAuthChange,
  qcCount,
}) => {
  return (
    <header className="header">
      <div className="logo-area">
        <Package className="w-6 h-6 text-sky-400" />
        <span>PackManager AI</span>
      </div>

      <nav className="nav-links">
        <button
          className={`nav-button ${currentTab === 'verify' ? 'active' : ''}`}
          onClick={() => onTabChange('verify')}
        >
          <Camera size={18} />
          <span>Verify Carton</span>
        </button>

        <button
          className={`nav-button ${currentTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => onTabChange('dashboard')}
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </button>

        <button
          className={`nav-button ${currentTab === 'qc-queue' ? 'active' : ''}`}
          onClick={() => onTabChange('qc-queue')}
        >
          <ShieldAlert size={18} />
          <span>QC Rework Queue</span>
          {qcCount > 0 && (
            <span style={{
              background: '#ef4444',
              color: '#fff',
              fontSize: '0.75rem',
              padding: '2px 6px',
              borderRadius: '999px',
              fontWeight: 'bold',
            }}>
              {qcCount}
            </span>
          )}
        </button>

        <button
          className={`nav-button ${currentTab === 'pack-detail' ? 'active' : ''}`}
          onClick={() => onTabChange('pack-detail')}
        >
          <Layers size={18} />
          <span>Pack Detail</span>
        </button>

        <button
          className={`nav-button ${currentTab === 'catalog' ? 'active' : ''}`}
          onClick={() => onTabChange('catalog')}
        >
          <Tag size={18} />
          <span>Product Catalog</span>
        </button>
      </nav>

      <div className="tenant-selector">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '0.75rem', color: '#94a3b8' }}>
          <span>Tenant (RLS)</span>
          <select
            value={auth.orgId}
            onChange={(e) => onAuthChange({ ...auth, orgId: e.target.value })}
          >
            <option value="org_demo_alpha">org_demo_alpha</option>
            <option value="org_demo_bravo">org_demo_bravo</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '0.75rem', color: '#94a3b8' }}>
          <span>Role (RBAC)</span>
          <select
            value={auth.role}
            onChange={(e) => onAuthChange({ ...auth, role: e.target.value })}
          >
            <option value="QC_OPERATOR">QC_OPERATOR</option>
            <option value="SUPERVISOR">SUPERVISOR</option>
            <option value="ADMIN">ADMIN</option>
            <option value="VIEWER">VIEWER</option>
          </select>
        </div>
      </div>
    </header>
  );
};
