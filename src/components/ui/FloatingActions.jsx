import React, { useState, useEffect } from 'react';
import PharmacyChatWidget from './PharmacyChatWidget';
import './FloatingActions.css';

const FloatingActions = ({ user }) => {
  const [visible, setVisible] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [initialMessage, setInitialMessage] = useState('');

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', onScroll);

    const handleOpenChat = (e) => {
      const activeUser = getCurrentUser();
      const token = localStorage.getItem('token') || sessionStorage.getItem('token') || activeUser?.token;
      if (!token && !activeUser) {
        window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: 'login' }));
        return;
      }
      if (e?.detail?.initialMessage) {
        setInitialMessage(e.detail.initialMessage);
      } else {
        setInitialMessage('');
      }
      setIsChatOpen(true);
    };

    window.addEventListener('open-pharmacy-chat-widget', handleOpenChat);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('open-pharmacy-chat-widget', handleOpenChat);
    };
  }, []);

  const getCurrentUser = () => {
    if (user) return user;
    try {
      const stored = localStorage.getItem('user') || sessionStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  };

  const handlePharmacyChatClick = (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const activeUser = getCurrentUser();
    if (!token && !activeUser) {
      window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: 'login' }));
      return;
    }
    setIsChatOpen(true);
  };

  const activeUser = getCurrentUser();

  return (
    <>
      <div className="float-wrap">
        {/* Chat / Tư vấn */}
        <button
          className="float-btn float-chat"
          onClick={handlePharmacyChatClick}
          title="Tư vấn Dược sĩ Trực tuyến"
          style={{ cursor: 'pointer', border: 'none' }}
        >
          <span className="float-icon">💬</span>
          <span className="float-label">Tư vấn<br />Dược sĩ</span>
        </button>

        {/* Scroll to top */}
        {visible && (
          <button
            className="float-btn float-top fade-in"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            title="Lên đầu trang"
          >
            ↑
          </button>
        )}
      </div>

      <PharmacyChatWidget
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        user={activeUser}
        initialMessage={initialMessage}
      />
    </>
  );
};

export default FloatingActions;
