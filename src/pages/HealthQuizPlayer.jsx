import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, RotateCcw, Calendar, AlertTriangle, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';
import './HealthQuizPlayer.css';

const HealthQuizPlayer = ({ quizCode, onBack, onNavigateBooking }) => {
  const [quizData, setQuizData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State wizard
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({}); // { questionId: answerOptionId }
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoading(true);
        const res = await fetch(`http://localhost:5000/api/HealthQuiz/${quizCode}/questions`);
        if (!res.ok) throw new Error('Không thể tải nội dung bài test.');
        const data = await res.json();
        setQuizData(data);
      } catch (err) {
        console.error('Lỗi fetch quiz questions:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (quizCode) {
      fetchQuestions();
    }
  }, [quizCode]);

  const handleSelectOption = (questionId, optionId) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: optionId
    }));
  };

  const handleNext = () => {
    if (currentIndex < (quizData?.questions?.length || 0) - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const payload = {
        answers: Object.entries(selectedAnswers).map(([qId, optId]) => ({
          questionId: parseInt(qId),
          answerOptionId: optId
        }))
      };

      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`http://localhost:5000/api/HealthQuiz/${quizCode}/submit`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Lỗi gửi kết quả bài test.');
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error('Lỗi submit quiz:', err);
      alert('Không thể hoàn tất bài test: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedAnswers({});
    setResult(null);
  };

  if (loading) {
    return (
      <div className="hqp-container hqp-state-center">
        <div className="hqp-spinner"></div>
        <p>Đang chuẩn bị bài trắc nghiệm...</p>
      </div>
    );
  }

  if (error || !quizData) {
    return (
      <div className="hqp-container hqp-state-center">
        <p className="hqp-error-msg">{error || 'Không tìm thấy dữ liệu bài test.'}</p>
        <button type="button" onClick={onBack} className="hqp-btn-secondary">
          Quay lại danh sách
        </button>
      </div>
    );
  }

  const questions = quizData.questions || [];
  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const isSelected = currentQuestion ? selectedAnswers[currentQuestion.id] : null;
  const isAllAnswered = questions.every(q => selectedAnswers[q.id]);
  const progressPercent = totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0;

  // Render Màn hình Kết Quả
  if (result) {
    const riskLevel = result.resultBand?.riskLevel || 'Low';
    let riskBadgeClass = 'hqp-risk-low';
    let RiskIcon = CheckCircle2;

    if (riskLevel === 'High') {
      riskBadgeClass = 'hqp-risk-high';
      RiskIcon = ShieldAlert;
    } else if (riskLevel === 'Medium') {
      riskBadgeClass = 'hqp-risk-medium';
      RiskIcon = AlertCircle;
    }

    return (
      <div className="hqp-container">
        <div className="hqp-result-card">
          <div className="hqp-result-header">
            <div className={`hqp-risk-badge ${riskBadgeClass}`}>
              <RiskIcon size={24} />
              <span>{result.resultBand?.label}</span>
            </div>
            <h2>Kết Quả Đánh Giá Sức Khỏe</h2>
            <p className="hqp-result-score">Tổng điểm tích lũy nguy cơ: <strong>{result.totalScore}</strong> điểm</p>
          </div>

          <div className="hqp-result-body">
            <div className="hqp-result-section">
              <h4>Mô tả tình trạng</h4>
              <p>{result.resultBand?.description}</p>
            </div>

            <div className="hqp-result-section hqp-recommendation-box">
              <h4>💡 Khuyến nghị chăm sóc & theo dõi</h4>
              <p>{result.resultBand?.recommendationText}</p>
            </div>

            {/* Alert Disclaimer */}
            <div className="hqp-disclaimer-card">
              <AlertTriangle size={20} className="hqp-disc-warn-icon" />
              <p>
                <strong>Ghi chú quan trọng:</strong> Kết quả trên là đánh giá dựa trên bài trắc nghiệm tầm soát chung, 
                không phải chẩn đoán y khoa chính thức. Nếu triệu chứng tiến triển dai dẳng, hãy gặp bác sĩ chuyên khoa.
              </p>
            </div>
          </div>

          <div className="hqp-result-actions">
            {(riskLevel === 'High' || riskLevel === 'Medium') && (
              <button 
                type="button" 
                className="hqp-btn-primary hqp-btn-booking"
                onClick={onNavigateBooking}
              >
                <Calendar size={18} /> Đặt lịch tư vấn chuyên gia
              </button>
            )}

            <button type="button" className="hqp-btn-secondary" onClick={handleRestart}>
              <RotateCcw size={16} /> Làm lại bài test
            </button>

            <button type="button" className="hqp-btn-outline" onClick={onBack}>
              Về danh sách bài test
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render Màn hình Wizard Hỏi Đáp
  return (
    <div className="hqp-container">
      {/* Top Header */}
      <div className="hqp-wizard-header">
        <button type="button" className="hqp-back-link" onClick={onBack}>
          <ArrowLeft size={16} /> Danh sách bài test
        </button>
        <h3>{quizData.title}</h3>
      </div>

      {/* Progress Bar */}
      <div className="hqp-progress-wrap">
        <div className="hqp-progress-bar" style={{ width: `${progressPercent}%` }}></div>
        <span className="hqp-progress-text">Câu hỏi {currentIndex + 1} / {totalQuestions}</span>
      </div>

      {/* Question Card */}
      {currentQuestion && (
        <div className="hqp-question-card">
          <h4 className="hqp-question-title">{currentQuestion.questionOrder}. {currentQuestion.questionText}</h4>

          <div className="hqp-options-list">
            {currentQuestion.answerOptions.map((option) => {
              const checked = selectedAnswers[currentQuestion.id] === option.id;
              return (
                <div 
                  key={option.id}
                  className={`hqp-option-item ${checked ? 'selected' : ''}`}
                  onClick={() => handleSelectOption(currentQuestion.id, option.id)}
                >
                  <div className={`hqp-radio ${checked ? 'checked' : ''}`}></div>
                  <span className="hqp-option-text">{option.optionText}</span>
                </div>
              );
            })}
          </div>

          {/* Navigation Controls */}
          <div className="hqp-wizard-footer">
            <button 
              type="button" 
              className="hqp-btn-secondary"
              onClick={handlePrev}
              disabled={currentIndex === 0}
            >
              <ArrowLeft size={16} /> Câu trước
            </button>

            {currentIndex < totalQuestions - 1 ? (
              <button 
                type="button" 
                className="hqp-btn-primary"
                onClick={handleNext}
                disabled={!isSelected}
              >
                Câu tiếp theo <ArrowRight size={16} />
              </button>
            ) : (
              <button 
                type="button" 
                className="hqp-btn-success"
                onClick={handleSubmit}
                disabled={!isAllAnswered || submitting}
              >
                {submitting ? 'Đang chấm điểm...' : 'Nộp bài kiểm tra'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthQuizPlayer;
