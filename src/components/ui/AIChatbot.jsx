import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, ShoppingCart, ArrowRight } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { askAiChatbot } from '../../services/api';
import './AIChatbot.css';

const AIChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: 'Xin chào! Tôi là Trợ lý Dược sĩ AI của TMPMS. Tôi có thể tư vấn sức khỏe Đông y, giúp bạn đặt lịch hẹn khám bệnh hoặc kết nối với Dược sĩ thật. Bạn cần tôi hỗ trợ gì?',
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const { addToCart } = useCart();
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: inputVal,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    const currentInput = inputVal;
    setInputVal('');
    setIsTyping(true);

    try {
      // Build conversation history (last 8 messages, user+bot only, exclude system)
      const historySnapshot = [...messages, userMsg]
        .filter(m => m.sender === 'user' || m.sender === 'bot')
        .slice(-8)
        .map(m => ({ role: m.sender === 'user' ? 'user' : 'model', text: m.text }));
      // Remove the last entry (current user message — already in `text` field)
      const history = historySnapshot.slice(0, -1);

      const data = await askAiChatbot(currentInput, history);
      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'bot',
        intent: data.intent,
        text: data.text,
        product: data.product,
        suggestedAction: data.suggestedAction,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      }]);
    } catch (err) {
      console.error('Lỗi kết nối AI Chatbot:', err);
      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'bot',
        text: 'Có lỗi xảy ra khi kết nối tới Trợ lý Dược sĩ AI. Vui lòng thử lại sau!',
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      }]);
    }
  };

  const handleActionClick = (action) => {
    if (!action || !action.type || action.type === 'none') return;

    if (action.type === 'navigate_to_booking') {
      // Switch main view to SelfDiagnosis appointment booking page
      window.dispatchEvent(new CustomEvent('app-navigate', { detail: 'diagnose' }));
    } else if (action.type === 'open_pharmacist_chat') {
      // Close AI Chatbot drawer and open Live Pharmacy Chat Widget
      setIsOpen(false);
      window.dispatchEvent(new CustomEvent('open-pharmacy-chat-widget'));
    } else if (action.type === 'navigate_to_history') {
      // Navigate to patient portal / diagnosis & prescription history
      window.dispatchEvent(new CustomEvent('app-navigate', { detail: 'history' }));
    }
  };

  const handleAddToCart = (product) => {
    addToCart(product);
    setMessages(prev => [...prev, {
      id: Date.now(),
      sender: 'system',
      text: `Đã thêm thành công "${product.name}" vào giỏ hàng của bạn!`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    }]);
  };

  return (
    <div className="ai-chatbot-wrapper">
      {/* Floating Chat Bubble */}
      {!isOpen && (
        <button className="ai-chat-bubble" onClick={() => setIsOpen(true)}>
          <MessageSquare size={24} />
          <span className="pulse-dot" />
          <span className="tooltip-text">Tư vấn AI Dược sĩ</span>
        </button>
      )}

      {/* Chat Drawer Window */}
      {isOpen && (
        <div className="ai-chat-window">
          {/* Header */}
          <div className="ai-chat-header">
            <div className="ai-bot-avatar">
              <Bot size={20} />
            </div>
            <div className="ai-header-info">
              <h4>Dược Sĩ Trợ Lý AI</h4>
              <span className="status-online">● Hoạt động 24/7</span>
            </div>
            <button className="ai-close-window-btn" onClick={() => setIsOpen(false)}>
              <X size={18} />
            </button>
          </div>

          {/* Messages List */}
          <div className="ai-chat-messages">
            {messages.map(msg => (
              <div key={msg.id} className={`ai-message-row ${msg.sender}`}>
                {msg.sender === 'bot' && (
                  <div className="msg-avatar">
                    <Bot size={14} />
                  </div>
                )}
                <div className="msg-bubble-wrap">
                  <div className="msg-bubble">
                    <p style={{ whiteSpace: 'pre-line' }}>{msg.text}</p>
                    
                    {/* Embedded Product Suggestion */}
                    {msg.product && (
                      <div className="msg-product-card">
                        <img src={msg.product.image} alt={msg.product.name} />
                        <div className="msg-prod-details">
                          <h5>{msg.product.name}</h5>
                          <span className="price">{msg.product.price != null ? `${msg.product.price.toLocaleString('vi-VN')}đ` : 'Liên hệ'}</span>
                          <button onClick={() => handleAddToCart(msg.product)}>
                            <ShoppingCart size={12} />
                            <span>Thêm vào giỏ</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Suggested Action Quick Button */}
                    {msg.suggestedAction && msg.suggestedAction.type !== 'none' && (
                      <div className="msg-action-box">
                        <button
                          className="msg-action-btn"
                          onClick={() => handleActionClick(msg.suggestedAction)}
                        >
                          <span>{msg.suggestedAction.label}</span>
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                  <span className="msg-time">{msg.timestamp}</span>
                </div>
              </div>
            ))}
            
            {/* Bot Typing Indicator */}
            {isTyping && (
              <div className="ai-message-row bot">
                <div className="msg-avatar">
                  <Bot size={14} />
                </div>
                <div className="msg-bubble-wrap">
                  <div className="msg-bubble typing">
                    <span className="dot" />
                    <span className="dot" />
                    <span className="dot" />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Footer Form */}
          <form onSubmit={handleSend} className="ai-chat-input-form">
            <input 
              type="text" 
              placeholder="Nhập câu hỏi (vd: đặt lịch hẹn, bị đau khớp)..." 
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
            />
            <button type="submit" className="ai-send-btn">
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AIChatbot;
