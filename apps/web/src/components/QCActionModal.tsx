import React, { useState } from 'react';
import { X, CheckCircle2, RotateCcw, AlertTriangle } from 'lucide-react';

interface QCActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  packId: string;
  analysisId: string;
  onSubmit: (data: {
    action: string;
    operatorVerdict: string;
    reasonCode: string;
    notes?: string;
  }) => Promise<void>;
}

export const QCActionModal: React.FC<QCActionModalProps> = ({
  isOpen,
  onClose,
  packId,
  analysisId,
  onSubmit,
}) => {
  const [action, setAction] = useState('APPROVED_OVERRIDE');
  const [operatorVerdict, setOperatorVerdict] = useState('SEAL');
  const [reasonCode, setReasonCode] = useState('VISUAL_INSPECTION_CONFIRMED');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({ action, operatorVerdict, reasonCode, notes });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
            QC Operator Intervention
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '20px' }}>
          Record manual quality verification action for Pack <strong>{packId}</strong> (Analysis: {analysisId}).
          All actions are immutable and audited.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '6px' }}>
              Action Type
            </label>
            <select
              style={{ width: '100%', padding: '10px' }}
              value={action}
              onChange={(e) => {
                const val = e.target.value;
                setAction(val);
                if (val === 'APPROVED_OVERRIDE') setOperatorVerdict('SEAL');
                if (val === 'REJECTED_REPACK') setOperatorVerdict('STOP_AND_FIX');
              }}
            >
              <option value="APPROVED_OVERRIDE">Approved Override (Operator confirms physical box is correct)</option>
              <option value="REJECTED_REPACK">Rejected Repack (Operator confirms mis-pack and returns for re-pick)</option>
              <option value="RESCAN_REQUESTED">Rescan Requested (Repositioned item / new camera photograph)</option>
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '6px' }}>
              Human Verdict
            </label>
            <select
              style={{ width: '100%', padding: '10px' }}
              value={operatorVerdict}
              onChange={(e) => setOperatorVerdict(e.target.value)}
            >
              <option value="SEAL">SEAL (Allow package to be taped and shipped)</option>
              <option value="STOP_AND_FIX">STOP_AND_FIX (Halt shipment for rework)</option>
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '6px' }}>
              Reason Code
            </label>
            <select
              style={{ width: '100%', padding: '10px' }}
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value)}
            >
              <option value="VISUAL_INSPECTION_CONFIRMED">Visual Inspection Confirmed (Item present under flap)</option>
              <option value="BARCODE_MANUALLY_SCANNED">Barcode Manually Scanned</option>
              <option value="PACKAGING_REVISION_DIFFERENCE">Packaging Revision Difference</option>
              <option value="PHYSICAL_MISPACK_CONFIRMED">Physical Mis-pack Confirmed</option>
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '6px' }}>
              Operator Notes
            </label>
            <textarea
              style={{
                width: '100%',
                padding: '10px',
                background: '#0f172a',
                border: '1px solid #475569',
                borderRadius: '6px',
                color: '#fff',
                minHeight: '80px',
              }}
              placeholder="Provide exact details of physical inspection..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn" disabled={isSubmitting}>
              {isSubmitting ? 'Recording...' : 'Commit QC Action'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
