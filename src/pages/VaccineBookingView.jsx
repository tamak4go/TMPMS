import React, { useState } from 'react';
import { Calendar, User, Syringe, ChevronRight, CheckCircle2, ShieldAlert, MapPin, Clock } from 'lucide-react';
import './VaccineBookingView.css';

const VACCINES = [
  { id: 1, name: 'Vắc-xin Cúm Tứ Giá (Hà Lan/Pháp)', price: 350000, desc: 'Phòng ngừa 4 chủng cúm mùa nguy hiểm cho trẻ từ 6 tháng và người lớn.', age: 'Từ 6 tháng tuổi trở lên' },
  { id: 2, name: 'Vắc-xin HPV 9 Chủng (Mỹ)', price: 2950000, desc: 'Phòng ngừa ung thư cổ tử cung, âm đạo, sùi mào gà do virus HPV.', age: 'Từ 9 - 45 tuổi' },
  { id: 3, name: 'Vắc-xin Phế Cầu Synflorix (Bỉ)', price: 1290000, desc: 'Phòng viêm phổi, viêm màng não, viêm tai giữa do vi khuẩn phế cầu.', age: 'Từ 2 tháng - 5 tuổi' },
  { id: 4, name: 'Vắc-xin Tả hoại tử (Việt Nam)', price: 450000, desc: 'Phòng ngừa bệnh dịch tả lây qua đường tiêu hóa.', age: 'Trẻ em và người lớn' }
];

const VaccineBookingView = ({ onBack }) => {
  const [step, setStep] = useState(1);
  const [selectedVaccines, setSelectedVaccines] = useState([]);
  
  // Patient details
  const [patientName, setPatientName] = useState('');
  const [patientDob, setPatientDob] = useState('');
  const [patientGender, setPatientGender] = useState('Nam');
  const [patientPhone, setPatientPhone] = useState('');
  
  // Schedule
  const [bookingDate, setBookingDate] = useState('');
  const [bookingCenter, setBookingCenter] = useState('HN - 102 Cầu Giấy');
  
  const [bookingCode, setBookingCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSelectVaccine = (vaccine) => {
    setSelectedVaccines(prev => {
      if (prev.some(v => v.id === vaccine.id)) {
        return prev.filter(v => v.id !== vaccine.id);
      } else {
        return [...prev, vaccine];
      }
    });
  };

  const handleNextStep = () => {
    if (step === 1 && selectedVaccines.length === 0) {
      alert('Vui lòng lựa chọn ít nhất 1 gói vắc-xin để tiêm.');
      return;
    }
    if (step === 2 && (!patientName || !patientDob || !patientPhone)) {
      alert('Vui lòng điền đầy đủ Họ tên, Ngày sinh và SĐT người tiêm.');
      return;
    }
    if (step === 3 && !bookingDate) {
      alert('Vui lòng chọn ngày mong muốn tiêm vắc-xin.');
      return;
    }
    setStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    setStep(prev => prev - 1);
  };

  const handleBook = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const code = 'LCVC-' + Math.floor(10000 + Math.random() * 90000);
      setBookingCode(code);
      setStep(4);
    }, 1500);
  };

  const totalAmount = selectedVaccines.reduce((sum, v) => sum + v.price, 0);

  return (
    <div className="vc-booking-container">
      {/* Breadcrumbs */}
      <div className="vc-breadcrumbs">
        <a href="#" onClick={(e) => { e.preventDefault(); onBack(); }} className="vc-bc-home">Trang chủ</a>
        <ChevronRight size={14} className="vc-bc-sep" />
        <span className="vc-bc-current">Đăng ký tiêm chủng</span>
      </div>

      {/* Header */}
      <div className="vc-header">
        <Syringe size={28} className="vc-header-icon" />
        <div>
          <h2>Trung Tâm Tiêm Chủng Long Châu</h2>
          <p>Đặt lịch tiêm chủng trực tuyến an toàn, vắc-xin chính hãng, quy trình bảo quản đạt chuẩn GSP quốc tế</p>
        </div>
      </div>

      {/* Steps indicator */}
      {step < 4 && (
        <div className="vc-steps-indicator">
          <div className={`step-node ${step >= 1 ? 'active' : ''}`}>1. Chọn Vắc-xin</div>
          <div className="step-line" />
          <div className={`step-node ${step >= 2 ? 'active' : ''}`}>2. Thông tin người tiêm</div>
          <div className="step-line" />
          <div className={`step-node ${step >= 3 ? 'active' : ''}`}>3. Chọn lịch & Xác nhận</div>
        </div>
      )}

      <div className="vc-content-card">
        {step === 1 && (
          <div className="vc-step-view animate-fade-in">
            <h3 className="step-title">Bước 1: Lựa chọn danh mục Vắc-xin tiêm chủng</h3>
            <div className="vaccine-packages-grid">
              {VACCINES.map(v => {
                const isSelected = selectedVaccines.some(sv => sv.id === v.id);
                return (
                  <div 
                    key={v.id} 
                    className={`vaccine-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectVaccine(v)}
                  >
                    <div className="vc-card-header">
                      <h4>{v.name}</h4>
                      <span className="age-badge">{v.age}</span>
                    </div>
                    <p className="desc">{v.desc}</p>
                    <div className="vc-card-footer">
                      <span className="price">{v.price.toLocaleString('vi-VN')}đ</span>
                      <div className={`select-checkbox ${isSelected ? 'checked' : ''}`} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="vc-footer-actions">
              <button className="vc-btn-outline" onClick={onBack}>Quay lại trang chủ</button>
              <button className="vc-btn-primary" onClick={handleNextStep}>Tiếp tục bước 2 →</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="vc-step-view animate-fade-in">
            <h3 className="step-title">Bước 2: Điền thông tin người tiêm chủng</h3>
            <form className="vc-patient-form" onSubmit={(e) => { e.preventDefault(); handleNextStep(); }}>
              <div className="form-row">
                <div className="input-group">
                  <label>Họ và tên người tiêm *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Nhập tên người tiêm vắc-xin" 
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label>Số điện thoại liên hệ *</label>
                  <input 
                    type="tel" 
                    required 
                    placeholder="Nhập số điện thoại đăng ký" 
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="input-group">
                  <label>Ngày tháng năm sinh *</label>
                  <input 
                    type="date" 
                    required 
                    value={patientDob}
                    onChange={(e) => setPatientDob(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label>Giới tính *</label>
                  <select value={patientGender} onChange={(e) => setPatientGender(e.target.value)}>
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>
              </div>

              <div className="vc-footer-actions">
                <button type="button" className="vc-btn-outline" onClick={handlePrevStep}>← Quay lại Bước 1</button>
                <button type="submit" className="vc-btn-primary">Tiếp tục bước 3 →</button>
              </div>
            </form>
          </div>
        )}

        {step === 3 && (
          <div className="vc-step-view animate-fade-in">
            <h3 className="step-title">Bước 3: Lựa chọn cơ sở và lịch tiêm chủng</h3>
            <div className="step3-layout">
              {/* Select inputs */}
              <div className="selection-col">
                <div className="input-group">
                  <label><MapPin size={14} /> Trung tâm tiêm chủng gần nhất</label>
                  <select value={bookingCenter} onChange={(e) => setBookingCenter(e.target.value)}>
                    <option value="HN - 102 Cầu Giấy">Hà Nội - Trung tâm 102 Cầu Giấy</option>
                    <option value="HN - 54 Chùa Bộc">Hà Nội - Trung tâm 54 Chùa Bộc</option>
                    <option value="HCM - 12 Nguyễn Huệ">TP. HCM - Trung tâm 12 Nguyễn Huệ</option>
                    <option value="DN - 52 Nguyễn Văn Linh">Đà Nẵng - Trung tâm 52 Nguyễn Văn Linh</option>
                  </select>
                </div>
                <div className="input-group">
                  <label><Calendar size={14} /> Ngày mong muốn tiêm chủng</label>
                  <input 
                    type="date" 
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              {/* Order Info summary */}
              <div className="summary-col">
                <h4 className="summary-title">Tóm tắt lịch đăng ký</h4>
                <div className="summary-details">
                  <div className="sum-row">
                    <span>Người tiêm:</span>
                    <strong>{patientName}</strong>
                  </div>
                  <div className="sum-row">
                    <span>Vắc-xin chọn:</span>
                    <div className="sum-vax-list">
                      {selectedVaccines.map(v => (
                        <div key={v.id} className="sum-vax-item">💉 {v.name}</div>
                      ))}
                    </div>
                  </div>
                  <div className="sum-row border-top">
                    <span>Tổng tiền thanh toán tại cơ sở:</span>
                    <span className="total-price">{totalAmount.toLocaleString('vi-VN')}đ</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="vc-footer-actions">
              <button type="button" className="vc-btn-outline" onClick={handlePrevStep} disabled={loading}>← Quay lại Bước 2</button>
              <button type="button" className="vc-btn-primary" onClick={handleBook} disabled={loading}>
                {loading ? 'Đang gửi đăng ký...' : 'Xác nhận Đặt lịch tiêm ✔'}
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="vc-step-view success animate-fade-in text-center">
            <CheckCircle2 size={64} className="success-icon" />
            <h2>Đăng Ký Tiêm Chủng Thành Công!</h2>
            <p className="subtitle">Mã lịch hẹn của bạn là:</p>
            <div className="booking-code-box">{bookingCode}</div>
            
            <div className="booking-summary-success">
              <div className="detail-row">
                <span>Khách hàng:</span>
                <strong>{patientName}</strong>
              </div>
              <div className="detail-row">
                <span>Ngày hẹn tiêm:</span>
                <strong>{new Date(bookingDate).toLocaleDateString('vi-VN')}</strong>
              </div>
              <div className="detail-row">
                <span>Cơ sở tiêm:</span>
                <strong>{bookingCenter}</strong>
              </div>
              <div className="detail-row">
                <span>Gói Vắc-xin:</span>
                <div className="vax-sublist">
                  {selectedVaccines.map(v => (
                    <div key={v.id}>• {v.name}</div>
                  ))}
                </div>
              </div>
            </div>

            <div className="success-instructions">
              <ShieldAlert size={16} className="text-teal" />
              <span>Vui lòng mang theo CMTND/CCCD hoặc Giấy khai sinh của người tiêm kèm theo Mã lịch hẹn đến quầy lễ tân tiêm chủng đúng ngày đăng ký để khám sàng lọc miễn phí và tiêm phòng.</span>
            </div>

            <button className="vc-btn-primary back-home" onClick={onBack}>Quay lại trang chủ</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VaccineBookingView;
