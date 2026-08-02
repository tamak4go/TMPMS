import { useState, useEffect } from 'react';
import { X, Plus, Minus, Trash2, ShoppingBag, MapPin, Truck, Ticket, CreditCard } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';
import './CartDrawer.css';

const PICKUP_STORES = [
  'Trung tâm 102 Cầu Giấy, Hà Nội',
  'Trung tâm 54 Chùa Bộc, Đống Đa, Hà Nội',
  'Trung tâm 12 Nguyễn Huệ, Quận 1, TP. HCM',
  'Trung tâm 52 Nguyễn Văn Linh, Hải Châu, Đà Nẵng'
];

const CartDrawer = ({ isOpen, onClose, onOpenAuth }) => {
  const { cartItems, updateQuantity, removeFromCart, clearCart } = useCart();
  const { user } = useAuth();
  
  const [checkoutMode, setCheckoutMode] = useState(false);
  const [deliveryMode, setDeliveryMode] = useState('shipping'); // shipping or pickup
  const [pickupStore, setPickupStore] = useState(PICKUP_STORES[0]);
  
  // Recipient details (supports guest/logged-in user)
  const [recipientName, setRecipientName] = useState(user?.username || '');
  const [recipientPhone, setRecipientPhone] = useState(user?.phone || '');
  const [addressDetail, setAddressDetail] = useState('');
  
  // Voucher states
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState(null); // { code, discount }
  const [voucherError, setVoucherError] = useState('');
  const [voucherSuccess, setVoucherSuccess] = useState('');

  // Payment states
  const [paymentMethod, setPaymentMethod] = useState('COD'); // COD, PAYOS

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Chờ đăng nhập xong để tự động tiếp tục thanh toán (null | 'checkout' | 'submit')
  const [loginRedirectAction, setLoginRedirectAction] = useState(null);

  const [shippingFee, setShippingFee] = useState(0);
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    if (!checkoutMode) return;
    
    const calculateFee = async () => {
      try {
        const addr = deliveryMode === 'shipping' ? addressDetail : pickupStore;
        if (deliveryMode === 'shipping' && !addressDetail.trim()) {
          setShippingFee(0);
          setDistance(0);
          return;
        }
        const data = await api.calculateShipping(addr, deliveryMode);
        setShippingFee(data.shippingFee);
        setDistance(data.distance);
      } catch (err) {
        console.error("Error calculating shipping:", err);
      }
    };

    const delayDebounce = setTimeout(() => {
      calculateFee();
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [addressDetail, pickupStore, deliveryMode, checkoutMode]);

  // Sau khi đăng nhập thành công (từ modal login), tự động tiếp tục thanh toán
  useEffect(() => {
    if (!loginRedirectAction || !user) return;
    const action = loginRedirectAction;
    setTimeout(() => {
      setLoginRedirectAction(null);
      setRecipientName(user.username || '');
      setRecipientPhone(user.phone || '');
      if (action === 'checkout') {
        setCheckoutMode(true);
      }
    }, 0);
  }, [loginRedirectAction, user]);

  if (!isOpen) return null;

  const rxItems = cartItems.filter(item => item.requiresPrescription);
  const otcItems = cartItems.filter(item => !item.requiresPrescription);

  const totalAmount = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  
  // Calculate voucher discount
  let discountAmount = 0;
  if (appliedVoucher) {
    if (appliedVoucher.code === 'THAIMINH50') {
      discountAmount = 50000;
    } else if (appliedVoucher.code === 'LONGCHAU10') {
      discountAmount = Math.round(totalAmount * 0.1);
    } else if (appliedVoucher.code === 'FREESHIP') {
      discountAmount = 20000;
    }
  }
  const finalAmount = Math.max(0, totalAmount + shippingFee - discountAmount);

  const formatPrice = (price) => {
    if (price == null) return 'Liên hệ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  // Bắt buộc đăng nhập trước khi thanh toán: mở modal login, sau khi đăng nhập
  // thành công tự động mở form thanh toán để tiếp tục.
  const requireLogin = () => {
    setLoginRedirectAction('checkout');
    if (onOpenAuth) onOpenAuth();
    else window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: 'login' }));
  };

  const handleCheckoutClick = () => {
    setError('');
    if (!user) {
      requireLogin();
      return;
    }
    // Pre-populate user details if logged in
    setRecipientName(user.username || '');
    setRecipientPhone(user.phone || '');
    setCheckoutMode(true);
  };

  // Voucher apply
  const handleApplyVoucher = (e) => {
    e.preventDefault();
    setVoucherError('');
    setVoucherSuccess('');
    const code = voucherCode.trim().toUpperCase();
    if (!code) return;

    if (code === 'THAIMINH50') {
      setAppliedVoucher({ code, discount: 50000 });
      setVoucherSuccess('Áp dụng mã THAIMINH50 thành công: Giảm 50.000đ');
    } else if (code === 'LONGCHAU10') {
      setAppliedVoucher({ code, discount: Math.round(totalAmount * 0.1) });
      setVoucherSuccess('Áp dụng mã LONGCHAU10 thành công: Giảm 10%');
    } else if (code === 'FREESHIP') {
      setAppliedVoucher({ code, discount: 20000 });
      setVoucherSuccess('Áp dụng mã FREESHIP thành công: Miễn phí vận chuyển (-20.000đ)');
    } else {
      setVoucherError('Mã giảm giá không hợp lệ hoặc đã hết hạn.');
      setAppliedVoucher(null);
    }
  };

  const triggerOrderCreation = async () => {
    if (!user) {
      requireLogin();
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Build composite address depending on delivery mode
      let compositeAddress = '';
      if (deliveryMode === 'shipping') {
        compositeAddress = `[GIAO TẬN NƠI] Người nhận: ${recipientName} | SĐT: ${recipientPhone} | Địa chỉ: ${addressDetail}`;
      } else {
        compositeAddress = `[NHẬN TẠI NHÀ THUỐC] Cửa hàng: ${pickupStore} | Người nhận: ${recipientName} | SĐT: ${recipientPhone}`;
      }

      const orderPayload = {
        userId: user.id,
        totalAmount: finalAmount,
        shippingAddress: compositeAddress,
        paymentMethod: paymentMethod,
        deliveryMethod: deliveryMode === 'shipping' ? 'Giao hàng hỏa tốc (Ship 2 Giờ)' : 'Nhận tại cửa hàng',
        shippingFee: shippingFee,
        items: cartItems.map(item => ({
          medicineId: item.id,
          quantity: item.quantity,
          price: item.price
        }))
      };

      const order = await api.createOrder(orderPayload);

      if (paymentMethod === 'PAYOS') {
        const baseUrl = window.location.origin;
        const paymentLink = await api.createPayOSPaymentLink(
          order.id,
          `${baseUrl}/?payment=success&orderCode=${order.id}`,
          `${baseUrl}/?payment=cancelled&orderCode=${order.id}`
        );
        clearCart();
        window.location.assign(paymentLink.checkoutUrl);
        return;
      }

      clearCart();
      setSuccessMsg('Đặt hàng thành công! Đơn hàng của bạn đã được chuyển cho dược sĩ xử lý.');
      setCheckoutMode(false);
      setAddressDetail('');
      setAppliedVoucher(null);
      setVoucherCode('');
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 3500);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Không thể tạo đơn hàng. Vui lòng kiểm tra lại kết nối!');
    } finally {
      setLoading(false);
    }
  };

  const handleOrderSubmit = (e) => {
    e.preventDefault();
    if (!recipientName.trim() || !recipientPhone.trim()) {
      setError('Vui lòng điền Họ tên và Số điện thoại người nhận!');
      return;
    }
    if (deliveryMode === 'shipping' && !addressDetail.trim()) {
      setError('Vui lòng nhập địa chỉ giao hàng chi tiết!');
      return;
    }

    triggerOrderCreation();
  };

  return (
    <div className="cart-drawer-overlay" onClick={onClose}>
      <div className="cart-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="cart-drawer-header">
          <div className="cart-header-title">
            <ShoppingBag size={20} className="cart-title-icon" />
            <span>Giỏ Hàng của bạn</span>
            <span className="cart-badge-count">({cartItems.length})</span>
          </div>
          <button className="cart-drawer-close" onClick={onClose} title="Đóng giỏ hàng">
            <X size={22} />
          </button>
        </div>

        {/* Body */}
        <div className="cart-drawer-body">
          {successMsg ? (
            <div className="cart-success-view">
              <div className="success-icon-badge">✓</div>
              <h3>Đặt Hàng Thành Công!</h3>
              <p>{successMsg}</p>
              <p className="success-sub">Dược sĩ của chúng tôi sẽ gọi điện xác nhận đơn hàng của bạn trong vòng 5 phút.</p>
              <button className="success-btn" onClick={onClose}>Tiếp tục mua sắm</button>
            </div>
          ) : checkoutMode ? (
            /* Checkout Form */
            <form className="checkout-form" onSubmit={handleOrderSubmit}>
              <h3 className="checkout-section-title">Thông tin nhận hàng</h3>
              {error && <div className="checkout-error">{error}</div>}

              {/* Delivery method toggle */}
              <div className="delivery-toggle-container">
                <button 
                  type="button" 
                  className={`toggle-btn ${deliveryMode === 'shipping' ? 'active' : ''}`}
                  onClick={() => setDeliveryMode('shipping')}
                >
                  <Truck size={16} />
                  <span>Giao hàng hỏa tốc (Ship 2 Giờ)</span>
                </button>
                <button 
                  type="button" 
                  className={`toggle-btn ${deliveryMode === 'pickup' ? 'active' : ''}`}
                  onClick={() => setDeliveryMode('pickup')}
                >
                  <MapPin size={16} />
                  <span>Nhận tại cửa hàng</span>
                </button>
              </div>
              
              {/* Contact info */}
              <div className="checkout-field-row">
                <div className="checkout-field">
                  <label className="checkout-label">Họ và tên người nhận *</label>
                  <input 
                    type="text" 
                    className="checkout-input" 
                    required 
                    placeholder="Nhập họ tên người nhận"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                  />
                </div>
                <div className="checkout-field">
                  <label className="checkout-label">Số điện thoại *</label>
                  <input 
                    type="tel" 
                    className="checkout-input" 
                    required 
                    placeholder="Nhập số điện thoại nhận hàng"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                  />
                </div>
              </div>

              {/* Conditional address selection */}
              {deliveryMode === 'shipping' ? (
                <div className="checkout-field">
                  <label className="checkout-label">Địa chỉ giao hàng chi tiết *</label>
                  <textarea 
                    className="checkout-textarea" 
                    required
                    placeholder="Nhập số nhà, tên đường, phường/xã, quận/huyện..."
                    value={addressDetail}
                    onChange={(e) => setAddressDetail(e.target.value)}
                  />
                </div>
              ) : (
                <div className="checkout-field animate-fade-in">
                  <label className="checkout-label">Lựa chọn cửa hàng nhận hàng *</label>
                  <select 
                    className="checkout-select"
                    value={pickupStore}
                    onChange={(e) => setPickupStore(e.target.value)}
                  >
                    {PICKUP_STORES.map((store, index) => (
                      <option key={index} value={store}>{store}</option>
                    ))}
                  </select>
                  <span className="pickup-notice">💡 Vui lòng qua cửa hàng nhận thuốc sau 30 phút kể từ khi xác nhận.</span>
                </div>
              )}

              {/* Voucher section */}
              <div className="checkout-voucher-section">
                <label className="checkout-label"><Ticket size={14} /> Mã giảm giá (Voucher)</label>
                <div className="voucher-input-wrap">
                  <input 
                    type="text" 
                    placeholder="Nhập mã (THAIMINH50, LONGCHAU10, FREESHIP)"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value)}
                  />
                  <button type="button" onClick={handleApplyVoucher}>Áp dụng</button>
                </div>
                {voucherError && <span className="voucher-err-text">{voucherError}</span>}
                {voucherSuccess && <span className="voucher-success-text">{voucherSuccess}</span>}
              </div>

              {/* Payment methods */}
              <div className="checkout-field">
                <label className="checkout-label"><CreditCard size={14} /> Phương thức thanh toán</label>
                <div className="payment-options">
                  <label className={`payment-option-card ${paymentMethod === 'COD' ? 'active' : ''}`}>
                    <input 
                      type="radio" 
                      name="payment_method" 
                      value="COD"
                      checked={paymentMethod === 'COD'}
                      onChange={() => setPaymentMethod('COD')} 
                    />
                    <div>
                      <span className="option-title">Thanh toán khi nhận hàng (COD)</span>
                      <span className="option-desc">Thanh toán tiền mặt khi giao hàng.</span>
                    </div>
                  </label>
                  
                  <label className={`payment-option-card ${paymentMethod === 'PAYOS' ? 'active' : ''}`}>
                    <input 
                      type="radio" 
                      name="payment_method" 
                      value="PAYOS"
                      checked={paymentMethod === 'PAYOS'}
                      onChange={() => setPaymentMethod('PAYOS')}
                    />
                    <div>
                      <span className="option-title">Thanh toán online qua PayOS</span>
                      <span className="option-desc">Quét VietQR hoặc thanh toán trên trang bảo mật của PayOS.</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Price summary table */}
              <div className="checkout-summary-box">
                <div className="price-calc-row">
                  <span>Tổng tiền hàng:</span>
                  <span>{formatPrice(totalAmount)}</span>
                </div>
                {deliveryMode === 'shipping' && (
                  <div className="price-calc-row animate-fade-in">
                    <span>Phí vận chuyển ({distance}km):</span>
                    <span>{shippingFee > 0 ? formatPrice(shippingFee) : 'Đang tính...'}</span>
                  </div>
                )}
                {discountAmount > 0 && (
                  <div className="price-calc-row discount animate-fade-in">
                    <span>Giảm giá Voucher:</span>
                    <span>-{formatPrice(discountAmount)}</span>
                  </div>
                )}
                <div className="price-calc-row grand-total">
                  <span>Cần thanh toán:</span>
                  <span className="summary-total">{formatPrice(finalAmount)}</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="checkout-actions">
                <button type="button" className="checkout-back-btn" onClick={() => setCheckoutMode(false)}>
                  Quay lại giỏ hàng
                </button>
                <button type="submit" className="checkout-submit-btn" disabled={loading}>
                  {loading ? 'Đang xử lý...' : 'Xác nhận đặt hàng'}
                </button>
              </div>
            </form>
          ) : cartItems.length === 0 ? (
            /* Empty Cart */
            <div className="cart-empty-view">
              <ShoppingBag size={64} className="empty-cart-icon" />
              <h3>Giỏ hàng của bạn đang trống</h3>
              <p>Hãy chọn thêm các sản phẩm thảo dược và thuốc Đông y chất lượng cao.</p>
              <button className="empty-cart-btn" onClick={onClose}>Mua sắm ngay</button>
            </div>
          ) : (
            /* Cart List */
            <div className="cart-items-list">
              {error && <div className="checkout-error">{error}</div>}
              {otcItems.map((item) => (
                <div key={item.id} className="cart-item-card">
                  <img src={api.formatImageUrl(item.imageUrl)} alt={item.name} className="cart-item-img" onError={(e) => { e.target.onerror = null; e.target.src = api.FALLBACK_MED_IMG; }} />
                  <div className="cart-item-info">
                    <span className="cart-item-name">{item.name}</span>
                    <span className="cart-item-price">{formatPrice(item.price)}</span>
                    <div className="cart-item-actions">
                      <div className="quantity-controls">
                        <button className="qty-btn" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                          <Minus size={12} />
                        </button>
                        <span className="qty-val">{item.quantity}</span>
                        <button className="qty-btn" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                          <Plus size={12} />
                        </button>
                      </div>
                      <button className="item-delete-btn" onClick={() => removeFromCart(item.id)} title="Xóa khỏi giỏ hàng">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {rxItems.length > 0 && (
                <div className="cart-rx-group">
                  <div className="cart-rx-group-header">
                    <span className="cart-rx-badge">💊 Thuốc kê đơn</span>
                    <span className="cart-rx-note">Số lượng giới hạn theo đơn thuốc đã duyệt</span>
                  </div>
                  {rxItems.map((item) => {
                    const atLimit = item.allowedQuantity != null && item.quantity >= item.allowedQuantity;
                    return (
                      <div key={item.id} className="cart-item-card">
                        <img src={api.formatImageUrl(item.imageUrl)} alt={item.name} className="cart-item-img" onError={(e) => { e.target.onerror = null; e.target.src = api.FALLBACK_MED_IMG; }} />
                        <div className="cart-item-info">
                          <span className="cart-item-name">{item.name}</span>
                          <span className="cart-item-price">{formatPrice(item.price)}</span>
                          <div className="cart-item-actions">
                            <div className="quantity-controls">
                              <button className="qty-btn" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                                <Minus size={12} />
                              </button>
                              <span className="qty-val">{item.quantity}</span>
                              <button
                                className="qty-btn"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                disabled={atLimit}
                                title={atLimit ? 'Đã đạt liều lượng tối đa trong đơn thuốc' : 'Tăng số lượng'}
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                            <button className="item-delete-btn" onClick={() => removeFromCart(item.id)} title="Xóa khỏi giỏ hàng">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer for Cart list mode */}
        {!checkoutMode && cartItems.length > 0 && !successMsg && (
          <div className="cart-drawer-footer">
            <div className="cart-subtotal-row">
              <span className="subtotal-label">Tổng tiền tạm tính:</span>
              <span className="subtotal-val">{formatPrice(totalAmount)}</span>
            </div>
            <button className="cart-checkout-btn" onClick={handleCheckoutClick}>
              Tiến hành thanh toán
            </button>
          </div>
        )}
      </div>

    </div>
  );
};

export default CartDrawer;
