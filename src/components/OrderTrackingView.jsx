import React, { useEffect, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './OrderTrackingView.css';
import { Shield, Phone, Compass, RotateCcw, X, Info } from 'lucide-react';

const OrderTrackingView = ({ order, onClose }) => {
  const orderId = order.id;
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const shipperMarkerRef = useRef(null);
  const socketRef = useRef(null);

  const [trackingData, setTrackingData] = useState({
    status: 'Preparing',
    coords: { lat: 10.76008, lng: 106.68220 },
    shipper: {
      name: "Nguyễn Minh Hải",
      phone: "0912.345.678",
      plate: "59-A1 789.65"
    }
  });

  const [connected, setConnected] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (!mapInstance.current && mapRef.current) {
      const storeLat = 10.76008;
      const storeLng = 106.68220;
      const userLat = 10.75784;
      const userLng = 106.67102;
      const center = [(storeLat + userLat) / 2, (storeLng + userLng) / 2];

      // Create Map
      mapInstance.current = L.map(mapRef.current, {
        zoomControl: true,
        scrollWheelZoom: true
      }).setView(center, 15);

      // OpenStreetMap Tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapInstance.current);

      // Store Marker (Point A)
      L.marker([storeLat, storeLng], {
        icon: L.divIcon({
          html: '<div class="map-marker-emoji">🏪</div>',
          className: 'custom-leaflet-marker',
          iconSize: [36, 36],
          iconAnchor: [18, 18]
        })
      }).addTo(mapInstance.current).bindPopup('<b>🏥 Cửa hàng Long Châu</b><br>Nguồn hàng chuẩn bị');

      // User Destination Marker (Point B)
      L.marker([userLat, userLng], {
        icon: L.divIcon({
          html: '<div class="map-marker-emoji">📍</div>',
          className: 'custom-leaflet-marker',
          iconSize: [36, 36],
          iconAnchor: [18, 18]
        })
      }).addTo(mapInstance.current).bindPopup(`<b>🏠 Địa chỉ người nhận</b><br>${order.shipping_address || order.shippingAddress || 'Địa chỉ khách hàng'}`);

      // Route Line
      L.polyline([[storeLat, storeLng], [userLat, userLng]], {
        color: '#0f766e',
        dashArray: '6, 12',
        weight: 3,
        opacity: 0.8
      }).addTo(mapInstance.current);

      // Shipper Marker (Moving)
      shipperMarkerRef.current = L.marker([storeLat, storeLng], {
        icon: L.divIcon({
          html: '<div class="map-marker-shipper-emoji">🏍️</div>',
          className: 'custom-leaflet-shipper',
          iconSize: [42, 42],
          iconAnchor: [21, 21]
        })
      }).addTo(mapInstance.current).bindPopup('<b>🚴 Shipper đang giao hàng</b>');
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [order]);

  // Setup SignalR Connection
  useEffect(() => {
    const hubUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/trackingHub`;
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl)
      .withAutomaticReconnect()
      .build();

    connection.start()
      .then(() => {
        setConnected(true);
        console.log(`SignalR connected for order #${orderId}`);
        connection.invoke("JoinOrderTrackingGroup", orderId.toString())
          .catch(err => console.error("Error joining SignalR group:", err));
      })
      .catch(err => {
        console.error("SignalR connection error:", err);
        setConnected(false);
      });

    connection.on("ReceiveTrackingUpdate", (data) => {
      console.log('Received shipper tick from SignalR:', data);
      setTrackingData(prev => ({
        ...prev,
        status: data.status,
        coords: data.coords || prev.coords,
        shipper: data.shipper || prev.shipper
      }));

      // Animate/move marker
      if (data.coords && shipperMarkerRef.current) {
        const { lat, lng } = data.coords;
        shipperMarkerRef.current.setLatLng([lat, lng]);
        
        // Center map on moving shipper
        if (mapInstance.current) {
          mapInstance.current.panTo([lat, lng]);
        }
      }
    });

    connection.onclose(() => {
      setConnected(false);
    });

    connection.onreconnected(() => {
      setConnected(true);
      connection.invoke("JoinOrderTrackingGroup", orderId.toString())
        .catch(err => console.error("Error rejoining SignalR group:", err));
    });

    socketRef.current = connection;

    return () => {
      if (connection) {
        connection.invoke("LeaveOrderTrackingGroup", orderId.toString())
          .then(() => connection.stop())
          .catch(err => console.error("Error stopping SignalR:", err));
      }
    };
  }, [orderId]);

  const restartSimulation = () => {
    if (socketRef.current && connected) {
      socketRef.current.invoke("LeaveOrderTrackingGroup", orderId.toString())
        .then(() => {
          socketRef.current.invoke("JoinOrderTrackingGroup", orderId.toString());
        })
        .catch(err => console.error(err));
    }
  };

  const getStepClass = (step) => {
    const statusHierarchy = ['Preparing', 'Shipping', 'Arrived'];
    const currentIdx = statusHierarchy.indexOf(trackingData.status);
    const targetIdx = statusHierarchy.indexOf(step);

    if (currentIdx > targetIdx) return 'step-done';
    if (currentIdx === targetIdx) return 'step-active';
    return 'step-waiting';
  };

  return (
    <div className="tracking-modal-backdrop">
      <div className="tracking-modal-card">
        {/* Header */}
        <div className="tracking-modal-header">
          <div className="header-title">
            <h3>Theo Dõi Vận Chuyển Đơn Hàng #{orderId}</h3>
            <span className={`connection-badge ${connected ? 'online' : 'offline'}`}>
              {connected ? '● Kết nối SignalR: Đã thiết lập' : '● Kết nối SignalR: Mất kết nối'}
            </span>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="tracking-modal-body">
          {/* Map Section */}
          <div className="map-wrapper">
            <div ref={mapRef} className="leaflet-map-container" />
            
            {/* Real-time Indicator on Map */}
            <div className="realtime-status-pill">
              <span className="pulse-circle"></span>
              <span>Định vị Shipper trực tuyến (GPS Real-time)</span>
            </div>
          </div>

          {/* Info Side Panel */}
          <div className="tracking-info-panel">
            {/* Status Stepper */}
            <div className="stepper-card">
              <h4>Trạng Thái Vận Chuyển</h4>
              <div className="delivery-stepper">
                <div className={`step-node ${getStepClass('Preparing')}`}>
                  <div className="node-icon">🍳</div>
                  <span>Chuẩn bị hàng</span>
                </div>
                <div className={`step-bar ${getStepClass('Shipping') === 'step-done' || getStepClass('Shipping') === 'step-active' ? 'active' : ''}`} />
                
                <div className={`step-node ${getStepClass('Shipping')}`}>
                  <div className="node-icon">🏍️</div>
                  <span>Đang giao hàng</span>
                </div>
                <div className={`step-bar ${getStepClass('Arrived') === 'step-done' || getStepClass('Arrived') === 'step-active' ? 'active' : ''}`} />
                
                <div className={`step-node ${getStepClass('Arrived')}`}>
                  <div className="node-icon">🏠</div>
                  <span>Đã đến nơi</span>
                </div>
              </div>
            </div>

            {/* Shipper Details */}
            <div className="shipper-card">
              <h4>Thông Tin Tài Xế (Shipper)</h4>
              {trackingData.shipper ? (
                <div className="shipper-profile">
                  <div className="shipper-avatar">👤</div>
                  <div className="shipper-meta">
                    <span className="shipper-name">{trackingData.shipper.name}</span>
                    <span className="shipper-plate">Biển số: {trackingData.shipper.plate}</span>
                    <a href={`tel:${trackingData.shipper.phone}`} className="shipper-phone-link">
                      <Phone size={14} /> {trackingData.shipper.phone}
                    </a>
                  </div>
                </div>
              ) : (
                <div className="no-shipper">Chưa tìm thấy thông tin tài xế.</div>
              )}
            </div>

            {/* Simulation controls */}
            <div className="controls-card">
              <h4>Mô phỏng (Simulation Panel)</h4>
              <p>Mô phỏng hành trình tài xế từ hiệu thuốc đến tay khách hàng dọc theo tuyến đường chim bay.</p>
              
              <div className="control-buttons">
                <button className="restart-btn" onClick={restartSimulation}>
                  <RotateCcw size={15} /> Khởi động lại hành trình
                </button>
              </div>
            </div>

            {/* Webhook Developer Guide */}
            <div className="webhook-dev-card">
              <div className="dev-header">
                <Info size={16} />
                <h5>Hướng dẫn thử nghiệm Webhook (Tốt nghiệp)</h5>
              </div>
              <p>Có thể gửi request đổi trạng thái trực tiếp bằng Postman để test Webhook đối tác:</p>
              <pre className="dev-code">
POST /api/shipping/webhook
Body:
&#123;
  "orderId": {orderId},
  "status": "Shipping",
  "coords": &#123; "lat": 10.759, "lng": 106.678 &#125;,
  "shipper": &#123; 
    "name": "Shipper Webhook", 
    "phone": "0999999999", 
    "plate": "59-W1 999.99" 
  &#125;
&#125;
              </pre>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTrackingView;
