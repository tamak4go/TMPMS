import React from 'react';
import './Navigation.css';

const navItems = [
  'Thực phẩm chức năng',
  'Dược mỹ phẩm',
  'Chăm sóc cá nhân',
  'Thuốc',
  'Thiết bị y tế',
  'Bệnh học',
  'Góc sức khỏe'
];

const Navigation = () => {
  return (
    <nav className="main-nav">
      <div className="container flex items-center gap-6 h-full">
        {navItems.map((item, index) => (
          <a key={index} href="#" className="nav-item">
            {item}
          </a>
        ))}
      </div>
    </nav>
  );
};

export default Navigation;
