import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';
import { Leaf, Activity, Sparkles, Check, ChevronRight, Calendar, ShoppingCart, ArrowLeft, RotateCcw, AlertCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { toLocalWallClockIso } from '../utils/dateTime';
import './SelfDiagnosis.css';

const SelfDiagnosis = ({ onBack, onNavigateToLogin, onAppointmentBooked }) => {
  const { user } = useAuth();
  const { addToCart } = useCart();

  const [questions, setQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { questionId: answerOptionId }
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [timeSlot, setTimeSlot] = useState('09:00');

  const TIME_SLOTS = ['08:00', '09:00', '10:00', '14:00', '15:00', '16:00'];

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    setLoadingQuestions(true);
    try {
      const data = await api.fetchDiagnosisQuestions();
      setQuestions(data || []);
    } catch (err) {
      console.error('Không thể nạp danh sách câu hỏi:', err);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleSelectOption = (questionId, optionId) => {
    const nextAnswers = { ...answers, [questionId]: optionId };
    setAnswers(nextAnswers);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Last question completed -> trigger classification
      submitDiagnosis(nextAnswers);
    }
  };

  const handlePrevQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const submitDiagnosis = async (finalAnswersMap) => {
    setSubmitting(true);
    try {
      const submissionList = Object.keys(finalAnswersMap).map(qId => ({
        questionId: parseInt(qId, 10),
        answerOptionId: finalAnswersMap[qId]
      }));

      const res = await api.classifyDiagnosis(submissionList);
      setResult(res);
    } catch (err) {
      console.error('Lỗi khi phân tích chẩn đoán:', err);
      alert('Đã xảy ra lỗi khi phân tích chẩn đoán. Vui lòng thử lại!');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBookAppointment = async () => {
    if (!user) {
      alert('Vui lòng đăng nhập tài khoản để đăng ký lịch hẹn khám!');
      window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: 'login' }));
      if (onNavigateToLogin) onNavigateToLogin();
      return;
    }

    try {
      const syndromeName = result?.primarySyndrome?.name || 'Đông Y';
      const reasonText = `Tự chẩn đoán: Thể bệnh ${syndromeName}`;

      const baseDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const [hh, mm] = (timeSlot || '09:00').split(':').map(Number);
      baseDate.setHours(hh, mm, 0, 0);

      await api.createAppointment({
        appointmentDate: toLocalWallClockIso(baseDate),
        reason: reasonText,
        status: 'Scheduled',
        notes: `Phân tích thể bệnh: ${syndromeName}. Lời khuyên: ${result?.recommendationText}.`
      });

      setBookingSuccess(true);
      if (onAppointmentBooked) onAppointmentBooked();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Đã xảy ra lỗi khi đăng ký lịch hẹn.');
    }
  };

  const handleReset = () => {
    setResult(null);
    setAnswers({});
    setCurrentIndex(0);
    setBookingSuccess(false);
  };

  if (loadingQuestions) {
    return (
      <div className="self-diagnosis-container">
        <div className="loading-state-card">
          <Activity className="pulse-icon spinner" />
          <p>Đang nạp bộ câu hỏi tự chẩn đoán Đông Y...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progressPercent = questions.length > 0 ? Math.round(((currentIndex + 1) / questions.length) * 100) : 0;

  return (
    <div className="self-diagnosis-container">
      <button className="back-btn" onClick={onBack}>
        <ArrowLeft size={16} /> Quay lại trang chủ
      </button>

      {!result ? (
        <div className="diag-quiz-card">
          {/* Header & Progress Bar */}
          <div className="quiz-header">
            <div className="quiz-title-row">
              <Activity className="pulse-icon" />
              <h2>Tự Chẩn Đoán Thể Bệnh Đông Y</h2>
            </div>
            <p>Trả lời lần lượt 10 câu hỏi để mô hình AI Đông Y phân loại thể bệnh chính xác cho bạn.</p>

            <div className="progress-bar-box">
              <div className="progress-bar-info">
                <span>Câu {currentIndex + 1} / {questions.length}</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
              </div>
            </div>
          </div>

          {/* Current Question Display */}
          {currentQuestion && (
            <div className="question-wizard-step">
              {currentQuestion.category && (
                <span className="category-tag">Nhóm: {currentQuestion.category}</span>
              )}
              <h3 className="wizard-question-text">{currentQuestion.questionText}</h3>

              <div className="wizard-options-list">
                {currentQuestion.answerOptions.map(opt => {
                  const isSelected = answers[currentQuestion.id] === opt.id;
                  return (
                    <button
                      key={opt.id}
                      className={`wizard-option-btn ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelectOption(currentQuestion.id, opt.id)}
                    >
                      <div className="option-check-circle">
                        {isSelected && <Check size={16} />}
                      </div>
                      <span>{opt.optionText}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Wizard Footer Controls */}
          <div className="wizard-footer">
            {currentIndex > 0 && (
              <button className="wizard-prev-btn" onClick={handlePrevQuestion}>
                <ArrowLeft size={16} /> Câu trước
              </button>
            )}
            {submitting && (
              <div className="submitting-indicator">
                <Activity className="spinner" size={18} /> Đang phân tích kết quả...
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Result Screen */
        <div className="diag-result-card">
          <div className="result-header">
            <Sparkles className="spark-icon" />
            <h3>Kết Quả Phân Loại Thể Bệnh Đông Y</h3>
            <span className="result-badge">Biện chứng luận trị</span>
          </div>

          <div className="result-body">
            <div className="syndrome-title-box">
              <span className="syndrome-code">{result.primarySyndrome?.code || 'ĐY'}</span>
              <div>
                <h4 className="disease-title">
                  {result.primarySyndrome?.name}
                  {result.secondarySyndrome && (
                    <span className="secondary-title"> (Kết hợp {result.secondarySyndrome.name})</span>
                  )}
                </h4>
                <p className="disease-desc">{result.description}</p>
              </div>
            </div>

            <div className="advice-section">
              <h5>🌱 Lời khuyên dưỡng sinh & Khuyến nghị y tế:</h5>
              <p>{result.recommendationText}</p>
            </div>

            {/* Direct Clinical Appointment Booking */}
            <div className="appointment-booking-box">
              <h5>📅 Đăng ký lịch hẹn khám chi tiết:</h5>
              {bookingSuccess ? (
                <div className="booking-success-msg">
                  <Check size={18} />
                  <span>Đã đặt lịch hẹn thành công! Lý do khám được ghi nhận: "Tự chẩn đoán: Thể bệnh {result.primarySyndrome?.name}". Y bác sĩ sẽ gọi xác nhận trong 15 phút.</span>
                </div>
              ) : (
                <div className="booking-inputs">
                  <p className="booking-notice">Lý do hẹn sẽ tự động điền: <strong>"Tự chẩn đoán: Thể bệnh {result.primarySyndrome?.name}"</strong></p>
                  <div className="inputs-row">
                    <select
                      className="booking-input"
                      value={timeSlot}
                      onChange={e => setTimeSlot(e.target.value)}
                    >
                      {TIME_SLOTS.map(slot => (
                        <option key={slot} value={slot}>Khung giờ {slot}</option>
                      ))}
                    </select>
                    <button className="confirm-booking-btn" onClick={handleBookAppointment}>
                      <Calendar size={16} /> Đặt lịch khám
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <button className="reset-diag-btn" onClick={handleReset}>
            <RotateCcw size={16} /> Thực hiện chẩn đoán lại
          </button>
        </div>
      )}
    </div>
  );
};

export default SelfDiagnosis;
