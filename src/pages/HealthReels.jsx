import React, { useState, useRef, useEffect } from 'react';
import { Heart, MessageCircle, Share2, ShoppingCart, Volume2, VolumeX, ChevronLeft, Tv, RotateCw, Loader2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import * as api from '../services/api';
import './HealthReels.css';

const ReelItem = ({ reel, active, isMuted, toggleMute }) => {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(reel.likeCount || reel.likes || 120);
  const { addToCart } = useCart();

  const handleLike = () => {
    if (liked) {
      setLiked(false);
      setLikeCount(prev => prev - 1);
    } else {
      setLiked(true);
      setLikeCount(prev => prev + 1);
    }
  };

  // Build YouTube embed URL with origin, autoplay, mute, and loop parameters cleanly
  const embedUrl = reel.embedUrl || `https://www.youtube.com/embed/${reel.videoId}`;
  const pageOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const iframeSrc = `${embedUrl}?autoplay=${active ? 1 : 0}&mute=${isMuted ? 1 : 0}&loop=1&playlist=${reel.videoId}&enablejsapi=1&origin=${encodeURIComponent(pageOrigin)}`;

  return (
    <div className="reel-slide">
      {/* YouTube Embedded Iframe with strict origin security policy */}
      <iframe
        src={iframeSrc}
        title={reel.title || 'Health Reel'}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        frameBorder="0"
        className="reel-iframe"
      />

      {/* Mute toggle overlay */}
      <button className="reel-mute-btn" onClick={toggleMute} title={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}>
        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>

      {/* Right Side Buttons Panel */}
      <div className="reel-sidebar-actions">
        {/* Heart Like */}
        <div className="action-btn-wrap" onClick={handleLike}>
          <div className={`action-icon-circle ${liked ? 'liked' : ''}`}>
            <Heart size={22} fill={liked ? '#ef4444' : 'none'} />
          </div>
          <span>{likeCount}</span>
        </div>

        {/* Comment */}
        <div className="action-btn-wrap">
          <div className="action-icon-circle">
            <MessageCircle size={22} />
          </div>
          <span>{reel.comments || 45}</span>
        </div>

        {/* Share */}
        <div className="action-btn-wrap">
          <div className="action-icon-circle">
            <Share2 size={22} />
          </div>
          <span>{reel.shares || 18}</span>
        </div>
      </div>

      {/* Bottom Information Details */}
      <div className="reel-bottom-info">
        <h4 className="author">{reel.channelName || reel.author || '@tmpms_health'}</h4>
        <p className="description">{reel.title || reel.description}</p>

        {/* Recommended Product Tag Card */}
        {reel.product && (
          <div className="reel-product-badge animate-slide-up">
            <img src={reel.product.image} alt={reel.product.name} />
            <div className="prod-badge-info">
              <h5>{reel.product.name}</h5>
              <div className="row-price">
                <span className="price">{reel.product.price?.toLocaleString('vi-VN')}đ</span>
                <button className="buy-now-btn" onClick={() => addToCart(reel.product)}>
                  <ShoppingCart size={12} />
                  <span>Mua</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const HealthReels = ({ onBack }) => {
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeReelIndex, setActiveReelIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const containerRef = useRef(null);

  const loadVideos = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      const data = await api.fetchHealthReelsVideos();
      
      if (data && data.videos && data.videos.length > 0) {
        setReels(data.videos);

        // Read query param "start" for deep-linking to selected video
        const searchParams = new URLSearchParams(window.location.search);
        const startVideoId = searchParams.get('start');
        if (startVideoId) {
          const foundIdx = data.videos.findIndex(v => v.videoId === startVideoId);
          if (foundIdx !== -1) {
            setActiveReelIndex(foundIdx);
            setTimeout(() => {
              if (containerRef.current) {
                const containerHeight = containerRef.current.clientHeight;
                containerRef.current.scrollTop = foundIdx * containerHeight;
              }
            }, 150);
          }
        }
      } else {
        setReels([]);
        setErrorMessage(data?.errorMessage || 'Chưa có video khả dụng lúc này.');
      }
    } catch (err) {
      console.error('Lỗi tải video Health Reels:', err);
      setReels([]);
      setErrorMessage('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVideos();
  }, []);

  const toggleMute = () => setIsMuted(prev => !prev);

  const handleScroll = () => {
    if (containerRef.current && reels.length > 0) {
      const containerHeight = containerRef.current.clientHeight;
      const scrollTop = containerRef.current.scrollTop;
      const index = Math.round(scrollTop / containerHeight);
      if (index !== activeReelIndex && index >= 0 && index < reels.length) {
        setActiveReelIndex(index);
      }
    }
  };

  return (
    <div className="reels-view-container">
      {/* Back Header */}
      <div className="reels-top-nav">
        <button className="reels-back-btn" onClick={onBack}>
          <ChevronLeft size={20} />
          <span>Quay lại</span>
        </button>
        <div className="reels-tabs">
          <span className="tab active">Dành cho bạn</span>
          <span className="tab-divider">|</span>
          <span className="tab">Đang theo dõi</span>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="reels-fallback-container">
          <div className="reels-fallback-icon-wrap">
            <Loader2 size={40} className="animate-spin" />
          </div>
          <h3 className="reels-fallback-title">Đang tải Bản tin Sức khỏe...</h3>
        </div>
      ) : reels.length > 0 ? (
        /* Vertical Scroll Container for Videos */
        <div
          ref={containerRef}
          className="reels-scroller"
          onScroll={handleScroll}
        >
          {reels.map((reel, idx) => (
            <ReelItem
              key={reel.videoId || reel.id || idx}
              reel={reel}
              active={idx === activeReelIndex}
              isMuted={isMuted}
              toggleMute={toggleMute}
            />
          ))}
        </div>
      ) : (
        /* Fallback UI for Empty Video Array */
        <div className="reels-fallback-container">
          <div className="reels-fallback-icon-wrap">
            <Tv size={40} />
          </div>
          <h3 className="reels-fallback-title">Bản tin Sức khỏe Đông Y</h3>
          <p className="reels-fallback-desc">
            Chưa có video khả dụng. Vui lòng cấu hình YouTube API Key để tải các bản tin video Shorts sức khỏe mới nhất từ nhà thuốc.
          </p>
          <button className="reels-retry-btn" onClick={loadVideos}>
            <RotateCw size={16} />
            <span>Thử lại</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default HealthReels;
