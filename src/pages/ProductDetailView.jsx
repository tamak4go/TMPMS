import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { fetchProductReviews, checkReviewEligibility, submitProductReview } from '../services/api';
import './ProductDetailView.css';

const ProductDetailView = ({ product, onBack }) => {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [reviews, setReviews] = useState([]);
  const [isEligible, setIsEligible] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Review Form state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const userId = user?.user?.id || user?.id;

  useEffect(() => {
    if (!product) return;
    // Load reviews
    const loadReviews = async () => {
      try {
        setLoadingReviews(true);
        const data = await fetchProductReviews(product.id);
        setReviews(data);
      } catch (err) {
        console.error('Lỗi tải đánh giá:', err);
      } finally {
        setLoadingReviews(false);
      }
    };

    // Check review eligibility
    const checkEligibility = async () => {
      if (!userId) {
        setIsEligible(false);
        return;
      }
      try {
        const eligible = await checkReviewEligibility(product.id, userId);
        setIsEligible(eligible);
      } catch (err) {
        console.error('Lỗi kiểm tra điều kiện đánh giá:', err);
        setIsEligible(false);
      }
    };

    loadReviews();
    checkEligibility();
  }, [product?.id, userId]);

  if (!product) {
    return (
      <div className="pd-container">
        <p style={{ textAlign: 'center', padding: '40px 0', fontSize: '18px' }}>Không tìm thấy thông tin chi tiết sản phẩm.</p>
        <div style={{ textAlign: 'center' }}>
          <button onClick={onBack} style={{ padding: '8px 16px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Quay lại trang chủ</button>
        </div>
      </div>
    );
  }

  const displayPrice = product.price ? (typeof product.price === 'number' ? product.price : parseFloat(product.price) || 0) : 0;
  const displayOldPrice = product.oldPrice ? (typeof product.oldPrice === 'number' ? product.oldPrice : parseFloat(product.oldPrice) || 0) : null;

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addToCart(product);
    }
    // Show user some toast or visual feedback
    alert(`Đã thêm ${quantity} sản phẩm vào giỏ hàng thành công!`);
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) {
      setErrorMsg('Vui lòng nhập nội dung đánh giá.');
      return;
    }
    try {
      setSubmitLoading(true);
      setErrorMsg('');
      const newReview = await submitProductReview(rating, comment, product.id, userId);
      setReviews(prev => [newReview, ...prev]);
      setComment('');
      setRating(5);
      setSuccessMsg('Gửi đánh giá của bạn thành công! Cảm ơn bạn đã đóng góp ý kiến.');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setErrorMsg(err.message || 'Không thể gửi đánh giá.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length).toFixed(1) 
    : null;

  return (
    <div className="pd-container">
      {/* Breadcrumbs */}
      <div className="pd-breadcrumbs">
        <a href="#" onClick={(e) => { e.preventDefault(); onBack(); }}>Trang chủ</a>
        <span>&gt;</span>
        <span className="current">{product.name}</span>
      </div>

      {/* Main product details card */}
      <div className="pd-card">
        <div className="pd-left">
          <div className="pd-image-wrapper">
            <img src={product.image} alt={product.name} />
          </div>
        </div>

        <div className="pd-right">
          {product.requiresPrescription && (
            <span className="prescription-badge">💊 Thuốc kê đơn</span>
          )}
          <h1 className="pd-name">{product.name}</h1>
          <p className="pd-sku">Mã sản phẩm: SP-{product.id}</p>

          <div className="pd-price-card">
            {product.priceStatus === 'contact' || product.price === null || product.price === undefined ? (
              <div className="pd-price-row">
                <span className="pd-price" style={{ color: '#d97706', fontSize: '20px' }}>📞 Liên hệ Dược sĩ để nhận báo giá</span>
              </div>
            ) : (
              <>
                <div className="pd-price-row">
                  <span className="pd-price">{(displayPrice || 0).toLocaleString('vi-VN')}đ</span>
                  <span className="pd-unit">/ {product.unit}</span>
                </div>
                {displayOldPrice && (
                  <div className="pd-old-price-row">
                    <span className="pd-old-price">{displayOldPrice.toLocaleString('vi-VN')}đ</span>
                    <span className="pd-discount">-{product.discount}%</span>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="pd-meta-grid">
            <div className="pd-meta-item">
              <span className="meta-label">Xuất xứ</span>
              <span className="meta-value">{product.origin || 'Việt Nam'}</span>
            </div>
            <div className="pd-meta-item">
              <span className="meta-label">Quy cách</span>
              <span className="meta-value">{product.packaging || product.unit || 'Túi/Kg'}</span>
            </div>
          </div>

          <div style={{ margin: '15px 0', padding: '10px 15px', background: product.stockQuantity <= 0 ? '#fdf2f2' : '#f0fdf4', borderRadius: '8px', border: `1px solid ${product.stockQuantity <= 0 ? '#fde8e8' : '#dcfce7'}`, display: 'inline-block' }}>
            <span style={{ fontWeight: '600', color: product.stockQuantity <= 0 ? '#9b1c1c' : '#166534' }}>
              Trạng thái: {product.stockQuantity <= 0 ? 'Tạm hết hàng' : `Còn hàng (Tồn kho: ${product.stockQuantity})`}
            </span>
          </div>

          <div className="pd-action-row">
            {product.priceStatus === 'contact' || product.price === null || product.price === undefined ? (
              <button
                className="add-to-cart-btn"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('open-pharmacy-chat-widget', {
                    detail: { initialMessage: `Tôi muốn hỏi giá và mua vị thuốc: ${product.name}` }
                  }));
                }}
                style={{
                  background: 'linear-gradient(135deg, #059669, #10b981)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '24px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                }}
              >
                💬 Liên hệ Dược sĩ
              </button>
            ) : product.stockQuantity <= 0 ? (
              <button 
                className="add-to-cart-btn" 
                disabled 
                style={{ background: '#cccccc', color: '#666666', cursor: 'not-allowed', width: '100%', maxWidth: '250px' }}
              >
                Hết hàng trong kho
              </button>
            ) : (
              <>
                <div className="quantity-selector">
                  <button onClick={() => setQuantity(q => Math.max(1, q - 1))} disabled={quantity <= 1}>-</button>
                  <input 
                    type="number" 
                    value={quantity} 
                    onChange={(e) => setQuantity(Math.min(product.stockQuantity, Math.max(1, parseInt(e.target.value) || 1)))}
                  />
                  <button onClick={() => setQuantity(q => Math.min(product.stockQuantity, q + 1))} disabled={quantity >= product.stockQuantity}>+</button>
                </div>
                <button className="add-to-cart-btn" onClick={handleAddToCart}>
                  Chọn mua
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Description & Technical details */}
      <div className="pd-section mt-6">
        <h2 className="section-title">Mô tả sản phẩm</h2>
        <div className="pd-description">
          {product.description || 'Chưa có mô tả chi tiết cho sản phẩm này.'}
        </div>
      </div>

      {/* Reviews & Ratings Section */}
      <div className="pd-section mt-6">
        <h2 className="section-title">Khách hàng nhận xét</h2>
        
        <div className="reviews-summary-row">
          <div className="summary-left">
            <div className="avg-rating">{averageRating || '5.0'}</div>
            <div className="avg-stars">
              {Array.from({ length: 5 }).map((_, i) => (
                <span 
                  key={i} 
                  className={`star-icon ${i < Math.round(averageRating || 5) ? 'filled' : ''}`}
                >★</span>
              ))}
            </div>
            <p className="total-reviews">{reviews.length} đánh giá</p>
          </div>

          <div className="summary-right">
            {/* Eligibility Banner */}
            {!userId ? (
              <div className="eligibility-banner info">
                🔒 Vui lòng <strong>đăng nhập</strong> để đánh giá sản phẩm này.
              </div>
            ) : !isEligible ? (
              <div className="eligibility-banner warning">
                ⚠️ Bạn chỉ có thể đánh giá sản phẩm này sau khi **đã mua và thanh toán thành công** đơn hàng chứa sản phẩm này.
              </div>
            ) : (
              <div className="eligibility-banner success">
                ✅ Bạn đã mua sản phẩm này! Hãy để lại cảm nhận của mình bên dưới nhé.
              </div>
            )}
          </div>
        </div>

        {/* Review Form - Display only if eligible */}
        {userId && isEligible && (
          <form className="review-form" onSubmit={handleReviewSubmit}>
            <h3>Viết nhận xét của bạn</h3>
            
            <div className="form-group">
              <label>Đánh giá sao:</label>
              <div className="rating-select">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    className={`star-select ${i < rating ? 'active' : ''}`}
                    onClick={() => setRating(i + 1)}
                  >★</span>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="comment">Nhận xét chi tiết:</label>
              <textarea
                id="comment"
                rows="4"
                placeholder="Chia sẻ trải nghiệm sử dụng sản phẩm của bạn tại đây..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>

            {errorMsg && <div className="error-alert">{errorMsg}</div>}
            {successMsg && <div className="success-alert">{successMsg}</div>}

            <button type="submit" className="submit-review-btn" disabled={submitLoading}>
              {submitLoading ? 'Đang gửi...' : 'Gửi nhận xét'}
            </button>
          </form>
        )}

        {/* Reviews List */}
        <div className="reviews-list">
          <h3>Nhận xét từ khách hàng ({reviews.length})</h3>
          
          {loadingReviews ? (
            <p className="reviews-loading">Đang tải các đánh giá...</p>
          ) : reviews.length === 0 ? (
            <p className="no-reviews">Chưa có đánh giá nào cho sản phẩm này.</p>
          ) : (
            reviews.map(r => (
              <div key={r.id} className="review-item">
                <div className="review-header">
                  <span className="reviewer-name">{r.username}</span>
                  <span className="review-date">{new Date(r.createdAt).toLocaleDateString('vi-VN')}</span>
                </div>
                <div className="review-rating">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span 
                      key={i} 
                      className={`star-icon ${i < r.rating ? 'filled' : ''}`}
                    >★</span>
                  ))}
                </div>
                <p className="review-comment">{r.comment}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetailView;
