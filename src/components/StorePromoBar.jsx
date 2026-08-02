import React from 'react';
import './StorePromoBar.css';

const StorePromoBar = ({ onNavigate }) => {
  const handleClick = (e) => {
    e.preventDefault();
    if (onNavigate) {
      onNavigate('store-finder');
    } else {
      window.dispatchEvent(new CustomEvent('app-navigate', { detail: 'store-finder' }));
    }
  };

  return (
    <div className="store-promo-bar">
      <div className="store-promo-inner">
        <div className="store-promo-left">
          <span className="store-promo-icon">🏪</span>
          <div>
            <div className="store-promo-count">2,501 nhà thuốc</div>
            <div className="store-promo-sub">Xem hệ thống nhà thuốc trên toàn quốc</div>
          </div>
        </div>
        <button type="button" onClick={handleClick} className="store-promo-btn">
          Xem danh sách nhà thuốc →
        </button>
      </div>
    </div>
  );
};

export default StorePromoBar;
