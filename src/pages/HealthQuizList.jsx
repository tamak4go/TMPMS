import React, { useState, useEffect } from 'react';
import { ShieldCheck, ChevronRight, Activity, ArrowLeft } from 'lucide-react';
import './HealthQuizList.css';

const HealthQuizList = ({ onSelectQuiz, onBack }) => {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        setLoading(true);
        const res = await fetch('http://localhost:5000/api/HealthQuiz/list');
        if (!res.ok) throw new Error('Không thể tải danh sách bài kiểm tra.');
        const data = await res.json();
        setQuizzes(data);
      } catch (err) {
        console.error('Lỗi fetch health quiz list:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchQuizzes();
  }, []);

  return (
    <div className="hql-container">
      {/* Breadcrumb */}
      <div className="hql-breadcrumb">
        <button type="button" onClick={onBack} className="hql-back-btn">
          <ArrowLeft size={16} /> Trang chủ
        </button>
        <span className="hql-bc-sep">/</span>
        <span className="hql-bc-current">Kiểm tra sức khỏe tổng quát</span>
      </div>

      {/* Banner */}
      <div className="hql-hero-banner">
        <div className="hql-hero-content">
          <div className="hql-hero-badge">
            <Activity size={16} /> Trắc nghiệm y tế trực tuyến
          </div>
          <h1>Trung Tâm Kiểm Tra & Đánh Giá Sức Khỏe</h1>
          <p>
            Thực hiện các bài trắc nghiệm chuẩn hóa nhằm tự đánh giá nguy cơ sức khỏe tim mạch, tiêu hóa, 
            trí nhớ và nhận lời khuyên chăm sóc phù hợp từ các chuyên gia y tế.
          </p>
        </div>
      </div>

      {/* Disclaimer Alert */}
      <div className="hql-disclaimer-alert">
        <ShieldCheck size={20} className="hql-disc-icon" />
        <span>
          <strong>Lưu ý y tế:</strong> Bộ câu hỏi và ngưỡng điểm được xây dựng cho mục đích tham khảo và tầm soát ban đầu, không có giá trị chẩn đoán y khoa thay thế bác sĩ chuyên khoa.
        </span>
      </div>

      {/* Quiz Grid */}
      <div className="hql-grid-section">
        <h2 className="hql-section-title">Danh sách bài kiểm tra nổi bật</h2>

        {loading ? (
          <div className="hql-loading">
            <div className="hql-spinner"></div>
            <p>Đang tải danh sách bài kiểm tra...</p>
          </div>
        ) : error ? (
          <div className="hql-error">
            <p>{error}</p>
          </div>
        ) : quizzes.length === 0 ? (
          <div className="hql-empty">
            <p>Hiện chưa có bài kiểm tra nào sẵn sàng.</p>
          </div>
        ) : (
          <div className="hql-quiz-grid">
            {quizzes.map((quiz) => (
              <div key={quiz.code} className="hql-quiz-card">
                <div className="hql-card-top">
                  <span className="hql-card-icon">{quiz.iconUrl || '🩺'}</span>
                  <div className="hql-card-info">
                    <h3>{quiz.title}</h3>
                    <p>{quiz.description}</p>
                  </div>
                </div>
                <div className="hql-card-footer">
                  <span className="hql-card-meta">⚡ 3 - 5 phút</span>
                  <button 
                    type="button" 
                    className="hql-start-btn"
                    onClick={() => onSelectQuiz(quiz.code)}
                  >
                    Bắt đầu làm bài <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HealthQuizList;
