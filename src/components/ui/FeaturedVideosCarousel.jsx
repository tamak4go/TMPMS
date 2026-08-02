import React, { useState, useEffect, useRef } from 'react';
import { Play, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { fetchHealthReelsVideos } from '../../services/api';
import '../HealthVideoSection.css'; // Reuse & extend health video styles

export default function FeaturedVideosCarousel({ onNavigate }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    const loadVideos = async () => {
      try {
        setLoading(true);
        const data = await fetchHealthReelsVideos();
        if (data && data.videos && data.videos.length > 0) {
          setVideos(data.videos);
        } else {
          setVideos([]);
        }
      } catch (err) {
        console.error('Lỗi tải video ngắn nổi bật:', err);
        setVideos([]);
      } finally {
        setLoading(false);
      }
    };
    loadVideos();
  }, []);

  const scroll = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 300, behavior: 'smooth' });
    }
  };

  const handleCardClick = (videoId) => {
    // Update URL query parameter ?start={videoId}
    window.history.pushState(null, '', `?start=${videoId}`);
    
    // Navigate to Health Reels view
    if (onNavigate) {
      onNavigate('reels');
    } else {
      window.dispatchEvent(new CustomEvent('app-navigate', { detail: 'reels' }));
    }
  };

  if (!loading && videos.length === 0) return null;

  return (
    <section className="health-video-section">
      <div className="hv-header">
        <div className="hv-title-row">
          <span className="hv-icon">▶</span>
          <h2 className="hv-title">Video ngắn nổi bật</h2>
        </div>
        <button 
          className="hv-see-all" 
          onClick={() => onNavigate ? onNavigate('reels') : window.dispatchEvent(new CustomEvent('app-navigate', { detail: 'reels' }))}
        >
          Xem tất cả <ChevronRight size={14} />
        </button>
      </div>

      <div className="hv-scroll-wrapper">
        <button className="hv-arrow hv-arrow-left" onClick={() => scroll(-1)} aria-label="Cuộn trái">
          <ChevronLeft size={18} />
        </button>

        <div className="hv-scroll-track" ref={scrollRef}>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="hv-card skeleton-card">
                <div className="hv-thumb-wrap skeleton-thumb"></div>
                <div className="hv-card-body">
                  <div className="skeleton-line short"></div>
                  <div className="skeleton-line long"></div>
                  <div className="skeleton-line medium"></div>
                </div>
              </div>
            ))
          ) : (
            videos.map(v => (
              <div key={v.videoId} className="hv-card" onClick={() => handleCardClick(v.videoId)}>
                <div className="hv-thumb-wrap">
                  <img src={v.thumbnailUrl} alt={v.title} className="hv-thumb" />
                  <div className="hv-play-overlay">
                    <div className="hv-play-btn"><Play size={18} fill="white" /></div>
                  </div>
                  <span className="hv-badge">VIDEO</span>
                  <span className="hv-duration">{v.durationFormatted || "02:35"}</span>
                </div>
                <div className="hv-card-body">
                  <span className="hv-category">{v.channelName || "@yhoccotruyen"}</span>
                  <p className="hv-card-title">{v.title}</p>
                  <div className="hv-meta">
                    <Eye size={11} />
                    <span>{v.viewCountFormatted || "1.2K"} lượt xem</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <button className="hv-arrow hv-arrow-right" onClick={() => scroll(1)} aria-label="Cuộn phải">
          <ChevronRight size={18} />
        </button>
      </div>
    </section>
  );
}
