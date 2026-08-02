import React, { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import { useCart } from '../context/CartContext';
import './ProductSection.css';

const ProductCard = ({ product, onProductClick }) => {
  const { addToCart } = useCart();
  const [selectedUnit, setSelectedUnit] = useState(0);

  const units = product.units || [{ label: product.unit, price: product.price, oldPrice: product.oldPrice }];
  const current = units[selectedUnit];

  return (
    <div className="pc-card">
      {/* Badges */}
      {product.discount && <span className="pc-badge-disc">-{product.discount}%</span>}
      {product.isNew && <span className="pc-badge-new">MỚI</span>}

      {/* Origin */}
      {product.origin && (
        <div className="pc-origin">
          <span className="pc-origin-dot" style={{ background: product.originColor || '#e1251b' }} />
          {product.origin}
        </div>
      )}

      {/* Image */}
      <div className="pc-img-wrap" onClick={onProductClick ? () => onProductClick(product) : undefined} style={onProductClick ? {cursor: 'pointer'} : {}}>
        <img src={product.image} alt={product.name} loading="lazy" />
      </div>

      {/* Name */}
      <p className="pc-name" onClick={onProductClick ? () => onProductClick(product) : undefined} style={onProductClick ? {cursor: 'pointer'} : {}}>{product.name}</p>

      {/* Unit toggle */}
      {units.length > 1 && (
        <div className="pc-unit-toggle">
          {units.map((u, i) => (
            <button
              key={u.label}
              className={`pc-unit-btn ${i === selectedUnit ? 'active' : ''}`}
              onClick={() => setSelectedUnit(i)}
            >{u.label}</button>
          ))}
        </div>
      )}

      {/* Price */}
      <div className="pc-price-row">
        <span className="pc-price">{current.price != null ? `${current.price.toLocaleString('vi-VN')}đ` : 'Liên hệ'}</span>
        <span className="pc-unit-label">/{units.length > 1 ? units[selectedUnit].label : product.unit}</span>
      </div>
      {current.oldPrice != null && (
        <div className="pc-old-price">{current.oldPrice.toLocaleString('vi-VN')}đ</div>
      )}

      {/* Packaging info */}
      {product.packaging && <p className="pc-packaging">{product.packaging}</p>}

      {/* CTA */}
      {product.stockQuantity <= 0 ? (
        <button
          className="pc-cta"
          disabled
          style={{ background: '#cccccc', color: '#666666', cursor: 'not-allowed', width: '100%', border: 'none', borderRadius: '4px', padding: '8px 12px' }}
        >
          Hết hàng
        </button>
      ) : (
        <button className="pc-cta" onClick={() => addToCart({ ...product, price: current.price })}>
          Chọn mua
        </button>
      )}
    </div>
  );
};

const ProductSection = ({ title, products, viewAllLink = '#', bgColor, onProductClick }) => (
  <section className="ps-section" style={bgColor ? { background: bgColor } : {}}>
    <div className="ps-header">
      <div className="ps-title-wrap">
        <div className="ps-title-bar" />
        <h2 className="ps-title">{title}</h2>
      </div>
      <a href={viewAllLink} className="ps-view-all">Xem tất cả →</a>
    </div>
    <div className="ps-swiper-wrap">
      <Swiper modules={[Navigation]} spaceBetween={14} slidesPerView={5} navigation className="ps-swiper">
        {products.map(p => (
          <SwiperSlide key={p.id} style={{ height: 'auto' }}>
            <ProductCard product={p} onProductClick={onProductClick} />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  </section>
);

export default ProductSection;
export { ProductCard };
