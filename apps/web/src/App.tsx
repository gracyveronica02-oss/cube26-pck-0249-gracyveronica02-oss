import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { QCQueuePage } from './pages/QCQueuePage';
import { PackDetailPage } from './pages/PackDetailPage';
import { CatalogPage } from './pages/CatalogPage';
import { UploadVerifyPage } from './pages/UploadVerifyPage';
import { ApiHeaders, api } from './services/api';
import './styles.css';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState('verify');
  const [selectedPackId, setSelectedPackId] = useState('PACK-001');
  const [qcCount, setQcCount] = useState(0);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (
    localStorage.getItem('pack-manager-theme') === 'dark' ? 'dark' : 'light'
  ));

  const [auth, setAuth] = useState<ApiHeaders>({
    orgId: 'org_demo_alpha',
    role: 'QC_OPERATOR',
    userId: 'operator_1',
  });

  const refreshQCCount = () => {
    api.getQCQueue(auth).then((data) => {
      setQcCount(data.totalCount || 0);
    }).catch(() => {});
  };

  useEffect(() => {
    refreshQCCount();
    const interval = setInterval(refreshQCCount, 10000);
    return () => clearInterval(interval);
  }, [auth]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('pack-manager-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((value) => value === 'light' ? 'dark' : 'light');

  const handleSelectPack = (packId: string) => {
    setSelectedPackId(packId);
    setCurrentTab('pack-detail');
  };

  return (
    <div className="app-shell">
      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        auth={auth}
        onAuthChange={setAuth}
        qcCount={qcCount}
        theme={theme}
        onThemeToggle={toggleTheme}
      />

      <div className="main-content">
        <main className="page-content">
          {currentTab === 'verify' && (
            <UploadVerifyPage auth={auth} onSelectPack={handleSelectPack} />
          )}
          {currentTab === 'dashboard' && (
            <DashboardPage auth={auth} onSelectPack={handleSelectPack} />
          )}
          {currentTab === 'qc-queue' && (
            <QCQueuePage auth={auth} onSelectPack={handleSelectPack} />
          )}
          {currentTab === 'pack-detail' && (
            <PackDetailPage packId={selectedPackId} auth={auth} />
          )}
          {currentTab === 'catalog' && (
            <CatalogPage auth={auth} />
          )}
        </main>
      </div>
    </div>
  );
};
