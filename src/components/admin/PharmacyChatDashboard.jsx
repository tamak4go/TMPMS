import React, { useState, useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import * as api from '../../services/api';
import './PharmacyChatDashboard.css';

const PharmacyChatDashboard = ({ loggedInUser }) => {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [filterStatus, setFilterStatus] = useState('All');
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [hubConnection, setHubConnection] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load list of sessions
  const loadSessions = async () => {
    try {
      setLoading(true);
      const data = await api.fetchPharmacyChatSessions();
      setSessions(data);
      if (data.length > 0 && !activeSessionId) {
        setActiveSessionId(data[0].id);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách phiên tư vấn:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();

    // SignalR Real-time setup with helper getAuthToken() from api.js
    const token = api.getAuthToken();
    if (!token) {
      console.warn('SignalR Pharmacy Dashboard: Chưa có token xác thực, tạm dừng kết nối SignalR.');
      return;
    }

    const connection = new signalR.HubConnectionBuilder()
      .withUrl('http://localhost:5000/hubs/pharmacy-chat', {
        accessTokenFactory: () => api.getAuthToken()
      })
      .withAutomaticReconnect()
      .build();

    connection.on('SessionUpdated', (data) => {
      setSessions((prev) => {
        const idx = prev.findIndex((s) => s.id === data.sessionId);
        if (idx !== -1) {
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            lastMessage: data.lastMessage || updated[idx].lastMessage,
            lastMessageAt: data.lastMessageAt || updated[idx].lastMessageAt,
            status: data.status || updated[idx].status,
            assignedPharmacistId: data.assignedPharmacistId || updated[idx].assignedPharmacistId,
            assignedPharmacistName: data.assignedPharmacistName || updated[idx].assignedPharmacistName
          };
          return updated;
        } else {
          // Refresh list if new session
          loadSessions();
          return prev;
        }
      });
    });

    connection.on('ReceiveMessage', (msg) => {
      setMessages((prev) => {
        if (prev.length > 0 && prev[0].sessionId === msg.sessionId) {
          return [...prev, msg];
        }
        return prev;
      });
      scrollToBottom();
    });

    connection.on('PharmacistAssigned', (data) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === data.sessionId
            ? { ...s, status: 'Assigned', assignedPharmacistName: data.pharmacistName }
            : s
        )
      );
    });

    connection.on('SessionClosed', (data) => {
      setSessions((prev) =>
        prev.map((s) => (s.id === data.sessionId ? { ...s, status: 'Closed' } : s))
      );
    });

    connection
      .start()
      .then(() => {
        console.log('SignalR Dashboard connected to PharmacyChatHub');
      })
      .catch((err) => console.error('Dashboard SignalR Error:', err));

    setHubConnection(connection);

    return () => {
      connection.stop();
    };
  }, []);

  // Load messages when active session changes
  useEffect(() => {
    if (!activeSessionId) return;

    const loadMessages = async () => {
      try {
        const msgs = await api.fetchPharmacyChatMessages(activeSessionId);
        setMessages(msgs);
        scrollToBottom();
      } catch (err) {
        console.error('Lỗi tải lịch sử tin nhắn:', err);
      }
    };

    loadMessages();
  }, [activeSessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  const filteredSessions = sessions.filter((s) => {
    if (filterStatus === 'All') return true;
    return s.status === filterStatus;
  });

  const handleAssign = async () => {
    if (!activeSessionId) return;
    try {
      if (hubConnection) {
        await hubConnection.invoke('AssignPharmacist', activeSessionId);
      } else {
        await api.assignPharmacyChatSession(activeSessionId);
        loadSessions();
      }
    } catch (err) {
      console.error('Lỗi tiếp nhận tư vấn:', err);
    }
  };

  const handleClose = async () => {
    if (!activeSessionId || !hubConnection) return;
    if (!window.confirm('Bạn có chắc chắn muốn kết thúc phiên tư vấn này?')) return;
    try {
      await hubConnection.invoke('CloseSession', activeSessionId);
    } catch (err) {
      console.error('Lỗi đóng phiên tư vấn:', err);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeSessionId || !hubConnection) return;

    const text = inputText.trim();
    setInputText('');

    try {
      await hubConnection.invoke('SendMessage', activeSessionId, text);
    } catch (err) {
      console.error('Lỗi gửi tin nhắn trả lời:', err);
    }
  };

  return (
    <div className="pharmacy-dashboard-container">
      {/* Sidebar List */}
      <div className="pharmacy-dash-sidebar">
        <div className="dash-sidebar-header">
          <h3>💬 Tư vấn Dược sĩ Trực tuyến</h3>
          <div className="dash-filter-tabs">
            <button
              className={`filter-btn ${filterStatus === 'All' ? 'active' : ''}`}
              onClick={() => setFilterStatus('All')}
            >
              Tất cả ({sessions.length})
            </button>
            <button
              className={`filter-btn ${filterStatus === 'Open' ? 'active' : ''}`}
              onClick={() => setFilterStatus('Open')}
            >
              Đang chờ ({sessions.filter((s) => s.status === 'Open').length})
            </button>
            <button
              className={`filter-btn ${filterStatus === 'Assigned' ? 'active' : ''}`}
              onClick={() => setFilterStatus('Assigned')}
            >
              Đang tư vấn ({sessions.filter((s) => s.status === 'Assigned').length})
            </button>
          </div>
        </div>

        <div className="dash-session-list">
          {filteredSessions.length === 0 ? (
            <div className="empty-sessions">Không có phiên tư vấn nào.</div>
          ) : (
            filteredSessions.map((s) => (
              <div
                key={s.id}
                className={`session-card ${s.id === activeSessionId ? 'active' : ''}`}
                onClick={() => setActiveSessionId(s.id)}
              >
                <div className="session-card-top">
                  <span className="session-user-name">{s.userName}</span>
                  <span className={`status-badge status-${s.status.toLowerCase()}`}>
                    {s.status === 'Open' ? 'Đang chờ' : s.status === 'Assigned' ? 'Đang hỗ trợ' : 'Đã đóng'}
                  </span>
                </div>
                <div className="session-card-msg">{s.lastMessage || 'Chưa có tin nhắn'}</div>
                <div className="session-card-meta">
                  <span>{s.lastMessageAt ? new Date(s.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                  {s.userPhone && <span className="user-phone">📞 {s.userPhone}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Content */}
      <div className="pharmacy-dash-main">
        {activeSession ? (
          <>
            {/* Header */}
            <div className="dash-main-header">
              <div className="dash-user-info">
                <h4>Khách hàng: {activeSession.userName}</h4>
                <div className="dash-user-sub">
                  {activeSession.userPhone && <span>SĐT: {activeSession.userPhone} | </span>}
                  {activeSession.userEmail && <span>Email: {activeSession.userEmail} | </span>}
                  <span>Trạng thái: <strong>{activeSession.status}</strong></span>
                </div>
              </div>
              <div className="dash-actions">
                {activeSession.status === 'Open' && (
                  <button className="dash-btn btn-assign" onClick={handleAssign}>
                    ✋ Tiếp nhận tư vấn
                  </button>
                )}
                {activeSession.status !== 'Closed' && (
                  <button className="dash-btn btn-close" onClick={handleClose}>
                    🔒 Kết thúc tư vấn
                  </button>
                )}
              </div>
            </div>

            {/* Messages Log */}
            <div className="dash-messages-body">
              {messages.map((m, idx) => {
                const isCustomer = m.senderRole === 'User';
                return (
                  <div
                    key={m.id || idx}
                    className={`dash-msg-row ${isCustomer ? 'msg-cust' : 'msg-pharm'}`}
                  >
                    <div className="dash-msg-header">
                      <strong>{m.senderName}</strong> ({m.senderRole === 'User' ? 'Khách hàng' : m.senderRole === 'Admin' ? 'Quản trị' : 'Dược sĩ'})
                    </div>
                    <div className="dash-msg-bubble">
                      <p>{m.content}</p>
                      <span className="dash-msg-time">
                        {m.sentAt ? new Date(m.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Input */}
            <form className="dash-reply-footer" onSubmit={handleSendReply}>
              <input
                type="text"
                placeholder={
                  activeSession.status === 'Closed'
                    ? 'Phiên tư vấn này đã đóng.'
                    : 'Nhập câu trả lời chuyên môn gửi cho khách hàng...'
                }
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={activeSession.status === 'Closed'}
              />
              <button
                type="submit"
                className="dash-send-reply-btn"
                disabled={!inputText.trim() || activeSession.status === 'Closed'}
              >
                Gửi trả lời ➔
              </button>
            </form>
          </>
        ) : (
          <div className="no-active-session">
            <h3>Vui lòng chọn một phiên tư vấn từ danh sách bên trái</h3>
          </div>
        )}
      </div>
    </div>
  );
};

export default PharmacyChatDashboard;
