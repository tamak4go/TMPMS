import React, { useState, useEffect } from 'react';
import * as api from '../services/api';
import './SuppliersView.css';

const SuppliersView = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const getData = async () => {
      try {
        setLoading(true);
        setError('');
        const [suppliersData, warehousesData] = await Promise.all([
          api.fetchSuppliers(),
          api.fetchWarehouses()
        ]);
        setSuppliers(suppliersData);
        setWarehouses(warehousesData);
      } catch (err) {
        console.error(err);
        setError('Không thể tải thông tin đối tác & kho hàng.');
      } finally {
        setLoading(false);
      }
    };
    getData();
  }, []);

  return (
    <div className="suppliers-container">
      <div className="suppliers-header-block">
        <h2 className="suppliers-title">Hệ Thống Phân Phối & Kho Vận</h2>
        <p className="suppliers-subtitle">Thông tin về các công ty đối tác dược phẩm và mạng lưới kho hàng y tế</p>
      </div>

      {loading ? (
        <div className="suppliers-loading">Đang tải dữ liệu mạng lưới dược phẩm...</div>
      ) : error ? (
        <div className="suppliers-error">{error}</div>
      ) : (
        <div className="suppliers-dashboard-grid">
          {/* Column 1: Suppliers list */}
          <div className="dashboard-column">
            <h3 className="column-title">🏢 Các Đại Lý & Đối Tác Cung Cấp ({suppliers.length})</h3>
            <div className="cards-list">
              {suppliers.map(sup => (
                <div key={sup.id} className="directory-card supplier-card">
                  <div className="card-top-row">
                    <span className="supplier-company-name">{sup.company_name}</span>
                    <span className={`status-tag ${sup.status.toLowerCase()}`}>
                      {sup.status === 'Active' ? 'Hoạt động' : sup.status}
                    </span>
                  </div>
                  <div className="card-detail-info">
                    <p><strong>Người liên hệ:</strong> {sup.contact_person || 'N/A'}</p>
                    <p><strong>Điện thoại:</strong> {sup.phone || 'N/A'}</p>
                    <p><strong>Email:</strong> {sup.email || 'N/A'}</p>
                    <p><strong>Mã số thuế:</strong> <code>{sup.tax_code || 'N/A'}</code></p>
                    <p><strong>Địa chỉ:</strong> {sup.address || 'N/A'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: Warehouses list */}
          <div className="dashboard-column">
            <h3 className="column-title">📦 Hệ Thống Nhà Kho Dược Phẩm ({warehouses.length})</h3>
            <div className="cards-list">
              {warehouses.map(wh => (
                <div key={wh.id} className="directory-card warehouse-card">
                  <div className="card-top-row">
                    <span className="warehouse-name">{wh.name}</span>
                    <span className="stock-volume-tag">
                      Tồn kho: <strong>{wh.total_quantity}</strong> sp
                    </span>
                  </div>
                  <div className="card-detail-info">
                    <p><strong>Mã kho:</strong> KHO-0{wh.id}</p>
                    <p><strong>Địa chỉ nhà kho:</strong> {wh.address || 'N/A'}</p>
                  </div>
                  <div className="warehouse-capacity-bar">
                    <div className="capacity-label">Tình trạng lưu kho (Tạm tính)</div>
                    <div className="progress-bg">
                      {/* Let's render a nice mock fill bar using total_quantity */}
                      <div 
                        className="progress-fill" 
                        style={{ width: `${Math.min((wh.total_quantity / 1000) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuppliersView;
