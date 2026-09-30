import React, { useEffect, useState } from 'react';
import { ApiHeaders, api } from '../services/api';
import { AlertCircle, Clock, ExternalLink } from 'lucide-react';

interface QCQueuePageProps {
  auth: ApiHeaders;
  onSelectPack: (packId: string) => void;
}

export const QCQueuePage: React.FC<QCQueuePageProps> = ({ auth, onSelectPack }) => {
  const [queueData, setQueueData] = useState<any>({ items: [], totalCount: 0 });
  const [loading, setLoading] = useState(true);

  const fetchQueue = () => {
    setLoading(true);
    api.getQCQueue(auth).then((data) => {
      setQueueData(data?.items ? data : { items: [], totalCount: 0 });
      setLoading(false);
    }).catch(() => {
      setQueueData({ items: [], totalCount: 0 });
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchQueue();
  }, [auth]);

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, margin: '0 0 8px 0' }}>
            Quality Control (QC) Rework Queue
          </h1>
          <p style={{ color: '#94a3b8', margin: 0 }}>
            Cartons halted with STOP_AND_FIX awaiting physical resolution or operator sign-off.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={fetchQueue}>
          Refresh Queue
        </button>
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Priority</th>
              <th>Pack ID</th>
              <th>Unit ID</th>
              <th>Order Ref</th>
              <th>Channel</th>
              <th>Waiting</th>
              <th>Discrepancy Root Cause</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>Loading QC Queue...</td>
              </tr>
            ) : queueData.items.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#22c55e' }}>
                  ✓ QC Queue is clear! All outbound packages sealed and dispatched.
                </td>
              </tr>
            ) : (
              queueData.items.map((item: any, idx: number) => (
                <tr key={item.packId}>
                  <td>
                    <span style={{
                      background: idx === 0 ? '#ef4444' : '#f59e0b',
                      color: '#fff',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}>
                      P{idx + 1}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700, color: '#f8fafc' }}>{item.packId}</td>
                  <td>{item.unitId}</td>
                  <td>{item.orderId}</td>
                  <td>
                    <span style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>{item.channel}</span>
                  </td>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fbbf24' }}>
                      <Clock size={14} /> {item.waitTimeMinutes}m
                    </span>
                  </td>
                  <td>
                    {item.discrepancies.length > 0 ? (
                      <span className="badge STOP_AND_FIX">{item.discrepancies[0].type}</span>
                    ) : (
                      <span className="badge STOP_AND_FIX">STOP_AND_FIX</span>
                    )}
                  </td>
                  <td>
                    <button
                      className="btn"
                      style={{ padding: '6px 12px', fontSize: '0.8125rem' }}
                      onClick={() => onSelectPack(item.packId)}
                    >
                      <span>Inspect</span>
                      <ExternalLink size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
