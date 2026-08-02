import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Navigation, EffectFade } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/effect-fade';
import './HeroBanner.css';

const slides = [
  {
    id: 1,
    bg: "linear-gradient(to right, rgba(6,46,36,0.82) 0%, rgba(6,78,59,0.4) 60%, rgba(0,0,0,0.1) 100%), url('/images/hero_banner_1.png') center/cover no-repeat",
    tag: '🌿 Tinh Hoa Dược Liệu',
    label: 'Thảo Dược Cổ Truyền\nViệt Nam',
    sub: 'TMPMS chắt lọc tinh hoa từ nguồn thảo dược thiên nhiên sạch, an toàn — chuẩn GMP-WHO',
    btn: 'Khám phá ngay',
    btnColor: '#fff',
    btnBg: 'linear-gradient(135deg,#059669,#047857)',
    color: '#fff',
    herbs: ['🌿','🍃','🌱'],
  },
  {
    id: 2,
    bg: 'linear-gradient(135deg, #022c22 0%, #064e3b 50%, #047857 100%)',
    tag: '⭐ Bán chạy số 1',
    label: 'Đông Trùng Hạ Thảo\nThượng Hạng',
    sub: 'Bồi bổ nguyên khí, tăng cường sức đề kháng và sinh lực toàn diện từ thiên nhiên',
    btn: 'Mua ngay',
    btnColor: '#064e3b',
    btnBg: '#fff',
    color: '#fff',
    herbs: ['🍄','🌿','✨'],
  },
  {
    id: 3,
    bg: 'linear-gradient(135deg, #78350f 0%, #92400e 40%, #b45309 100%)',
    tag: '🇰🇷 Nhập khẩu chính hãng',
    label: 'Hồng Sâm Hàn Quốc\n6 Năm Tuổi KGC',
    sub: 'Chuẩn hàng hiệu Cheong Kwan Jang — Tăng cường tuần hoàn máu và cải thiện sinh lực',
    btn: 'Xem sản phẩm',
    btnColor: '#78350f',
    btnBg: '#fef3c7',
    color: '#fff',
    herbs: ['🌺','🌸','💛'],
  },
  {
    id: 4,
    bg: 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 60%, #2563eb 100%)',
    tag: '🎁 Ưu đãi hôm nay',
    label: 'Bộ Sưu Tập Linh Chi\nĐỏ Cao Cấp',
    sub: 'Tăng miễn dịch, chống oxy hóa, hỗ trợ gan — Chiết xuất Linh Chi đạt chuẩn quốc tế',
    btn: 'Nhận ưu đãi',
    btnColor: '#1e3a5f',
    btnBg: '#fff',
    color: '#fff',
    herbs: ['🍀','🌿','💜'],
  },
];

const sideBanners = [
  {
    id: 1,
    bg: "linear-gradient(rgba(0,0,0,0.05), rgba(6,46,36,0.78)), url('/images/side_banner_1.png') center/cover no-repeat",
    tag: 'Chăm sóc ấm áp',
    label: 'TINH DẦU TRÀM HUẾ\nNGUYÊN CHẤT',
    link: 'Xem ngay →',
    accent: '#6ee7b7',
  },
  {
    id: 2,
    bg: "linear-gradient(rgba(0,0,0,0.05), rgba(120,53,15,0.75)), url('/images/side_banner_2.png') center/cover no-repeat",
    tag: 'Tây Nguyên sạch',
    label: 'MẬT ONG RỪNG\nNGUYÊN CHẤT',
    link: 'Xem ngay →',
    accent: '#fcd34d',
  },
];

const HeroBanner = () => (
  <div className="hero-banner">
    {/* Main Slider */}
    <div className="hero-main">
      <Swiper
        modules={[Autoplay, Navigation]}
        autoplay={{ delay: 4500, disableOnInteraction: false }}
        navigation={{ nextEl: '.hero-next', prevEl: '.hero-prev' }}
        loop
        className="hero-swiper"
      >
        {slides.map(slide => (
          <SwiperSlide key={slide.id}>
            <div className="hero-slide" style={{ background: slide.bg }}>
              {/* Floating herb decorations */}
              <div className="hero-herbs" aria-hidden="true">
                {slide.herbs.map((h, i) => (
                  <span key={i} className={`hero-herb hero-herb-${i + 1}`}>{h}</span>
                ))}
              </div>

              <div className="hero-slide-content">
                <span className="hero-tag">{slide.tag}</span>
                <h2 className="hero-title" style={{ whiteSpace: 'pre-line' }}>{slide.label}</h2>
                <p className="hero-sub">{slide.sub}</p>
                <a
                  href="#"
                  className="hero-btn"
                  style={{ background: slide.btnBg, color: slide.btnColor }}
                >
                  {slide.btn}
                </a>
              </div>

              {/* Decorative circles */}
              <div className="hero-deco hero-deco-1" />
              <div className="hero-deco hero-deco-2" />
              <div className="hero-deco hero-deco-3" />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
      <button className="hero-nav-btn hero-prev">‹</button>
      <button className="hero-nav-btn hero-next">›</button>

      {/* Slide indicator dots */}
      <div className="hero-dots" id="hero-pagination" />
    </div>

    {/* Side Banners */}
    <div className="hero-side">
      {sideBanners.map(b => (
        <div key={b.id} className="hero-side-banner" style={{ background: b.bg }}>
          <div className="side-content">
            <span className="side-sub">{b.tag}</span>
            <strong className="side-label" style={{ whiteSpace: 'pre-line' }}>{b.label}</strong>
            <a href="#" className="side-link" style={{ color: b.accent }}>
              {b.link}
            </a>
          </div>
          <div className="side-shine" />
        </div>
      ))}
    </div>
  </div>
);

export default HeroBanner;
