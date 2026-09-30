import React, { useEffect, useState } from 'react';
import { ApiHeaders, api } from '../services/api';
import { Plus, Search, Tag, Check } from 'lucide-react';

interface CatalogPageProps {
  auth: ApiHeaders;
}

export const CatalogPage: React.FC<CatalogPageProps> = ({ auth }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form State
  const [sku, setSku] = useState('');
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('');
  const [barcode, setBarcode] = useState('');
  const [criticalAttributes, setCriticalAttributes] = useState('color, size');

  const fetchCatalog = (q = '') => {
    setLoading(true);
    api.getProducts(auth, q).then((data) => {
      setProducts(data.products || []);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchCatalog();
  }, [auth]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCatalog(searchQuery);
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const attrs = criticalAttributes.split(',').map(s => s.trim()).filter(Boolean);
    await api.createProduct(auth, {
      sku,
      productName,
      category,
      barcode,
      criticalAttributes: attrs,
    });
    setIsAddOpen(false);
    setSku('');
    setProductName('');
    setCategory('');
    setBarcode('');
    fetchCatalog();
  };

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, margin: '0 0 8px 0' }}>
            Product Catalog & Reference Database
          </h1>
          <p style={{ color: '#94a3b8', margin: 0 }}>
            Catalog definitions, critical attributes, variants, and barcodes for verification matching.
          </p>
        </div>

        {auth.role === 'ADMIN' && (
          <button className="btn" onClick={() => setIsAddOpen(true)}>
            <Plus size={16} />
            <span>Add New Product SKU</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
          <input
            type="text"
            style={{
              width: '100%',
              padding: '10px 12px 10px 40px',
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '6px',
              color: '#fff',
            }}
            placeholder="Search by SKU, product name, or barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-secondary">
          Search
        </button>
      </form>

      {/* Product List Table */}
      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Product Name</th>
              <th>Category</th>
              <th>Barcode</th>
              <th>Critical Attributes</th>
              <th>Variants</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>Loading Catalog...</td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  No products found. Add products to catalog.
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.sku}>
                  <td style={{ fontWeight: 700, color: '#f8fafc' }}>{p.sku}</td>
                  <td>{p.productName}</td>
                  <td>
                    <span style={{ color: '#94a3b8' }}>{p.category || 'Standard'}</span>
                  </td>
                  <td>
                    <code>{p.barcode || 'N/A'}</code>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {p.criticalAttributes?.map((attr: string) => (
                        <span key={attr} style={{ background: '#334155', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem' }}>
                          {attr}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>{p.variants?.length || 0} variant(s)</td>
                  <td>
                    <span className="badge SEAL">ACTIVE</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Product Modal */}
      {isAddOpen && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.25rem', fontWeight: 700 }}>Add Product to Catalog</h3>
            <form onSubmit={handleCreateProduct}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', marginBottom: '4px' }}>SKU (e.g. SKU-A)</label>
                <input
                  type="text"
                  required
                  style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #475569', borderRadius: '6px', color: '#fff' }}
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', marginBottom: '4px' }}>Product Name</label>
                <input
                  type="text"
                  required
                  style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #475569', borderRadius: '6px', color: '#fff' }}
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', marginBottom: '4px' }}>Category</label>
                <input
                  type="text"
                  style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #475569', borderRadius: '6px', color: '#fff' }}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', marginBottom: '4px' }}>Barcode (UPC / EAN)</label>
                <input
                  type="text"
                  style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #475569', borderRadius: '6px', color: '#fff' }}
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', marginBottom: '4px' }}>
                  Critical Attributes (comma-separated, e.g. color, size)
                </label>
                <input
                  type="text"
                  style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #475569', borderRadius: '6px', color: '#fff' }}
                  value={criticalAttributes}
                  onChange={(e) => setCriticalAttributes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn">
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
