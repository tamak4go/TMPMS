import React from 'react';
import './Footer.css';

const Footer = () => (
  <footer className="footer">
    <div className="footer-inner">
      <div className="footer-grid">
        {/* Column 1 */}
        <div className="footer-col">
          <div className="footer-logo">
            <img src="/logo.png" alt="TMPMS Logo" className="footer-logo-img" />
          </div>
          <p className="footer-desc">Hệ thống nhà thuốc chuẩn GPP - Uy tín - Chất lượng. Đủ thuốc, giá tốt, tư vấn tận tâm.</p>
          <div className="footer-ministry">
            <div className="ministry-badge">
              <span className="ministry-icon">🏛️</span>
              <div>
                <div className="ministry-title">Bộ Công Thương</div>
                <div className="ministry-sub">Đã thông báo</div>
              </div>
            </div>
            <div className="ministry-badge">
              <span className="ministry-icon">🛡️</span>
              <div>
                <div className="ministry-title">DMCA</div>
                <div className="ministry-sub">Protected</div>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2 */}
        <div className="footer-col">
          <h4 className="footer-col-title">VỀ CHÚNG TÔI</h4>
          <ul className="footer-links">
            {['Giới thiệu', 'Mua sắm cùng TMPMS', 'Điều khoản sử dụng', 'Chính sách bảo mật', 'Chính sách hoàn trả', 'Chính sách vận chuyển', 'Tra cứu hóa đơn điện tử', 'Tuyển dụng'].map(l => <li key={l}><a href="#">{l}</a></li>)}
          </ul>
        </div>

        {/* Column 3 */}
        <div className="footer-col">
          <h4 className="footer-col-title">TÌM HIỂU THÊM</h4>
          <ul className="footer-links">
            {['Bệnh & Góc sức khỏe', 'Tra cứu thuốc', 'Tra cứu dược chất', 'Kiểm tra tương tác thuốc', 'Danh sách bệnh viện', 'Trung tâm châm cứu', 'Câu hỏi thường gặp'].map(l => <li key={l}><a href="#">{l}</a></li>)}
          </ul>
        </div>

        {/* Column 4 */}
        <div className="footer-col">
          <h4 className="footer-col-title">TỔNG ĐÀI</h4>
          <ul className="footer-hotlines">
            <li><span className="hotline-label">Mua hàng & CSKH:</span><a href="tel:18006928" className="hotline-num">1800 6928</a></li>
            <li><span className="hotline-label">Châm cứu trị liệu:</span><a href="tel:18006928" className="hotline-num">1800 6928</a></li>
            <li><span className="hotline-label">Góp ý & Khiếu nại:</span><a href="tel:18006928" className="hotline-num">1800 6928</a></li>
          </ul>
          <p className="hotline-note">(Miễn phí, 8:00 – 22:00 kể cả lễ)</p>
          <p className="footer-address">🏢 Số 1 Võ Văn Ngân, P. Linh Chiểu, TP. Thủ Đức, TP. HCM</p>
        </div>

        {/* Column 5 */}
        <div className="footer-col">
          <h4 className="footer-col-title">KẾT NỐI VỚI CHÚNG TÔI</h4>
          <div className="footer-socials">
            <a href="#" className="social-btn fb">f Facebook</a>
            <a href="#" className="social-btn zalo">Zalo</a>
            <a href="#" className="social-btn yt">▶ YouTube</a>
          </div>
          <h4 className="footer-col-title" style={{ marginTop: '16px' }}>TẢI ỨNG DỤNG</h4>
          <div className="footer-app-btns">
            <a href="#" className="app-btn">
              <span className="app-icon">🍎</span>
              <div><span className="app-sub">Tải về trên</span><span className="app-name">App Store</span></div>
            </a>
            <a href="#" className="app-btn">
              <span className="app-icon">▶</span>
              <div><span className="app-sub">Tải về trên</span><span className="app-name">Google Play</span></div>
            </a>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="footer-bottom">
        <p>© 2025 Công ty Cổ phần Dược phẩm TMPMS. Mã số doanh nghiệp: 0316698720. Giấy phép kinh doanh dược liệu số 9975/HCM-BHYT.</p>
      </div>
    </div>
  </footer>
);

export default Footer;
