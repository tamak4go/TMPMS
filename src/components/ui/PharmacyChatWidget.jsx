import React, { useState, useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import * as api from '../../services/api';
import './PharmacyChatWidget.css';

const PharmacyChatWidget = ({ isOpen, onClose, user, initialMessage }) => {
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [hubConnection, setHubConnection] = useState(null);
  const [assignedPharmacistName, setAssignedPharmacistName] = useState(null);
  const [systemNotice, setSystemNotice] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen && initialMessage) {
      setInputText(initialMessage);
    }
  }, [isOpen, initialMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!isOpen || !user) return;

    // Load active session and message history via REST API first
    const initSession = async () => {
      try {
        const sessData = await api.fetchMyPharmacyChatSession();
        setSession(sessData);
        setMessages(sessData.messages || []);
        if (sessData.assignedPharmacistName) {
          setAssignedPharmacistName(sessData.assignedPharmacistName);
        }
      } catch (err) {
        console.error('Lỗi khởi tạo phiên chat dược sĩ:', err);
      }
    };

    initSession();

    // Setup SignalR Connection with helper getAuthToken() from api.js
    const token = api.getAuthToken();
    if (!token) {
      console.warn('SignalR Pharmacy Chat: Chưa có token xác thực, tạm dừng kết nối SignalR.');
      return;
    }

    const connection = new signalR.HubConnectionBuilder()
      .withUrl('http://localhost:5000/hubs/pharmacy-chat', {
        accessTokenFactory: () => api.getAuthToken()
      })
      .withAutomaticReconnect()
      .build();

    connection.on('ReceiveMessage', (msg) => {
      setMessages((prev) => [...prev, msg]);
      scrollToBottom();
    });

    connection.on('PharmacistAssigned', (data) => {
      setAssignedPharmacistName(data.pharmacistName);
      setSystemNotice(data.systemNotice);
      scrollToBottom();
    });

    connection.on('SessionClosed', (data) => {
      setSystemNotice(data.systemNotice || 'Phiên tư vấn đã kết thúc.');
      setSession((prev) => prev ? { ...prev, status: 'Closed' } : prev);
      scrollToBottom();
    });

    connection
      .start()
      .then(() => {
        console.log('SignalR Pharmacy Chat connected successfully');
      })
      .catch((err) => console.error('SignalR Pharmacy Chat Connection Error: ', err));

    setHubConnection(connection);

    return () => {
      if (connection) {
        connection.stop();
      }
    };
  }, [isOpen, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, systemNotice]);

  if (!isOpen) return null;

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !session || !hubConnection) return;

    const text = inputText.trim();
    setInputText('');

    try {
      if (hubConnection.state !== signalR.HubConnectionState.Connected) {
        console.warn('SignalR connection is not connected. Attempting to reconnect...');
        await hubConnection.start();
      }
      await hubConnection.invoke('SendMessage', session.id, text);
    } catch (err) {
      console.error('Lỗi gửi tin nhắn:', err);
    }
  };

  return (
    <div className="pharmacy-chat-widget">
      {/* Header */}
      <div className="pharmacy-chat-header">
        <div className="pharmacist-avatar-wrap">
          <span className="pharmacist-avatar-icon">💊</span>
          <span className="online-indicator"></span>
        </div>
        <div className="pharmacy-chat-title-wrap">
          <h3>Tư vấn Dược sĩ Trực tuyến</h3>
          <p className="pharmacy-chat-sub">
            {assignedPharmacistName
              ? `Dược sĩ phụ trách: ${assignedPharmacistName}`
              : 'Đang kết nối với Dược sĩ trực ban...'}
          </p>
        </div>
        <button className="pharmacy-chat-close-btn" onClick={onClose} title="Đóng">
          ✕
        </button>
      </div>

      {/* Notice bar */}
      {session && session.status === 'Open' && !assignedPharmacistName && (
        <div className="pharmacy-chat-notice">
          ℹ️ Vui lòng đặt câu hỏi, Dược sĩ chuyên môn sẽ tiếp nhận và phản hồi ngay.
        </div>
      )}

      {/* Messages Body */}
      <div className="pharmacy-chat-body">
        <div className="chat-intro-card">
          <p>🌿 <strong>Nhà thuốc TMPMS kính chào quý khách!</strong></p>
          <p>Dược sĩ chuyên môn sẵn sàng tư vấn liều dùng, tương tác thuốc và bài thuốc Đông Y phù hợp với bạn.</p>
        </div>

        {messages.map((m, idx) => {
          const isMe = m.senderRole === 'User';
          return (
            <div
              key={m.id || idx}
              className={`pharmacy-msg-row ${isMe ? 'msg-me' : 'msg-pharmacist'}`}
            >
              {!isMe && (
                <div className="msg-sender-role">
                  {m.senderRole === 'Admin' ? 'Quản trị viên' : 'Dược sĩ'}
                </div>
              )}
              <div className="pharmacy-msg-bubble">
                <p>{m.content}</p>
                <span className="msg-time">
                  {m.sentAt ? new Date(m.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
            </div>
          );
        })}

        {systemNotice && (
          <div className="pharmacy-system-notice">
            <span>{systemNotice}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Footer / Input form */}
      <form className="pharmacy-chat-footer" onSubmit={handleSendMessage}>
        <input
          type="text"
          placeholder={session?.status === 'Closed' ? 'Phiên tư vấn đã kết thúc' : 'Nhập câu hỏi cần tư vấn Dược sĩ...'}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={session?.status === 'Closed'}
        />
        <button
          type="submit"
          className="pharmacy-send-btn"
          disabled={!inputText.trim() || session?.status === 'Closed'}
        >
          Gửi ➔
        </button>
      </form>
    </div>
  );
};

export default PharmacyChatWidget;
