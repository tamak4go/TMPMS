import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, Clock3, Home, ReceiptText, RefreshCw } from 'lucide-react';
import { verifyPayOSPayment } from '../services/api';
import './PaymentResultView.css';

const PaymentResultView = ({ orderCode, onNavigate }) => {
  const [result, setResult] = useState({ status: 'loading', message: 'Đang xác nhận giao dịch với PayOS.' });
  const startedRef = useRef(false);

  const verifyPayment = useCallback(async () => {
    setResult({ status: 'loading', message: 'Đang xác nhận giao dịch với PayOS.' });
    try {
      const data = await verifyPayOSPayment(orderCode);
      if (data.paymentStatus === 'Paid') {
        setResult({ status: 'success', message: 'Thanh toán đã được xác nhận. Đơn hàng đang chờ nhà thuốc xử lý.' });
      } else if (data.status === 'CANCELLED' || data.status === 'EXPIRED') {
        setResult({ status: 'failed', message: 'Giao dịch đã bị hủy hoặc liên kết thanh toán đã hết hạn.' });
      } else {
        setResult({ status: 'pending', message: 'PayOS chưa ghi nhận thanh toán. Bạn có thể kiểm tra lại sau ít phút.' });
      }
    } catch (error) {
      setResult({ status: 'failed', message: error.message || 'Không thể kiểm tra giao dịch PayOS.' });
    }
  }, [orderCode]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    window.history.replaceState({}, document.title, window.location.pathname);
    verifyPayment();
  }, [verifyPayment]);

  const content = {
    loading: { icon: RefreshCw, title: 'Đang xác nhận thanh toán', label: 'Vui lòng chờ', tone: 'processing' },
    success: { icon: Check, title: 'Thanh toán thành công', label: 'Đã thanh toán', tone: 'success' },
    failed: { icon: AlertTriangle, title: 'Thanh toán chưa thành công', label: 'Chưa thanh toán', tone: 'failed' },
    pending: { icon: Clock3, title: 'Giao dịch đang xử lý', label: 'Đang chờ', tone: 'pending' }
  }[result.status];

  const StatusIcon = content.icon;

  return (
    <section className={`payment-result-page payment-result-page--${content.tone}`} aria-live="polite">
      <div className="payment-result-shell">
        <div className="payment-result-status">
          <div className={`payment-result-icon ${result.status === 'loading' ? 'is-loading' : ''}`}>
            <StatusIcon size={34} strokeWidth={2.2} />
          </div>
          <span className="payment-result-label">{content.label}</span>
          <h1>{content.title}</h1>
          <p>{result.message}</p>
        </div>

        <div className="payment-result-order">
          <div>
            <span>Mã đơn hàng</span>
            <strong>#{orderCode}</strong>
          </div>
          <div>
            <span>Phương thức</span>
            <strong>PayOS</strong>
          </div>
        </div>

        <div className="payment-result-actions">
          {result.status === 'failed' || result.status === 'pending' ? (
            <button type="button" className="payment-result-btn payment-result-btn--primary" onClick={verifyPayment}>
              <RefreshCw size={18} /> Kiểm tra lại
            </button>
          ) : (
            <button type="button" className="payment-result-btn payment-result-btn--primary" onClick={() => onNavigate('history')}>
              <ReceiptText size={18} /> Xem đơn hàng
            </button>
          )}
          <button type="button" className="payment-result-btn payment-result-btn--secondary" onClick={() => onNavigate('home')}>
            <Home size={18} /> Về trang chủ
          </button>
        </div>

        <p className="payment-result-help">
          Nếu tiền đã bị trừ nhưng trạng thái chưa cập nhật, vui lòng đợi vài phút rồi kiểm tra lại.
        </p>
      </div>
    </section>
  );
};

export default PaymentResultView;
