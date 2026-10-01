import React, { useEffect, useState } from 'react';
import { ApiHeaders, api } from '../services/api';
import { CheckCircle, AlertOctagon, Clock, Layers, ArrowRight } from 'lucide-react';

interface DashboardPageProps {
  auth: ApiHeaders;
  onSelectPack: (packId: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ auth, onSelectPack }) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentPacks, setRecentPacks] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const [metricsData, packsData] = await Promise.all([
        api.getMetrics(auth),
        api.listPacks(auth, { }),
      ]);
      setMetrics(metricsData);
      setRecentPacks((packsData?.packs || []).slice(0, 8));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot reach the Pack Manager API.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
    const interval = window.setInterval(() => void loadDashboard(false), 15000);
    return () => window.clearInterval(interval);
  }, [auth]);

  if (loading) {
    return <div className="container" style={{ textAlign: 'center', padding: '60px' }}>Loading Dashboard Metrics...</div>;
  }

  if (error || !metrics) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '60px' }}>
        <p style={{ color: '#fca5a5' }}>{error || 'Metrics unavailable.'}</p>
        <button className="btn" onClick={() => void loadDashboard()} style={{ marginTop: '12px' }}>Retry</button>
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' }}>
        <div>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 800, margin: '0 0 8px 0' }}>
          Outbound Fulfillment Verification Overview
        </h1>
        <p style={{ color: '#94a3b8', margin: 0 }}>
          Real-time AI camera pack verification across packing stations.
        </p>
        </div>
        <button className="btn btn-secondary" onClick={() => void loadDashboard(false)} disabled={refreshing}>
          {refreshing ? 'Refreshing…' : 'Refresh data'}
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-title">Total Verified Packs</div>
          <div className="metric-value">{metrics.totalPacks}</div>
          <div style={{ color: '#64748b', fontSize: '0.8125rem', marginTop: '6px' }}>
            Active Station Volume
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-title">SEAL (Exact Matches)</div>
          <div className="metric-value seal">
            {metrics.sealedCount} <span style={{ fontSize: '1rem', fontWeight: 500 }}>({metrics.sealRate}%)</span>
          </div>
          <div style={{ color: '#22c55e', fontSize: '0.8125rem', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle size={14} /> Passed to Shipping Tape
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-title">STOP & FIX (Diverted)</div>
          <div className="metric-value stop">
            {metrics.stopCount} <span style={{ fontSize: '1rem', fontWeight: 500 }}>({metrics.stopRate}%)</span>
          </div>
          <div style={{ color: '#ef4444', fontSize: '0.8125rem', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <AlertOctagon size={14} /> Prevented Mis-ships
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-title">Avg Analysis Latency</div>
          <div className="metric-value">
            {metrics.averageLatencyMs > 0 ? `${(metrics.averageLatencyMs / 1000).toFixed(1)}s` : '< 1.5s'}
          </div>
          <div style={{ color: '#64748b', fontSize: '0.8125rem', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={14} /> Target: 30–90s SLA
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-title">UNCERTAIN Rate</div>
          <div className="metric-value">{metrics.completedDecisionCount > 0 ? `${metrics.uncertainRate}%` : 'N/A'}</div>
          <div style={{ color: metrics.uncertainRate > metrics.uncertainRateTarget ? '#fbbf24' : '#94a3b8', fontSize: '0.8125rem', marginTop: '6px' }}>
            Target ≤ {metrics.uncertainRateTarget}% · sustained &gt; {metrics.uncertainRateKillThreshold}% is kill condition · {metrics.uncertainCount}/{metrics.completedDecisionCount} decisions
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-title">Pending Rate</div>
          <div className="metric-value">{metrics.totalPacks > 0 ? `${metrics.pendingRate}%` : 'N/A'}</div>
          <div style={{ color: metrics.pendingRate > metrics.pendingRateTarget ? '#fbbf24' : '#94a3b8', fontSize: '0.8125rem', marginTop: '6px' }}>
            Target ≤ {metrics.pendingRateTarget}% · {metrics.pendingCount} packs pending
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-title">All Expected Items Present</div>
          <div className="metric-value">{metrics.comparisonSampleCount > 0 ? `${metrics.allItemsPresentRate}%` : 'N/A'}</div>
          <div style={{ color: '#94a3b8', fontSize: '0.8125rem', marginTop: '6px' }}>
            Confirmed comparisons only · {metrics.comparisonSampleCount} cartons
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-title">Quantities Correct</div>
          <div className="metric-value">{metrics.comparisonSampleCount > 0 ? `${metrics.quantitiesCorrectRate}%` : 'N/A'}</div>
          <div style={{ color: '#94a3b8', fontSize: '0.8125rem', marginTop: '6px' }}>
            Exact SKU counts; excludes uncertain cartons
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-title">Occlusion Signals</div>
          <div className="metric-value">{metrics.occlusionCount}</div>
          <div style={{ color: '#94a3b8', fontSize: '0.8125rem', marginTop: '6px' }}>
            Latest analysis per carton; single-shot coverage
          </div>
        </div>
      </div>

      {/* Recent Packs */}
      <div className="table-card" style={{ marginBottom: '24px' }}>
        <div className="table-header">
          <div>
            <div className="table-title">Recent Packs</div>
            <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '4px' }}>Live from the current tenant</div>
          </div>
        </div>
        <table>
          <thead><tr><th>Pack ID</th><th>Order</th><th>Station</th><th>Status</th><th>Updated</th><th></th></tr></thead>
          <tbody>
            {recentPacks.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '28px', color: '#64748b' }}>No packs have been created yet.</td></tr>
            ) : recentPacks.map((pack) => (
              <tr key={pack.packId}>
                <td style={{ fontWeight: 700 }}>{pack.packId}</td>
                <td>{pack.orderId}</td>
                <td>{pack.packingStation || '—'}</td>
                <td><span className={`badge ${pack.status}`}>{String(pack.status || 'UNKNOWN').replaceAll('_', ' ')}</span></td>
                <td>{pack.updatedAt ? new Date(pack.updatedAt).toLocaleString() : '—'}</td>
                <td><button className="btn btn-secondary" style={{ padding: '6px 10px' }} onClick={() => onSelectPack(pack.packId)}><ArrowRight size={14} /> Open</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Discrepancy Breakdown Table */}
      <div className="table-card">
        <div className="table-header">
          <div className="table-title">Discrepancy Breakdown by Root Cause</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Discrepancy Type</th>
              <th>Occurrences</th>
              <th>Impact</th>
              <th>Action Triggered</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(metrics.discrepancyBreakdown || {}).length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  No discrepancies recorded yet in this tenant.
                </td>
              </tr>
            ) : (
              Object.entries(metrics.discrepancyBreakdown).map(([type, count]) => (
                <tr key={type}>
                  <td>
                    <span className="badge STOP_AND_FIX">{type}</span>
                  </td>
                  <td style={{ fontWeight: 700 }}>{count as number}</td>
                  <td>Outbound mis-ship risk eliminated</td>
                  <td>Diverted to QC Rework</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
