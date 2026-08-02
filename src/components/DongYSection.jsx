import React, { useEffect, useState } from 'react';
import { fetchMedicines } from '../services/api';
import ProductCard from './ui/ProductCard';
import { Leaf, ChevronRight, Sparkles } from 'lucide-react';
import './DongYSection.css';

const mapProduct = (p) => ({
  id: p.id,
  name: p.name,
  image: p.image_url || p.imageUrl,
  price: parseFloat(p.price),
  oldPrice: p.old_price ? parseFloat(p.old_price) : (p.oldPrice ? parseFloat(p.oldPrice) : null),
  unit: p.unit || 'Hộp',
  discount: p.discount,
  origin: p.origin || 'Việt Nam',
  packaging: p.packaging || '',
  description: p.description,
  requiresPrescription: p.requires_prescription !== undefined ? p.requires_prescription : p.requiresPrescription,
  stockQuantity: p.stockQuantity !== undefined ? p.stockQuantity : (p.stock_quantity !== undefined ? p.stock_quantity : 99),
});

const BENEFITS = [
  { icon: '🌿', title: 'Thiên nhiên 100%', desc: 'Chiết xuất từ thảo dược sạch' },
  { icon: '🔬', title: 'Khoa học kiểm định', desc: 'Đạt tiêu chuẩn GMP-WHO' },
  { icon: '🤝', title: 'Tin dùng lâu đời', desc: 'Hàng nghìn năm lịch sử' },
  { icon: '💚', title: 'An toàn toàn diện', desc: 'Không tác dụng phụ' },
];

const DongYSection = ({ onProductClick }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  const tabs = [
    { key: 'all', label: '🌿 Tất cả', catId: 1 },
    { key: 'thuoc', label: '💊 Thuốc Đông Y', catId: 3 },
    { key: 'tra', label: '🫖 Trà Thảo Dược', catId: 1 },
  ];

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const tab = tabs.find(t => t.key === activeTab);
        const data = await fetchMedicines(tab?.catId || 1);
        setProducts(data.slice(0, 10).map(mapProduct));
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [activeTab]);

  return (
    <section className="dongy-section">
      {/* Background decoration */}
      <div className="dongy-section-bg" aria-hidden="true">
        <span className="ds-leaf ds-leaf-1">🍃</span>
        <span className="ds-leaf ds-leaf-2">🌿</span>
        <span className="ds-leaf ds-leaf-3">🍀</span>
        <span className="ds-leaf ds-leaf-4">🌺</span>
        <span className="ds-leaf ds-leaf-5">🍃</span>
      </div>

      <div className="dongy-section-inner">
        {/* Header */}
        <div className="ds-header">
          <div className="ds-title-wrap">
            <div className="ds-ribbon">
              <Leaf size={14} /> Thảo Dược Cổ Truyền
            </div>
            <h2 className="ds-title">
              <span className="ds-title-accent">Đông Y</span> Chính Phẩm
              <Sparkles size={22} className="ds-sparkle" />
            </h2>
            <p className="ds-subtitle">
              Tinh hoa dược liệu thiên nhiên — Chắt lọc từ bài thuốc gia truyền hàng nghìn năm
            </p>
          </div>
          <a href="#" className="ds-view-all">
            Xem tất cả <ChevronRight size={16} />
          </a>
        </div>

        {/* Benefits bar */}
        <div className="ds-benefits">
          {BENEFITS.map((b, i) => (
            <div key={i} className="ds-benefit-item">
              <span className="ds-benefit-icon">{b.icon}</span>
              <div>
                <strong>{b.title}</strong>
                <span>{b.desc}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="ds-tabs">
          {tabs.map(tab => (
            <button
              key={tab.key}
              className={`ds-tab${activeTab === tab.key ? ' ds-tab--active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="ds-loading">
            <div className="ds-spinner" />
            <span>Đang tải dược liệu...</span>
          </div>
        ) : (
          <div className="ds-grid">
            {products.map(product => (
              <div key={product.id} className="ds-grid-item">
                <ProductCard product={product} onProductClick={onProductClick} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default DongYSection;
