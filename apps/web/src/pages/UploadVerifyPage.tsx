import React, { useState, useEffect, useRef } from 'react';
import { ApiHeaders, api } from '../services/api';
import { BoundingBoxOverlay } from '../components/BoundingBoxOverlay';
import {
  UploadCloud,
  CheckCircle2,
  AlertOctagon,
  HelpCircle,
  Camera,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
  RefreshCw,
  FileText,
  QrCode,
  Plus,
  Trash2,
} from 'lucide-react';

interface UploadVerifyPageProps {
  auth: ApiHeaders;
  onSelectPack: (packId: string) => void;
}

interface LineItem {
  sku: string;
  productName: string;
  expectedQuantity: number;
  asin?: string;
  referenceImage?: string;
  criticalAttributes?: string[];
  attributes?: Record<string, string>;
}

export const UploadVerifyPage: React.FC<UploadVerifyPageProps> = ({ auth, onSelectPack }) => {
  const [selectedOrderId, setSelectedOrderId] = useState<string>('ORD-101');
  const [orderExists, setOrderExists] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState<any[]>([]);
  const [packingStation, setPackingStation] = useState<string>('STATION-01');
  const [unitId, setUnitId] = useState<string>(`CARTON-${Math.floor(10000 + Math.random() * 90000)}`);
  const [manualCode, setManualCode] = useState('ORD-101');
  const [manualOrderNotFound, setManualOrderNotFound] = useState(false);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [catalogQuery, setCatalogQuery] = useState('');
  const [selectedCatalogSku, setSelectedCatalogSku] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanHint, setScanHint] = useState<string | null>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scanTimerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [createdPackId, setCreatedPackId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyOrder = (order: any, nextUnitId?: string, nextPackingStation?: string) => {
    setSelectedOrderId(order.orderId);
    setOrderExists(true);
    setManualOrderNotFound(false);
    setLineItems(
      (order.items || []).map((item: any) => ({
        sku: item.sku,
        productName: item.productName,
        expectedQuantity: item.expectedQuantity,
        asin: item.asin || catalogProducts.find((product) => product.sku === item.sku)?.asin,
        referenceImage: item.referenceImage || catalogProducts.find((product) => product.sku === item.sku)?.referenceImages?.[0],
        criticalAttributes: item.criticalAttributes || ['color', 'size'],
        attributes: item.attributes || {},
      }))
    );
    if (nextUnitId) setUnitId(nextUnitId);
    if (nextPackingStation) setPackingStation(nextPackingStation);
  };

  const loadOrders = () => {
    Promise.all([api.getOrders(auth), api.getProducts(auth)]).then(([ordersResult, productsResult]) => {
      const list = ordersResult.orders || [];
      const products = productsResult.products || [];
      setCatalogProducts(products);
      const current = list.find((o: any) => o.orderId === selectedOrderId) || list[0];
      if (current) {
        const hydratedProducts = products;
        setCatalogProducts(hydratedProducts);
        setSelectedOrderId(current.orderId);
        setOrderExists(true);
        setLineItems((current.items || []).map((item: any) => {
          const product = hydratedProducts.find((candidate: any) => candidate.sku === item.sku);
          return {
            sku: item.sku,
            productName: item.productName,
            expectedQuantity: item.expectedQuantity,
            asin: item.asin || product?.asin,
            referenceImage: item.referenceImage || product?.referenceImages?.[0],
            criticalAttributes: item.criticalAttributes || ['color', 'size'],
            attributes: item.attributes || {},
          };
        }));
      }
    }).catch(() => setError('Could not load orders. Start the API on port 4000.'));
  };

  useEffect(() => {
    loadOrders();
    return () => stopScan();
  }, [auth]);

  useEffect(() => {
    if (catalogProducts.length === 0) return;
    let changed = false;
    const hydratedItems = lineItems.map((item) => {
      const product = catalogProducts.find((candidate) => candidate.sku.toLowerCase() === item.sku.trim().toLowerCase());
      const asin = item.asin || product?.asin;
      const referenceImage = item.referenceImage || product?.referenceImages?.[0];
      if (asin !== item.asin || referenceImage !== item.referenceImage) changed = true;
      return { ...item, asin, referenceImage };
    });
    if (changed) setLineItems(hydratedItems);
  }, [catalogProducts]);

  const ingestFile = (file: File) => {
    if (!file.type.startsWith('image/')) { setError('Please select an image file for the carton photograph.'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('The carton photograph must be 10 MB or smaller.'); return; }
    const source = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(source);
      const maxDimension = 1600;
      const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext('2d');
      if (!context) {
        setError('Could not prepare the carton photograph. Please try another image.');
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      setImagePreview(dataUrl);
      setImageBase64(dataUrl.split(',')[1]);
      setError(null);
    };
    image.onerror = () => {
      URL.revokeObjectURL(source);
      setError('The selected carton photograph could not be opened. Please try another image.');
    };
    image.src = source;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) ingestFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) ingestFile(file);
  };

  const stopScan = () => {
    if (scanTimerRef.current) {
      window.clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  };

  const lookupCode = async (code: string): Promise<'loaded' | 'not-found' | 'error'> => {
    if (!code.trim()) {
      setError('Enter or scan an order ID first.');
      return 'error';
    }
    setError(null);
    try {
      const data = await api.lookupOrder(auth, code);
      if (data.error || !data.order) {
        setError(data.message || `No order found for ${code}`);
        setManualOrderNotFound(true);
        if (data.parsed?.orderId) setManualCode(data.parsed.orderId);
        if (data.parsed?.unitId) setUnitId(data.parsed.unitId);
        if (data.parsed?.packingStation) setPackingStation(data.parsed.packingStation);
        return 'not-found';
      }
      applyOrder(data.order, data.unitId, data.packingStation);
      setManualCode(data.order.orderId);
      setManualOrderNotFound(false);
      stopScan();
      setScanHint(`Loaded ${data.order.orderId}`);
      return 'loaded';
    } catch (err: any) {
      setError(`Could not load order: ${err.message || 'API request failed'}`);
      setManualOrderNotFound(false);
      return 'error';
    }
  };

  const addCatalogProduct = () => {
    const product = catalogProducts.find((candidate) => candidate.sku === selectedCatalogSku);
    if (!product) return;
    setLineItems((rows) => [...rows, {
      sku: product.sku,
      productName: product.productName,
      asin: product.asin || '',
      expectedQuantity: 1,
      referenceImage: product.referenceImages?.[0],
      criticalAttributes: product.criticalAttributes || ['color', 'size'],
      attributes: {},
    }]);
    setSelectedCatalogSku('');
  };

  const uploadReferenceImage = (idx: number, file?: File) => {
    if (!file) return;
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      const maxDimension = 512;
      const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext('2d');
      URL.revokeObjectURL(objectUrl);
      if (!context) {
        setError('Could not prepare the product reference image.');
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const referenceImage = canvas.toDataURL('image/jpeg', 0.75);
      setLineItems((rows) => rows.map((row, i) => i === idx ? { ...row, referenceImage } : row));
      setError(null);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setError('The selected product reference file is not a readable image.');
    };
    image.src = objectUrl;
  };

  const startManualManifest = async () => {
    if (!manualOrderNotFound) {
      const lookupResult = await lookupCode(manualCode);
      if (lookupResult !== 'not-found') return;
    }
    let orderId = manualCode.trim();
    try {
      const payload = JSON.parse(orderId) as { orderId?: unknown; order_id?: unknown };
      const payloadOrderId = typeof payload.orderId === 'string' ? payload.orderId : payload.order_id;
      if (typeof payloadOrderId === 'string') orderId = payloadOrderId.trim();
    } catch {
      // A plain order ID is also a valid manual manifest reference.
    }
    if (!orderId) {
      setError('Enter an Order ID before creating a manual manifest.');
      return;
    }
    setSelectedOrderId(orderId);
    setManualCode(orderId);
    setOrderExists(false);
    setManualOrderNotFound(false);
    setLineItems([]);
    setAnalysisResult(null);
    setScanHint(`Manual manifest for ${orderId} — add the expected products below.`);
    setError(null);
  };

  const startScan = async () => {
    if (scanning) return;
    setError(null);
    setScanHint(null);
    const Detector = (window as unknown as { BarcodeDetector?: new (opts: { formats: string[] }) => { detect: (src: CanvasImageSource) => Promise<Array<{ rawValue: string }>> } }).BarcodeDetector;
    if (!Detector) {
      setError('Live QR scan needs Chrome/Edge BarcodeDetector. Enter an order ID and choose Load order or Create manual manifest.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setScanning(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
      const detector = new Detector({ formats: ['qr_code', 'code_128', 'code_39'] });
      scanTimerRef.current = window.setInterval(async () => {
        if (!videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes[0]?.rawValue) {
            await lookupCode(codes[0].rawValue);
          }
        } catch {
          // keep scanning
        }
      }, 450);
    } catch {
      setError('Camera permission denied. Enter the order ID manually.');
      setScanning(false);
    }
  };

  const handleRunAnalysis = async () => {
    if (!imageBase64 && !imagePreview) {
      setError('Please select or capture a carton photograph before analyzing.');
      return;
    }
    if (!selectedOrderId.trim()) {
      setError('Enter, scan, or create an order manifest first.');
      return;
    }
    if (lineItems.length === 0 || lineItems.some((i) => !i.sku.trim() || !i.productName.trim() || !Number.isInteger(i.expectedQuantity) || i.expectedQuantity < 1)) {
      setError('Each product needs a SKU, product name, and whole-number quantity of at least 1.');
      return;
    }

    setError(null);
    setAnalyzing(true);
    setAnalysisResult(null);

    try {
      setAnalysisStep('0/4 Saving order manifest...');
      const orderItems = lineItems.map((item) => ({
        ...item,
        sku: item.sku.trim(),
        productName: item.productName.trim(),
        criticalAttributes: item.criticalAttributes || ['color', 'size'],
        attributes: item.attributes || {},
      }));
      if (orderExists) {
        const patched = await api.patchOrder(auth, selectedOrderId, { items: orderItems });
        if (patched?.error) throw new Error(patched.message || 'Could not save order lines');
      } else {
        const createdOrder = await api.createOrder(auth, {
          orderId: selectedOrderId,
          externalOrderRef: selectedOrderId,
          items: orderItems,
        });
        if (createdOrder?.error) throw new Error(createdOrder.message || 'Could not create manual order');
        setOrderExists(true);
      }

      setAnalysisStep('1/4 Initializing carton pack record in WMS...');
      const pack = await api.createPack(auth, {
        unitId,
        orderId: selectedOrderId,
        packingStation,
        operatorId: auth.userId,
      });
      if (pack?.error) throw new Error(pack.message || 'Pack create failed');

      const packId = pack.packId;
      setCreatedPackId(packId);

      setAnalysisStep('2/4 Ingesting & validating photograph (resolution, blur, lighting)...');
      const upload = await api.uploadImage(auth, packId, {
        imageBase64: imageBase64 || '',
        viewAngle: 'TOP_DOWN',
      });
      if (upload?.error) throw new Error(upload.message || 'Carton photograph upload failed');

      setAnalysisStep('3/4 Running deterministic AI verification...');
      const job = await api.triggerAnalysis(auth, packId);
      if (job?.error) throw new Error(job.message || 'Could not start carton verification');

      setAnalysisStep('4/4 Compiling evidence dossier & final operational decision...');
      const deadline = Date.now() + 60_000;
      let lastPollError = '';
      while (Date.now() < deadline) {
        try {
          const anlData = await api.getAnalysesForPack(auth, packId);
          if (anlData?.error) throw new Error(anlData.message || 'Could not read verification status');
          const list = anlData.analyses || [];
          if (list.length > 0) {
            const latest = [...list].sort((a: any, b: any) => (b.analysisNumber || 0) - (a.analysisNumber || 0))[0];
            if (latest.status === 'FAILED') throw new Error(latest.failureReason || latest.errorMessage || 'The verification worker reported a failed analysis');
            if (latest.status !== 'COMPLETED') {
              setAnalysisStep('4/4 Verification is processing (' + (latest.status || 'QUEUED') + ')...');
            } else {
              const detail = await api.getAnalysis(auth, latest.analysisId);
              if (detail?.error || !detail.analysis) throw new Error(detail?.message || 'Verification completed but its result could not be loaded');
              setAnalysisResult(detail.analysis);
              setAnalyzing(false);
              return;
            }
          }
          lastPollError = '';
        } catch (err: any) {
          lastPollError = err.message || 'Could not check verification status';
        }
        await new Promise((resolve) => window.setTimeout(resolve, 800));
      }
      setAnalyzing(false);
      setError(lastPollError
        ? `Could not retrieve verification result: ${lastPollError}`
        : 'Verification is still processing after 60 seconds. Check the pack queue before retrying.');
    } catch (err: any) {
      setAnalyzing(false);
      setError(`Analysis failed: ${err.message || 'Unknown error'}`);
    }
  };

  const useSamplePhoto = () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
      <rect width="800" height="600" fill="#0f172a"/>
      <rect x="100" y="80" width="600" height="440" rx="16" fill="#78350f" stroke="#b45309" stroke-width="6"/>
      <rect x="130" y="110" width="540" height="380" rx="10" fill="#92400e"/>
      <rect x="170" y="150" width="180" height="150" rx="8" fill="#18181b" stroke="#3f3f46" stroke-width="3"/>
      <text x="260" y="235" font-family="sans-serif" font-size="16" fill="#f4f4f5" font-weight="bold" text-anchor="middle">Black T-Shirt (M)</text>
      <rect x="420" y="170" width="160" height="130" rx="8" fill="#1e3a8a" stroke="#3b82f6" stroke-width="3"/>
      <text x="500" y="245" font-family="sans-serif" font-size="16" fill="#f4f4f5" font-weight="bold" text-anchor="middle">Blue Cap</text>
    </svg>`;
    const b64 = btoa(svg);
    setImagePreview(`data:image/svg+xml;base64,${b64}`);
    setImageBase64(b64);
  };

  return (
    <div className="container" style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <UploadCloud size={28} color="#38bdf8" />
          Verify Carton
        </h1>
        <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.95rem' }}>
          Scan the packing-slip QR (or type the order), edit the manifest if needed, then upload an overhead carton photo.
        </p>
      </div>

      <div style={{
        background: 'rgba(14, 165, 233, 0.1)',
        border: '1px solid rgba(14, 165, 233, 0.3)',
        borderRadius: '8px',
        padding: '12px 16px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <Zap size={20} color="#38bdf8" />
        <div style={{ fontSize: '0.875rem', color: '#e0f2fe' }}>
          Demo QR values: <code>ORD-101</code> or <code>{'{"orderId":"ORD-101","unitId":"CARTON-10001"}'}</code>. Tenant: org_demo_alpha.
        </div>
      </div>

      {error && (
        <div style={{ background: '#ef4444', color: '#fff', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px' }}>
          {error}
        </div>
      )}
      {scanHint && !error && (
        <div style={{ background: '#065f46', color: '#fff', padding: '10px 16px', borderRadius: '8px', marginBottom: '20px' }}>
          {scanHint}
        </div>
      )}

      <div style={{ background: '#1e293b', padding: '20px', borderRadius: '10px', border: '1px solid #334155', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <QrCode size={18} color="#38bdf8" />
          Scan order QR
        </h2>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
          {!scanning ? (
            <button className="btn" onClick={startScan}><Camera size={16} /><span>Scan order QR</span></button>
          ) : (
            <button className="btn btn-secondary" onClick={stopScan}>Stop camera</button>
          )}
        </div>
        {scanning && (
          <video ref={videoRef} muted playsInline autoPlay style={{ width: '100%', maxHeight: '220px', borderRadius: '8px', background: '#000', marginBottom: '12px' }} />
        )}
        <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '6px' }}>Enter manually</label>
        <div className="order-lookup-row" style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={manualCode}
            onChange={(e) => {
              setManualCode(e.target.value);
              setManualOrderNotFound(false);
            }}
            placeholder="Order ID, packing-slip QR, or JSON payload"
            style={{ flex: 1, padding: '8px 10px', background: '#0f172a', border: '1px solid #475569', borderRadius: '6px', color: '#fff' }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void lookupCode(manualCode);
            }}
          />
          <button className="btn btn-secondary" onClick={() => void lookupCode(manualCode)}>Load order</button>
          <button className="btn btn-secondary" onClick={() => void startManualManifest()}>
            {manualOrderNotFound ? 'Create Manual Order' : 'Create manual manifest'}
          </button>
        </div>
      </div>

      <div className="verify-workflow-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        <div style={{ background: '#1e293b', padding: '20px', borderRadius: '10px', border: '1px solid #334155' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Camera size={18} color="#38bdf8" />
            1. Carton photograph
          </h2>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed #475569',
              borderRadius: '8px',
              padding: '30px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              background: '#0f172a',
              marginBottom: '16px',
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
            />
            {imagePreview ? (
              <div>
                <img src={imagePreview} alt="Carton Preview" style={{ maxHeight: '200px', maxWidth: '100%', borderRadius: '6px', objectFit: 'contain', marginBottom: '10px' }} />
                <div style={{ color: '#38bdf8', fontSize: '0.85rem' }}>Click to replace, or use the phone camera</div>
              </div>
            ) : (
              <div>
                <UploadCloud size={44} color="#64748b" style={{ margin: '0 auto 12px auto' }} />
                <div style={{ color: '#cbd5e1', fontWeight: 600, marginBottom: '6px' }}>Capture, click, or drop carton photo</div>
                <div style={{ color: '#64748b', fontSize: '0.8rem' }}>JPEG, PNG, WebP · overhead open box</div>
              </div>
            )}
          </div>
          <button className="btn btn-secondary" style={{ width: '100%', padding: '10px' }} onClick={useSamplePhoto}>
            Use sample carton photo
          </button>
        </div>

        <div style={{ background: '#1e293b', padding: '20px', borderRadius: '10px', border: '1px solid #334155' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} color="#38bdf8" />
            2. Order manifest (editable)
          </h2>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '6px' }}>Order ID</label>
            <div style={{ padding: '10px 12px', background: '#0f172a', border: '1px solid #475569', borderRadius: '6px', color: '#e2e8f0', fontWeight: 700 }}>
              {selectedOrderId || 'No order loaded'}
              <span style={{ marginLeft: '8px', color: orderExists ? '#6ee7b7' : '#fbbf24', fontSize: '0.75rem', fontWeight: 500 }}>
                {orderExists ? 'ORDER LOADED' : selectedOrderId ? 'MANUAL MANIFEST' : 'ADD AN ORDER'}
              </span>
            </div>
          </div>
          <div className="manifest-meta-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '4px' }}>Carton LPN</label>
              <input type="text" value={unitId} onChange={(e) => setUnitId(e.target.value)} style={{ width: '100%', padding: '8px 10px', background: '#0f172a', border: '1px solid #475569', borderRadius: '6px', color: '#fff' }} />
            </div>
            <div>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '4px' }}>Packing station</label>
              <input type="text" value={packingStation} onChange={(e) => setPackingStation(e.target.value)} style={{ width: '100%', padding: '8px 10px', background: '#0f172a', border: '1px solid #475569', borderRadius: '6px', color: '#fff' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <input
              type="search"
              value={catalogQuery}
              onChange={(e) => setCatalogQuery(e.target.value)}
              placeholder="Search catalogue by SKU or product name"
              aria-label="Search product catalogue"
              style={{ flex: 1, minWidth: '180px', padding: '8px 10px', background: '#0f172a', border: '1px solid #475569', borderRadius: '6px', color: '#fff' }}
            />
            <input
              type="text"
              list="manifest-catalog-products"
              value={selectedCatalogSku}
              onChange={(e) => setSelectedCatalogSku(e.target.value)}
              placeholder="Catalogue SKU (optional)"
              aria-label="Select or enter a catalogue SKU"
              style={{ flex: 1, minWidth: '180px', padding: '8px 10px', background: '#0f172a', border: '1px solid #475569', borderRadius: '6px', color: '#fff' }}
            />
            <datalist id="manifest-catalog-products">
              {catalogProducts
                .filter((product) => `${product.sku} ${product.productName} ${product.asin || ''}`.toLowerCase().includes(catalogQuery.trim().toLowerCase()))
                .map((product) => (
                  <option key={product.sku} value={product.sku} label={`${product.productName}${product.asin ? ` (${product.asin})` : ''}`} />
                ))}
            </datalist>
            <button
              className="btn btn-secondary"
              disabled={!catalogProducts.some((product) => product.sku === selectedCatalogSku)}
              onClick={addCatalogProduct}
            >
              <Plus size={14} /> Add selected
            </button>
          </div>

          <div style={{ background: '#0f172a', padding: '12px', borderRadius: '6px', border: '1px solid #334155' }}>
            {lineItems.map((item, idx) => (
              <div key={idx} className="manifest-product-row" style={{ display: 'grid', gridTemplateColumns: '42px minmax(90px, 1fr) minmax(110px, 1.2fr) minmax(80px, 0.8fr) 66px 32px', gap: '6px', marginBottom: '8px', alignItems: 'center' }}>
                {item.referenceImage ? (
                  <img src={item.referenceImage} alt={`${item.productName} reference`} style={{ width: '38px', height: '38px', objectFit: 'contain', borderRadius: '4px', background: '#fff' }} />
                ) : (
                  <div aria-label="No reference image" style={{ width: '38px', height: '38px', borderRadius: '4px', background: '#1e293b' }} />
                )}
                <input
                  value={item.sku}
                  onChange={(e) => setLineItems((rows) => rows.map((r, i) => i === idx ? { ...r, sku: e.target.value } : r))}
                  onBlur={() => {
                    const product = catalogProducts.find((candidate) => candidate.sku.toLowerCase() === item.sku.trim().toLowerCase());
                    if (product) {
                      setLineItems((rows) => rows.map((r, i) => i === idx ? {
                        ...r,
                        productName: r.productName || product.productName,
                        asin: r.asin || product.asin || '',
                        referenceImage: r.referenceImage || product.referenceImages?.[0],
                        criticalAttributes: r.criticalAttributes || product.criticalAttributes,
                      } : r));
                    }
                  }}
                  placeholder="SKU"
                  aria-label={`Product ${idx + 1} SKU`}
                  style={{ minWidth: 0, padding: '6px', background: '#1e293b', border: '1px solid #475569', borderRadius: '4px', color: '#fff', fontSize: '0.8rem' }}
                />
                <input value={item.productName} onChange={(e) => setLineItems((rows) => rows.map((r, i) => i === idx ? { ...r, productName: e.target.value } : r))} placeholder="Product name" aria-label={`Product ${idx + 1} name`} style={{ minWidth: 0, padding: '6px', background: '#1e293b', border: '1px solid #475569', borderRadius: '4px', color: '#fff', fontSize: '0.8rem' }} />
                <input value={item.asin || ''} onChange={(e) => setLineItems((rows) => rows.map((r, i) => i === idx ? { ...r, asin: e.target.value } : r))} placeholder="ASIN" aria-label={`Product ${idx + 1} ASIN`} style={{ minWidth: 0, padding: '6px', background: '#1e293b', border: '1px solid #475569', borderRadius: '4px', color: '#fff', fontSize: '0.8rem' }} />
                <input type="number" min={1} step={1} value={item.expectedQuantity} onChange={(e) => setLineItems((rows) => rows.map((r, i) => i === idx ? { ...r, expectedQuantity: Number(e.target.value) } : r))} aria-label={`Product ${idx + 1} expected quantity`} style={{ minWidth: 0, padding: '6px', background: '#1e293b', border: '1px solid #475569', borderRadius: '4px', color: '#fff', fontSize: '0.8rem' }} />
                <button className="btn btn-secondary" style={{ padding: '4px' }} aria-label={`Remove product ${idx + 1}`} onClick={() => setLineItems((rows) => rows.filter((_, i) => i !== idx))}><Trash2 size={14} /></button>
                <label style={{ gridColumn: '2 / 6', color: '#94a3b8', fontSize: '0.75rem', cursor: 'pointer' }}>
                  {item.referenceImage ? 'Replace product reference image' : 'Upload product reference image (optional)'}
                  <input
                    type="file"
                    accept="image/*"
                    aria-label={`Upload product ${idx + 1} reference image`}
                    onChange={(e) => {
                      uploadReferenceImage(idx, e.currentTarget.files?.[0]);
                      e.currentTarget.value = '';
                    }}
                    style={{ display: 'block', maxWidth: '100%', marginTop: '4px', fontSize: '0.75rem' }}
                  />
                </label>
                {item.referenceImage && (
                  <button
                    className="btn btn-secondary"
                    style={{ gridColumn: '6', padding: '4px', fontSize: '0.7rem' }}
                    aria-label={`Remove product ${idx + 1} reference image`}
                    onClick={() => setLineItems((rows) => rows.map((r, i) => i === idx ? { ...r, referenceImage: undefined } : r))}
                  >
                    Remove image
                  </button>
                )}
              </div>
            ))}
            <button className="btn btn-secondary" style={{ width: '100%', marginTop: '4px' }} onClick={() => setLineItems((rows) => [...rows, { sku: '', productName: '', expectedQuantity: 1 }])}>
              <Plus size={14} /> Add Product
            </button>
          </div>

          <button className="btn" style={{ width: '100%', marginTop: '20px', padding: '14px', fontSize: '1rem', justifyContent: 'center' }} disabled={analyzing} onClick={handleRunAnalysis}>
            {analyzing ? (<><RefreshCw size={18} className="animate-spin" /><span>Running verification...</span></>) : (<><ShieldCheck size={18} /><span>Run AI verification</span></>)}
          </button>
        </div>
      </div>

      {analyzing && (
        <div style={{ background: '#1e293b', padding: '20px', borderRadius: '10px', border: '1px solid #38bdf8', textAlign: 'center', marginBottom: '24px' }}>
          <RefreshCw size={32} color="#38bdf8" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px auto' }} />
          <h3 style={{ margin: '0 0 8px 0', color: '#f8fafc' }}>Analyzing carton contents</h3>
          <p style={{ color: '#38bdf8', margin: 0, fontWeight: 500 }}>{analysisStep}</p>
        </div>
      )}

      {analysisResult && (
        <div style={{ background: '#1e293b', borderRadius: '10px', border: '1px solid #334155', overflow: 'hidden' }}>
          <div style={{
            padding: '20px 24px',
            background: analysisResult.decision === 'SEAL' ? '#065f46' : analysisResult.decision === 'STOP_AND_FIX' ? '#991b1b' : '#92400e',
            color: '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                {analysisResult.decision === 'SEAL' && <CheckCircle2 size={26} />}
                {analysisResult.decision === 'STOP_AND_FIX' && <AlertOctagon size={26} />}
                {analysisResult.decision !== 'SEAL' && analysisResult.decision !== 'STOP_AND_FIX' && <HelpCircle size={26} />}
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>
                  DECISION: {analysisResult.decision === 'STOP_AND_FIX' ? 'STOP & FIX' : analysisResult.decision === 'SEAL' ? 'SEAL' : 'UNCERTAIN'}
                </h2>
              </div>
              <div style={{ opacity: 0.9, fontSize: '0.9rem' }}>{analysisResult.reasonSummary}</div>
              {analysisResult.decision === 'UNCERTAIN' && (
                <div style={{ marginTop: '8px', fontWeight: 700 }}>
                  Operator action: STOP for human review. Recorded outcome remains UNCERTAIN.
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{(analysisResult.overallConfidence == null ? 0 : analysisResult.overallConfidence * 100).toFixed(1)}%</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>CONFIDENCE</div>
            </div>
          </div>
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 12px 0', color: '#cbd5e1' }}>Visual inspection</h3>
                <div style={{ border: '1px solid #334155', borderRadius: '8px', overflow: 'hidden' }}>
                  <BoundingBoxOverlay imageUrl={imagePreview || ''} detections={analysisResult.detections || []} />
                </div>
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 12px 0', color: '#cbd5e1' }}>Manifest vs identified items</h3>
                <div style={{ border: '1px solid #334155', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 100px', gap: '8px', padding: '8px 10px', color: '#94a3b8', fontSize: '0.75rem', background: '#0f172a' }}>
                    <span>Expected product</span><span>Expected</span><span>Identified</span>
                  </div>
                  {(analysisResult.expectedItems || []).map((expected: any) => {
                    const detected = (analysisResult.detectedItems || []).find((item: any) => item.sku === expected.sku);
                    return (
                      <div key={expected.sku} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 100px', gap: '8px', padding: '9px 10px', borderTop: '1px solid #334155', color: '#e2e8f0', fontSize: '0.8rem' }}>
                        <span>{expected.name || expected.sku} <code style={{ color: '#94a3b8' }}>{expected.sku}</code></span>
                        <span>{expected.quantity}</span>
                        <span>{detected?.quantity ?? 0}</span>
                      </div>
                    );
                  })}
                  <div style={{ padding: '8px 10px', borderTop: '1px solid #334155', color: '#94a3b8', fontSize: '0.72rem' }}>
                    Identified counts include confident SKU matches only; ambiguous objects are not guessed.
                  </div>
                </div>
                {analysisResult.discrepancies?.length > 0 ? (
                  analysisResult.discrepancies.map((d: any, i: number) => (
                    <div key={i} style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '10px 12px', borderRadius: '6px', marginBottom: '8px' }}>
                      <div style={{ fontWeight: 600, color: '#fca5a5', fontSize: '0.85rem' }}>{d.type.replaceAll('_', ' ')}</div>
                      {(d.expectedSku || d.detectedSku) && (
                        <div style={{ color: '#cbd5e1', fontSize: '0.8rem', marginTop: '4px' }}>
                          {d.expectedSku && <>Expected SKU: {d.expectedSku}</>}
                          {d.expectedSku && d.detectedSku && ' · '}
                          {d.detectedSku && <>Observed SKU: {d.detectedSku}</>}
                        </div>
                      )}
                      {d.details?.label && (
                        <div style={{ color: '#cbd5e1', fontSize: '0.8rem', marginTop: '4px' }}>Observed label: {d.details.label}</div>
                      )}
                      {(d.expectedQuantity != null || d.detectedQuantity != null) && (
                        <div style={{ color: '#cbd5e1', fontSize: '0.8rem', marginTop: '4px' }}>
                          Expected quantity: {d.expectedQuantity ?? '—'} · Observed quantity: {d.detectedQuantity ?? '—'}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '12px', borderRadius: '6px', color: '#6ee7b7', marginBottom: '16px', fontSize: '0.875rem' }}>
                    {analysisResult.decision === 'SEAL'
                      ? `Order manifest ${selectedOrderId} verified: all visible items and quantities match.`
                      : 'No item-level discrepancy was confirmed. Review the photograph and manifest before proceeding.'}
                  </div>
                )}
                {createdPackId && (
                  <button className="btn btn-secondary" style={{ width: '100%', marginTop: '20px', padding: '12px', justifyContent: 'center' }} onClick={() => onSelectPack(createdPackId)}>
                    <FileText size={16} /><span>Open evidence dossier</span><ArrowRight size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
