import React, { useState } from 'react';
import { useCart } from '../../context/CartContext';
import { ShoppingCart, Star, Leaf, Eye } from 'lucide-react';
import './ProductCard.css';

// Danh sách từ khóa để xác định sản phẩm Đông Y
const DONG_Y_KEYWORDS = [
  'đông y', 'thảo dược', 'đông trùng', 'sâm', 'linh chi', 'đinh lăng',
  'tam thất', 'hà thủ ô', 'atiso', 'nghệ', 'gừng', 'mật ong', 'tràm',
  'cao', 'trà', 'hoàn', 'tán', 'thang', 'bạch quả', 'trinh nữ', 'ích mẫu',
  'ngũ gia bì', 'lục vị', 'bát vị', 'độc hoạt', 'tiêu dao', 'phong tê',
  'hoàng kỳ', 'diệp hạ châu', 'khổ qua', 'an cung', 'ngưu hoàng', 'kim tiền',
  'cà gai leo', 'dầu tràm'
];

const isDongY = (name = '', description = '') => {
  const text = (name + ' ' + description).toLowerCase();
  return DONG_Y_KEYWORDS.some(kw => text.includes(kw));
};

// Random rating 4.3 – 5.0 based on product id
const getStarRating = (id) => {
  const base = 43 + (id % 8);
  return (base / 10).toFixed(1);
};

const StarRating = ({ rating }) => {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <div className="pc-stars">
      {[1,2,3,4,5].map(i => (
        <Star
          key={i}
          size={11}
          className={i <= full ? 'star-full' : half && i === full + 1 ? 'star-half' : 'star-empty'}
        />
      ))}
      <span className="pc-rating-num">{rating}</span>
    </div>
  );
};

const ProductCard = ({ product, isFlashSale, onProductClick }) => {
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);
  const [hovered, setHovered] = useState(false);

  const dongy = isDongY(product.name, product.description);
  const rating = getStarRating(product.id || 42);

  const formatMaskedPrice = (price) => {
    if (!price) return '';
    const s = price.toString();
    if (s.length <= 5) return 'xx.x00đ';
    if (s.length === 6) return 'xxx.000đ';
    if (s.length >= 7) return 'x.xxx.000đ';
    return 'xx.xxxđ';
  };

  const handleAddToCart = () => {
    addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div
      className={`product-card${dongy ? ' product-card--dongy' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Đông Y glow border */}
      {dongy && <div className="pc-dongy-glow" />}

      {/* Badges */}
      <div className="product-badges">
        {product.discount && (
          <span className="badge-discount">-{product.discount}%</span>
        )}
        {dongy && (
          <span className="badge-dongy">
            <Leaf size={9} /> Đông Y
          </span>
        )}
        {product.requiresPrescription && (
          <span className="badge-rx">Kê đơn</span>
        )}
      </div>

      {/* Origin tag */}
      {product.origin && (
        <div className="pc-origin">
          <span className="pc-origin-dot" style={{
            background: product.origin.toLowerCase().includes('hàn') ? '#0066cc' :
                        product.origin.toLowerCase().includes('nhật') ? '#bc002d' : '#e8231c'
          }} />
          {product.origin}
        </div>
      )}

      {/* Image */}
      <div 
        className="product-image"
        onClick={onProductClick ? () => onProductClick(product) : undefined}
        style={onProductClick ? { cursor: 'pointer' } : {}}
      >
        <img src={product.image} alt={product.name} loading="lazy" />
        {hovered && !isFlashSale && (
          <div className="pc-image-overlay" onClick={(e) => e.stopPropagation()}>
            <button className="pc-quick-view" onClick={onProductClick ? () => onProductClick(product) : undefined}>
              <Eye size={14} /> Xem nhanh
            </button>
          </div>
        )}
        {dongy && (
          <div className="pc-herb-deco">🌿</div>
        )}
      </div>

      {/* Info */}
      <div className="product-info">
        <StarRating rating={rating} />
        <h3 
          className="product-name" 
          title={product.name}
          onClick={onProductClick ? () => onProductClick(product) : undefined}
          style={onProductClick ? { cursor: 'pointer' } : {}}
        >{product.name}</h3>
        {product.packaging && (
          <p className="pc-packaging">{product.packaging}</p>
        )}

        <div className="product-price-container">
          {product.priceStatus === 'contact' || product.price === null || product.price === undefined ? (
            <span className="price-contact-badge" style={{ color: '#d97706', backgroundColor: '#fef3c7', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              📞 Liên hệ
            </span>
          ) : (
            <>
              <span className="product-price">
                {product.price?.toLocaleString('vi-VN') + 'đ'}
                {!isFlashSale && <span className="pc-unit">/{product.unit || 'Hộp'}</span>}
              </span>
              {product.oldPrice != null && (
                <span className="product-old-price">
                  {product.oldPrice?.toLocaleString('vi-VN')}đ
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Action */}
      {!isFlashSale && (
        <div className="product-action">
          {product.priceStatus === 'contact' || product.price === null || product.price === undefined ? (
            <button
              className="btn-contact-pharmacist"
              onClick={(e) => {
                e.stopPropagation();
                window.dispatchEvent(new CustomEvent('open-pharmacy-chat-widget', {
                  detail: { initialMessage: `Tôi muốn hỏi giá và mua vị thuốc: ${product.name}` }
                }));
              }}
              style={{
                background: 'linear-gradient(135deg, #059669, #10b981)',
                color: '#ffffff',
                width: '100%',
                border: 'none',
                padding: '8px 12px',
                borderRadius: '20px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)'
              }}
            >
              💬 Liên hệ Dược sĩ
            </button>
          ) : product.stockQuantity <= 0 ? (
            <button
              className="btn-add-cart"
              disabled
              style={{ background: '#cccccc', color: '#666666', cursor: 'not-allowed', width: '100%', border: 'none', padding: '8px 12px', borderRadius: '20px', fontWeight: 'bold' }}
            >
              Hết hàng
            </button>
          ) : (
            <button
              className={`btn-add-cart${added ? ' btn-add-cart--added' : ''}${dongy ? ' btn-add-cart--dongy' : ''}`}
              onClick={handleAddToCart}
            >
              {added ? (
                <>✓ Đã thêm</>
              ) : (
                <><ShoppingCart size={14} /> Chọn mua</>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductCard;
