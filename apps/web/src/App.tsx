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

  const handleSelectPack = (packId: string) => {
    setSelectedPackId(packId);
    setCurrentTab('pack-detail');
  };

  return (
    <div>
      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        auth={auth}
        onAuthChange={setAuth}
        qcCount={qcCount}
      />

      <main>
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
  );
};
