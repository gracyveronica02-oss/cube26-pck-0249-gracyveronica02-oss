import React, { useEffect, useState } from 'react';
import { ApiHeaders, api } from '../services/api';
import { BoundingBoxOverlay } from '../components/BoundingBoxOverlay';
import { QCActionModal } from '../components/QCActionModal';
import { CheckCircle2, AlertOctagon, RotateCw, UserCheck, ShieldAlert, Image, Box } from 'lucide-react';

interface PackDetailPageProps {
  packId: string;
  auth: ApiHeaders;
}

export const PackDetailPage: React.FC<PackDetailPageProps> = ({ packId, auth }) => {
  const [packData, setPackData] = useState<any>(null);
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isQCModalOpen, setIsQCModalOpen] = useState(false);
  const [rescanStatus, setRescanStatus] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const pack = await api.getPack(auth, packId);
      setPackData(pack);

      const anlData = await api.getAnalysesForPack(auth, packId);
      const list = anlData.analyses || [];
      setAnalyses(list);

      if (list.length > 0) {
        // Select latest analysis
        const latest = list[list.length - 1];
        const detail = await api.getAnalysis(auth, latest.analysisId);
        setSelectedAnalysis(detail.analysis);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [packId, auth]);

  const handleSelectAnalysis = async (anlId: string) => {
    const detail = await api.getAnalysis(auth, anlId);
    setSelectedAnalysis(detail.analysis);
  };

  const handleTriggerRescan = async () => {
    setRescanStatus('Enqueuing rescan...');
    try {
      await api.triggerRescan(auth, packId);
      setRescanStatus('Rescan job enqueued! Processing...');
      setTimeout(() => {
        loadData();
        setRescanStatus(null);
      }, 2500);
    } catch {
      setRescanStatus('Failed to trigger rescan');
    }
  };

  const handleQCReviewSubmit = async (data: any) => {
    if (!selectedAnalysis) return;
    await api.submitReview(auth, selectedAnalysis.analysisId, data);
    await loadData();
  };

  if (loading) {
    return <div className="container" style={{ textAlign: 'center', padding: '60px' }}>Loading Pack Detail Dossier...</div>;
  }

  if (!packData) {
    return <div className="container" style={{ textAlign: 'center', padding: '60px' }}>Pack {packId} not found.</div>;
  }

  const isSeal = packData.status === 'SEAL';

  return (
    <div className="container">
      {/* Top Banner */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#1e293b',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '24px',
        border: '1px solid #334155',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>{packData.packId}</h1>
            <span className={`badge ${packData.status}`}>{packData.status}</span>
            <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Unit: {packData.unitId}</span>
          </div>
          <div style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>
            Order Ref: <strong>{packData.order?.externalOrderRef || packData.orderId}</strong> · Channel: {packData.order?.channel || 'direct'} · Station: {packData.packingStation}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={handleTriggerRescan}>
            <RotateCw size={16} />
            <span>Trigger Rescan</span>
          </button>

          <button className="btn" onClick={() => setIsQCModalOpen(true)}>
            <UserCheck size={16} />
            <span>QC Operator Action</span>
          </button>
        </div>
      </div>

      {rescanStatus && (
        <div style={{ background: '#0284c7', color: '#fff', padding: '12px 20px', borderRadius: '6px', marginBottom: '16px' }}>
          {rescanStatus}
        </div>
      )}

      {/* Analysis History Tabs */}
      {analyses.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {analyses.map((anl, idx) => (
            <button
              key={anl.analysisId}
              className={`btn ${selectedAnalysis?.analysisId === anl.analysisId ? '' : 'btn-secondary'}`}
              onClick={() => handleSelectAnalysis(anl.analysisId)}
            >
              Analysis Run #{anl.analysisNumber || idx + 1}: {anl.decision}
            </button>
          ))}
        </div>
      )}

      {/* Main Grid: Left Bounding Boxes, Right Verification Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Left Column: Camera View with Interactive Bounding Boxes */}
        <div>
          <div className="table-card">
            <div className="table-header">
              <div className="table-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Image size={18} className="text-sky-400" />
                <span>Camera Photograph with AI Detections Overlay</span>
              </div>
              <span style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
                {selectedAnalysis?.detections?.length || 0} items localized
              </span>
            </div>

            <div style={{ padding: '16px' }}>
              <BoundingBoxOverlay
                imageUrl={packData.images?.[0]?.url}
                detections={selectedAnalysis?.detections || []}
              />
            </div>
          </div>

          {/* Cropped Detection Evidence Gallery */}
          {selectedAnalysis?.detections && selectedAnalysis.detections.length > 0 && (
            <div className="table-card">
              <div className="table-header">
                <div className="table-title">Cropped Detections Evidence Gallery</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px', padding: '16px' }}>
                {selectedAnalysis.detections.map((det: any, idx: number) => (
                  <div
                    key={det.detectionId || idx}
                    style={{
                      background: '#0f172a',
                      borderRadius: '6px',
                      padding: '8px',
                      border: '1px solid #334155',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{
                      height: '80px',
                      background: '#1e293b',
                      borderRadius: '4px',
                      marginBottom: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#38bdf8',
                      fontSize: '0.75rem',
                    }}>
                      [Crop Item #{idx + 1}]
                    </div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f8fafc' }}>{det.label}</div>
                    <div style={{ fontSize: '0.6875rem', color: '#22c55e' }}>{(det.confidence * 100).toFixed(0)}% Conf</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Order Reconciliation Breakdown */}
        <div>
          {/* Verdict Box */}
          <div style={{
            background: isSeal ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${isSeal ? '#22c55e' : '#ef4444'}`,
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              {isSeal ? (
                <CheckCircle2 size={28} className="text-green-500" style={{ color: '#22c55e' }} />
              ) : (
                <AlertOctagon size={28} className="text-red-500" style={{ color: '#ef4444' }} />
              )}
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>
                {selectedAnalysis?.decision || packData.status}
              </h2>
            </div>
            <p style={{ margin: 0, color: '#e2e8f0', fontSize: '0.9375rem' }}>
              {selectedAnalysis?.ruleEvaluations?.rules?.find((r: any) => r.verdict !== 'PASS')?.details?.issues?.join(', ') ||
               (isSeal ? 'All order lines match perfectly. Carton safe to seal.' : 'Discrepancy detected. Diverted to Quality Control.')}
            </p>
          </div>

          {/* Expected vs Detected Comparison Table */}
          <div className="table-card">
            <div className="table-header">
              <div className="table-title">Order Lines Reconciliation</div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>SKU / Product</th>
                  <th>Expected</th>
                  <th>Observed</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {packData.order?.items?.map((item: any) => {
                  const detectedCount = selectedAnalysis?.skuMatches?.filter((match: any) =>
                    match.selectedSku === item.sku
                  ).length ?? 0;

                  const isMatch = detectedCount === item.expectedQuantity;

                  return (
                    <tr key={item.sku}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#f8fafc' }}>{item.sku}</div>
                        <div style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>{item.productName}</div>
                      </td>
                      <td style={{ fontWeight: 700 }}>×{item.expectedQuantity}</td>
                      <td style={{ fontWeight: 700, color: isMatch ? '#22c55e' : '#ef4444' }}>
                        ×{detectedCount}
                      </td>
                      <td>
                        <span className={`badge ${isMatch ? 'SEAL' : 'STOP_AND_FIX'}`}>
                          {isMatch ? 'MATCH' : 'MISMATCH'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Discrepancies Detailed Audit */}
          {selectedAnalysis?.discrepancies && selectedAnalysis.discrepancies.length > 0 && (
            <div className="table-card" style={{ borderColor: '#ef4444' }}>
              <div className="table-header" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                <div className="table-title" style={{ color: '#f87171' }}>Detected Discrepancies</div>
              </div>
              <div style={{ padding: '16px' }}>
                {selectedAnalysis.discrepancies.map((disc: any, i: number) => (
                  <div key={i} style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #334155' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span className="badge STOP_AND_FIX">{disc.type}</span>
                      <strong style={{ color: '#fff' }}>{disc.expectedSku || disc.detectedSku}</strong>
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '0.8125rem' }}>
                      {JSON.stringify(disc.details || {})}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* QC Modal */}
      {selectedAnalysis && (
        <QCActionModal
          isOpen={isQCModalOpen}
          onClose={() => setIsQCModalOpen(false)}
          packId={packId}
          analysisId={selectedAnalysis.analysisId}
          onSubmit={handleQCReviewSubmit}
        />
      )}
    </div>
  );
};
