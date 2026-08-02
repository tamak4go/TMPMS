import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';
import SelfDiagnosis from './SelfDiagnosis';
import { 
  Heart, Calendar, FileText, Activity, ShieldAlert, Sparkles, Check, Clock, User
} from 'lucide-react';
import { getPrescriptionStatusClass, getPrescriptionStatusLabel } from '../utils/prescriptionStatus';
import { useCart } from '../context/CartContext';
import './PatientPortal.css';

const PatientPortal = ({ onBack }) => {
  const { user } = useAuth();
  const { refreshCart } = useCart();
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard | diagnose | appointments | prescriptions
  const [myAppointments, setMyAppointments] = useState([]);
  const [myPrescriptions, setMyPrescriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [patientRecord, setPatientRecord] = useState(null);
  const [cartAddedMap, setCartAddedMap] = useState({});
  const [cartNotice, setCartNotice] = useState('');

  const handleAddPrescriptionToCart = async (p, item) => {
    if (!user) return;
    const cartId = user.cart_id || user.cartId;
    if (!cartId) {
      setCartNotice('Không tìm thấy giỏ hàng của bạn. Vui lòng đăng nhập lại!');
      setTimeout(() => setCartNotice(''), 3000);
      return;
    }
    try {
      await api.addCartItem(cartId, item.medicineId, item.quantity);
      await refreshCart();
      setCartAddedMap(prev => ({ ...prev, [`${p.id}-${item.medicineId}`]: true }));
      setCartNotice(`Đã thêm "${item.medicineName}" (x${item.quantity}) vào giỏ hàng!`);
      setTimeout(() => setCartNotice(''), 3000);
    } catch (err) {
      setCartNotice(err.message || 'Không thể thêm vào giỏ hàng.');
      setTimeout(() => setCartNotice(''), 3000);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadPatientData();
  }, [user]);

  const loadPatientData = async () => {
    setLoading(true);
    try {
      // 1. Fetch user's own appointments using customer endpoint /api/Appointment/my-appointments
      try {
        const myAppts = await api.fetchUserAppointments();
        setMyAppointments(myAppts);
      } catch (e) {
        console.warn('Could not fetch user appointments:', e);
      }

      // 2. Fetch user's prescriptions
      try {
        const myPrescs = await api.fetchUserPrescriptions(user.id);
        setMyPrescriptions(myPrescs);
      } catch (e) {
        console.warn('Could not fetch user prescriptions:', e);
      }

      // 3. Fetch user profile for patient record
      try {
        const profile = await api.fetchMyProfile();
        if (profile) {
          setPatientRecord({
            gender: profile.gender || 'Nam',
            dateOfBirth: profile.dateOfBirth || profile.createdAt,
            address: profile.address || '',
            medicalHistory: profile.medicalHistory || 'Chưa ghi nhận bệnh nền.'
          });
        }
      } catch (e) {
        // Fallback to logged in user state
        setPatientRecord({
          gender: user.gender || 'Nam',
          dateOfBirth: user.dateOfBirth || null,
          address: user.address || '',
          medicalHistory: ''
        });
      }
    } catch (err) {
      console.error('Lỗi khi tải hồ sơ sức khỏe:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshAppointments = async () => {
    try {
      const myAppts = await api.fetchUserAppointments();
      setMyAppointments(myAppts);
    } catch (e) {
      console.warn('Could not refresh appointments:', e);
    }
  };

  const handleAppointmentBooked = async () => {
    await refreshAppointments();
    setActiveTab('appointments');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  if (!user) {
    return (
      <div className="patient-portal-container">
        <div className="login-required-box">
          <ShieldAlert size={48} className="warn-icon" />
          <h3>Yêu Cầu Đăng Nhập</h3>
          <p>Vui lòng đăng nhập tài khoản Khách hàng để xem hồ sơ sức khỏe và sử dụng tính năng chẩn đoán Đông Y.</p>
          <button className="back-home-btn" onClick={onBack}>Quay lại trang chủ</button>
        </div>
      </div>
    );
  }

  return (
    <div className="patient-portal-container">
      {/* Top Banner */}
      <div className="portal-welcome-banner">
        <div className="user-avatar-wrap">
          <User size={32} />
        </div>
        <div className="welcome-text">
          <h2>Cổng Thông Tin Sức Khỏe Bệnh Nhân</h2>
          <p>Xin chào, <strong>{user.username}</strong> | SĐT: {user.phone || 'Chưa cập nhật'}</p>
        </div>
        <button className="back-home-btn-header" onClick={onBack}>Trang chủ</button>
      </div>

      {/* Navigation tabs */}
      <div className="portal-tabs-nav">
        <button className={`portal-tab-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
          <Heart size={16} /> Tổng quan sức khỏe
        </button>
        <button className={`portal-tab-item ${activeTab === 'diagnose' ? 'active' : ''}`} onClick={() => setActiveTab('diagnose')}>
          <Activity size={16} /> Tự chẩn đoán Đông Y
        </button>
        <button className={`portal-tab-item ${activeTab === 'appointments' ? 'active' : ''}`} onClick={() => setActiveTab('appointments')}>
          <Calendar size={16} /> Lịch hẹn khám ({myAppointments.length})
        </button>
        <button className={`portal-tab-item ${activeTab === 'prescriptions' ? 'active' : ''}`} onClick={() => setActiveTab('prescriptions')}>
          <FileText size={16} /> Đơn thuốc của tôi ({myPrescriptions.length})
        </button>
      </div>

      {loading ? (
        <div className="portal-loader">
          <div className="spinner"></div>
          <p>Đang liên kết hồ sơ bệnh án Đông Y...</p>
        </div>
      ) : (
        <div className="portal-tab-content">
          
          {/* TAB: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="dashboard-grid">
              
              {/* Left Column: Health Profile */}
              <div className="portal-card health-profile">
                <div className="card-header">
                  <Heart className="icon teal" />
                  <h4>Bệnh án & Tiền sử bệnh lý</h4>
                </div>
                <div className="card-body">
                  {patientRecord ? (
                    <div className="record-details">
                      <div className="detail-row">
                        <span>Giới tính:</span>
                        <strong>{patientRecord.gender || 'Chưa rõ'}</strong>
                      </div>
                      <div className="detail-row">
                        <span>Ngày sinh:</span>
                        <strong>{patientRecord.dateOfBirth ? new Date(patientRecord.dateOfBirth).toLocaleDateString('vi-VN') : 'Chưa có'}</strong>
                      </div>
                      <div className="detail-row">
                        <span>Địa chỉ khám:</span>
                        <strong>{patientRecord.address || 'Chưa cập nhật'}</strong>
                      </div>
                      <div className="medical-notes-box">
                        <h5>📝 Ghi chú chẩn đoán lâm sàng của Thầy thuốc:</h5>
                        <p>{patientRecord.medicalHistory || 'Chưa có ghi nhận triệu chứng bệnh nền từ bác sĩ.'}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="no-record-box">
                      <p>Hệ thống chưa tìm thấy hồ sơ bệnh án liên kết với số điện thoại **{user.phone}**.</p>
                      <p className="sub">Bạn có thể sử dụng chức năng <strong>Tự chẩn đoán triệu chứng</strong> để hệ thống tự thiết lập hồ sơ bệnh án mới cho bạn.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Next appointments & active prescriptions */}
              <div className="right-summary-column">
                
                {/* Quick Stats */}
                <div className="quick-stats-row">
                  <div className="stat-box">
                    <span className="num">{myAppointments.length}</span>
                    <span className="lbl">Lịch khám</span>
                  </div>
                  <div className="stat-box">
                    <span className="num">{myPrescriptions.length}</span>
                    <span className="lbl">Đơn thuốc</span>
                  </div>
                </div>

                {/* Next Appointment Alert */}
                <div className="portal-card next-appt">
                  <div className="card-header">
                    <Calendar className="icon purple" />
                    <h4>Lịch hẹn khám sắp tới</h4>
                  </div>
                  <div className="card-body">
                    {myAppointments.filter(a => a.status === 'Scheduled' || a.status === 'Confirmed').length === 0 ? (
                      <p className="empty-text">Bạn chưa có lịch hẹn khám nào sắp diễn ra.</p>
                    ) : (
                      myAppointments.filter(a => a.status === 'Scheduled' || a.status === 'Confirmed').slice(0, 1).map(a => (
                        <div key={a.id} className="appt-alert-box">
                          <div className="time">📅 {formatDate(a.appointmentDate)}</div>
                          <div className="doctor">Thầy thuốc phụ trách: <strong>{a.doctorName || 'Chưa phân công'}</strong></div>
                          <div className="reason">Lý do: <em>{a.reason}</em></div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB: DIAGNOSE (Symptom analysis helper) */}
          {activeTab === 'diagnose' && (
            <SelfDiagnosis onBack={() => setActiveTab('dashboard')} onAppointmentBooked={handleAppointmentBooked} />
          )}

          {/* TAB: MY APPOINTMENTS */}
          {activeTab === 'appointments' && (
            <div className="portal-card">
              <div className="card-header-actions">
                <h4>Lịch sử cuộc hẹn khám bệnh</h4>
                <button className="book-new-appt-btn" onClick={() => setActiveTab('diagnose')}>
                  <Calendar size={14} /> Đăng ký hẹn khám mới
                </button>
              </div>

              {myAppointments.length === 0 ? (
                <p className="empty-text">Bạn chưa đăng ký lịch hẹn khám nào.</p>
              ) : (
                <div className="appointments-list-box">
                  {myAppointments.map(a => (
                    <div key={a.id} className="appt-item-row">
                      <div className="date-time-box">
                        <Clock size={16} />
                        <span>{formatDate(a.appointmentDate)}</span>
                      </div>
                      <div className="reason-info">
                        <strong>Lý do:</strong> {a.reason}
                        {a.notes && <p className="notes-para">⚠️ <strong>Ghi chú:</strong> {a.notes}</p>}
                      </div>
                      <div className="status-badge-wrap">
                        <span className={`status-badge-portal ${a.status.toLowerCase()}`}>
                          {a.status === 'Scheduled' ? 'Chờ khám' : a.status === 'Confirmed' ? 'Đã xác nhận' : a.status === 'Completed' ? 'Đã khám xong' : 'Đã hủy'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: MY PRESCRIPTIONS */}
          {activeTab === 'prescriptions' && (
            <div className="portal-card">
              <h4>Đơn thuốc Đông Y đã kê của bạn</h4>
              {myPrescriptions.length === 0 ? (
                <p className="empty-text">Bạn chưa được kê đơn thuốc nào từ Thầy thuốc.</p>
              ) : (
                <div className="prescriptions-grid-portal">
                  {myPrescriptions.map(p => (
                    <div key={p.id} className="prescription-card-portal">
                      <div className="pres-card-header">
                        <div>
                          <h5>Đơn thuốc #{p.id}</h5>
                          <span className="date">Kê ngày: {formatDate(p.prescriptionDate)}</span>
                        </div>
                        <span className={`status-badge-portal ${getPrescriptionStatusClass(p.status)}`}>
                          {getPrescriptionStatusLabel(p.status, 'patient')}
                        </span>
                      </div>
                      <div className="pres-card-body">
                        <div className="clinic-details">
                          <div>📍 Nơi kê đơn: <strong>{p.hospital}</strong></div>
                          <div>👨‍⚕️ Thầy thuốc kê đơn: <strong>{p.doctorName}</strong></div>
                        </div>

                        <div className="items-list-portal">
                          <h6>Danh sách các vị thuốc chỉ định:</h6>
                          {p.items && p.items.map((item, idx) => {
                            const alreadyAdded = !!cartAddedMap[`${p.id}-${item.medicineId}`];
                            return (
                              <div key={idx} className="item-row-detail">
                                <span>🌿 {item.medicineName}</span>
                                <strong>x{item.quantity}</strong>
                                {(p.status === 'Approved' || p.status === 'Fulfilled') && (
                                  <button
                                    className="presc-add-cart-btn"
                                    disabled={alreadyAdded}
                                    onClick={() => handleAddPrescriptionToCart(p, item)}
                                  >
                                    {alreadyAdded ? 'Đã thêm' : 'Thêm vào giỏ'}
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {cartNotice && (
                <div className="presc-cart-notice">{cartNotice}</div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default PatientPortal;
