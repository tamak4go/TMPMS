import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import * as api from '../services/api';
import OrderTrackingView from '../components/OrderTrackingView';
import './HistoryView.css';

const STATUS_TABS = [
  { key: 'all', label: 'Tất cả', icon: '📋' },
  { key: 'pending', label: 'Đang xử lý', icon: '🕓' },
  { key: 'shipping', label: 'Đang giao', icon: '🚚' },
  { key: 'delivered', label: 'Đã giao', icon: '✅' },
  { key: 'cancelled', label: 'Đã hủy', icon: '🗑️' },
  { key: 'returned', label: 'Trả hàng', icon: '🔄' }
];

const STATUS_LABELS = {
  Pending: 'Chờ duyệt',
  Shipping: 'Đang giao',
  Delivered: 'Đã giao',
  Cancelled: 'Đã hủy',
  ReturnRequested: 'Chờ duyệt trả hàng',
  Returned: 'Đã trả hàng'
};

const HistoryView = () => {
  const { user } = useAuth();
  const { refreshCart } = useCart();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [activeTrackingOrder, setActiveTrackingOrder] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [returnOrder, setReturnOrder] = useState(null);
  const [returnReason, setReturnReason] = useState('');
  const [invoiceModalData, setInvoiceModalData] = useState(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  const loadOrders = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError('');
      const data = await api.fetchUserOrders(user.id);
      setOrders(data);
    } catch (err) {
      console.error(err);
      setError('Không thể tải lịch sử mua hàng.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    if (activeTab === 'all') return orders;
    if (activeTab === 'pending') return orders.filter(o => o.status === 'Pending');
    if (activeTab === 'shipping') return orders.filter(o => o.status === 'Shipping');
    if (activeTab === 'delivered') return orders.filter(o => o.status === 'Delivered');
    if (activeTab === 'cancelled') return orders.filter(o => o.status === 'Cancelled');
    if (activeTab === 'returned') return orders.filter(o => o.status === 'Returned' || o.status === 'ReturnRequested');
    return orders;
  }, [orders, activeTab]);

  const tabCounts = useMemo(() => ({
    all: orders.length,
    pending: orders.filter(o => o.status === 'Pending').length,
    shipping: orders.filter(o => o.status === 'Shipping').length,
    delivered: orders.filter(o => o.status === 'Delivered').length,
    cancelled: orders.filter(o => o.status === 'Cancelled').length,
    returned: orders.filter(o => o.status === 'Returned' || o.status === 'ReturnRequested').length
  }), [orders]);

  const formatPrice = (price) => {
    if (price == null) return 'Liên hệ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const cls = (status || '').toLowerCase() === 'returnrequested' ? 'return-requested' : (status || '').toLowerCase();
    return <span className={`status-badge ${cls}`}>{STATUS_LABELS[status] || status}</span>;
  };

  const getPaymentStatusBadge = (status) => {
    switch (status) {
      case 'Unpaid':
        return <span className="payment-badge unpaid">Chưa thanh toán</span>;
      case 'Paid':
      case 'Success':
        return <span className="payment-badge paid">Đã thanh toán</span>;
      case 'Refunded':
        return <span className="payment-badge refunded">Đã hoàn tiền</span>;
      default:
        return <span className="payment-badge">{status}</span>;
    }
  };

  const handleViewInvoice = async (orderId) => {
    try {
      setInvoiceLoading(true);
      const data = await api.fetchInvoiceByOrder(orderId);
      setInvoiceModalData(data);
    } catch (err) {
      console.error(err);
      alert('Chưa thể lấy hóa đơn cho đơn hàng này: ' + (err.message || 'Lỗi server'));
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handleBuyAgain = async (order) => {
    if (!user) {
      alert('Vui lòng đăng nhập để mua lại.');
      return;
    }
    const items = (order.items || []).map(it => ({ medicineId: it.medicineId, quantity: it.quantity }));
    if (items.length === 0) {
      alert('Đơn hàng này không có sản phẩm nào để mua lại.');
      return;
    }
    setActionLoading({ id: order.id, type: 'buy' });
    try {
      await api.syncCart(user.id, items);
      await refreshCart();
      alert('Đã thêm các sản phẩm vào giỏ hàng. Kiểm tra giỏ hàng để đặt lại.');
    } catch (err) {
      console.error(err);
      alert('Không thể mua lại: ' + (err.message || 'Một số sản phẩm có thể đã ngừng bán hoặc hết hàng.'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelOrder = async (order) => {
    if (!window.confirm(`Hủy đơn hàng #${order.id}?\nHành động này không thể hoàn tác.`)) return;
    setActionLoading({ id: order.id, type: 'cancel' });
    try {
      await api.cancelOrder(order.id);
      await loadOrders();
      alert('Đơn hàng đã được hủy.');
    } catch (err) {
      console.error(err);
      alert('Không thể hủy đơn hàng: ' + (err.message || 'Lỗi server'));
    } finally {
      setActionLoading(null);
    }
  };

  const openReturnModal = (order) => {
    setReturnOrder(order);
    setReturnReason('');
  };

  const handleRequestReturn = async () => {
    if (!returnOrder) return;
    if (!returnReason.trim()) {
      alert('Vui lòng nhập lý do trả hàng.');
      return;
    }
    setActionLoading({ id: returnOrder.id, type: 'return' });
    try {
      await api.requestOrderReturn(returnOrder.id, returnReason.trim());
      setReturnOrder(null);
      setReturnReason('');
      await loadOrders();
      alert('Yêu cầu trả hàng đã được gửi. Nhà thuốc sẽ liên hệ xác nhận.');
    } catch (err) {
      console.error(err);
      alert('Không thể gửi yêu cầu trả hàng: ' + (err.message || 'Lỗi server'));
    } finally {
      setActionLoading(null);
    }
  };

  if (!user) {
    return (
      <div className="history-container error-view">
        <h2>Vui lòng đăng nhập để xem lịch sử mua hàng!</h2>
      </div>
    );
  }

  return (
    <div className="history-container">
      <div className="history-header">
        <h2 className="history-title">Lịch Sử Mua Hàng</h2>
        <p className="history-subtitle">Theo dõi và quản lý tất cả đơn hàng của bạn</p>
      </div>

      {/* Tabs */}
      <div className="history-tabs">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.key}
            className={`history-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
            <span className="tab-count">{tabCounts[tab.key]}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="history-loading">Đang tải lịch sử mua hàng của bạn...</div>
      ) : error ? (
        <div className="history-error-msg">{error}</div>
      ) : filteredOrders.length === 0 ? (
        <div className="history-empty">
          <div className="empty-box-icon">📦</div>
          <h3>Không có đơn hàng nào</h3>
          <p>Chưa có đơn hàng nào ở mục này. Hãy ghé thăm cửa hàng và đặt đơn đầu tiên của bạn.</p>
        </div>
      ) : (
        <div className="orders-list">
          {filteredOrders.map((order) => (
            <div key={order.id} className="order-history-card">
              <div className="order-card-header">
                <div className="order-meta-info">
                  <span className="order-id-tag">Mã đơn: #{order.id}</span>
                  <span className="order-date">{formatDate(order.createdAt)}</span>
                </div>
                <div className="order-badges">
                  {getStatusBadge(order.status)}
                  {getPaymentStatusBadge(order.paymentStatusDetail || order.paymentStatus)}
                </div>
              </div>

              <div className="order-card-body">
                {order.items && order.items.map((item) => (
                  <div key={item.id} className="order-item-row">
                    <img
                      src={item.imageUrl}
                      alt={item.medicineName}
                      className="order-item-pic"
                      onError={(e) => { e.target.onerror = null; e.target.src = api.FALLBACK_MED_IMG; }}
                    />
                    <div className="order-item-details">
                      <span className="order-item-name">{item.medicineName}</span>
                      <span className="order-item-qty-price">
                        Số lượng: <strong>{item.quantity}</strong> × {formatPrice(item.price)}
                      </span>
                    </div>
                    <span className="order-item-subtotal">
                      {item.price != null ? formatPrice(item.price * item.quantity) : 'Liên hệ'}
                    </span>
                  </div>
                ))}

                {(order.status === 'ReturnRequested' || order.status === 'Returned') && order.returnReason && (
                  <div className="return-reason-note">
                    <strong>Lý do trả hàng:</strong> {order.returnReason}
                  </div>
                )}
              </div>

              <div className="order-card-footer">
                <div className="order-shipping-address">
                  <strong>Địa chỉ giao hàng:</strong> {order.shippingAddress}
                </div>
                <div className="order-card-actions">
                  {(order.status === 'Pending' || order.status === 'Shipping' || order.status === 'Delivered') && (
                    <button
                      className="action-btn track-btn"
                      onClick={() => setActiveTrackingOrder(order)}
                    >
                      🏍️ Theo dõi
                    </button>
                  )}

                  {(order.status === 'Delivered' || order.status === 'Cancelled' || order.status === 'Returned' || order.status === 'ReturnRequested') && (
                    <button
                      className="action-btn buy-again-btn"
                      onClick={() => handleBuyAgain(order)}
                      disabled={actionLoading && actionLoading.id === order.id && actionLoading.type === 'buy'}
                    >
                      🔁 Mua lại
                    </button>
                  )}

                  {order.status === 'Delivered' && (
                    <button
                      className="action-btn return-btn"
                      onClick={() => openReturnModal(order)}
                    >
                      🔄 Trả hàng
                    </button>
                  )}

                  {order.status === 'Pending' && (
                    <button
                      className="action-btn cancel-btn"
                      onClick={() => handleCancelOrder(order)}
                      disabled={actionLoading && actionLoading.id === order.id && actionLoading.type === 'cancel'}
                    >
                      Hủy đơn
                    </button>
                  )}

                  <button
                    className="action-btn invoice-btn"
                    onClick={() => handleViewInvoice(order.id)}
                    disabled={invoiceLoading}
                  >
                    📄 Hóa đơn GTGT
                  </button>

                  <div className="order-total-block">
                    <span className="total-label">Tổng tiền:</span>
                    <span className="total-val">{formatPrice(order.totalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTrackingOrder && (
        <OrderTrackingView
          order={activeTrackingOrder}
          onClose={() => setActiveTrackingOrder(null)}
        />
      )}

      {/* Return Modal */}
      {returnOrder && (
        <div className="history-modal-backdrop">
          <div className="history-modal-card">
            <div className="history-modal-header">
              <h3>Yêu cầu trả hàng đơn #{returnOrder.id}</h3>
              <button className="history-modal-close" onClick={() => setReturnOrder(null)}>✕</button>
            </div>
            <p className="history-modal-sub">
              Vui lòng cho chúng tôi biết lý do bạn muốn trả hàng để nhà thuốc xử lý nhanh nhất.
            </p>
            <textarea
              className="return-reason-input"
              rows="4"
              placeholder="Nhập lý do trả hàng (bắt buộc)..."
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
            />
            <div className="history-modal-actions">
              <button className="action-btn cancel-btn" onClick={() => setReturnOrder(null)}>
                Đóng
              </button>
              <button
                className="action-btn return-btn solid"
                onClick={handleRequestReturn}
                disabled={actionLoading && actionLoading.type === 'return'}
              >
                {actionLoading && actionLoading.type === 'return' ? 'Đang gửi...' : 'Gửi yêu cầu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {invoiceModalData && (
        <div className="history-modal-backdrop">
          <div className="history-invoice-card">
            <div className="history-modal-header">
              <h3>🧾 HÓA ĐƠN GIÁ TRỊ GIA TĂNG (GTGT)</h3>
              <button className="history-modal-close" onClick={() => setInvoiceModalData(null)}>✕</button>
            </div>
            <div className="invoice-meta">
              <div><strong>Số hóa đơn:</strong> <span>{invoiceModalData.invoiceCode || invoiceModalData.InvoiceCode}</span></div>
              <div><strong>Ngày xuất:</strong> {formatDate(invoiceModalData.issuedAt || invoiceModalData.IssuedAt)}</div>
              <div><strong>Mã đơn hàng:</strong> #{invoiceModalData.orderId || invoiceModalData.OrderId}</div>
              <div><strong>Khách hàng:</strong> {invoiceModalData.customerName || invoiceModalData.CustomerName || user.username}</div>
              <div className="invoice-address"><strong>Địa chỉ nhận hàng:</strong> {invoiceModalData.shippingAddress || invoiceModalData.ShippingAddress}</div>
            </div>
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th className="center">SL</th>
                  <th className="right">Đơn giá</th>
                  <th className="right">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {(invoiceModalData.items || invoiceModalData.Items || []).map((it, idx) => (
                  <tr key={idx}>
                    <td>{it.medicineName || it.MedicineName}</td>
                    <td className="center">{it.quantity || it.Quantity}</td>
                    <td className="right">{formatPrice(it.price || it.Price)}</td>
                    <td className="right">{formatPrice((it.price || it.Price) * (it.quantity || it.Quantity))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="invoice-total">
              <span>Tổng thanh toán (Đã gồm thuế GTGT):</span>
              <strong>{formatPrice(invoiceModalData.totalAmount || invoiceModalData.TotalAmount)}</strong>
            </div>
            <div className="history-modal-actions">
              <button className="action-btn return-btn solid" onClick={() => setInvoiceModalData(null)}>
                Đóng Hóa Đơn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryView;
