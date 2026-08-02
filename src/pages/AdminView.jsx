import React, { useState, useEffect } from 'react';
import * as api from '../services/api';
import { 
  ShoppingCart, Star, Leaf, Eye, Calendar, Plus, Edit2, Trash2, 
  User, Users, Activity, FileText, Package, BarChart2, Shield, Check, X, Info, Tag, MessageSquare, Upload
} from 'lucide-react';
import PharmacyChatDashboard from '../components/admin/PharmacyChatDashboard';
import {
  getPrescriptionStatusClass,
  getPrescriptionStatusLabel,
  PRESCRIPTION_ACTION,
} from '../utils/prescriptionStatus';
import { toLocalWallClockIso } from '../utils/dateTime';
import './AdminView.css';

const FALLBACK_MED_IMG = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'><rect width='60' height='60' fill='%23e5e7eb'/><text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' font-size='26'>🌿</text></svg>";

const ORDER_FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'Pending', label: 'Đang xử lý' },
  { key: 'Shipping', label: 'Đang giao' },
  { key: 'Delivered', label: 'Đã giao' },
  { key: 'Cancelled', label: 'Đã hủy' },
  { key: 'Returned', label: 'Trả hàng' }
];

const AdminView = () => {
  const [activeTab, setActiveTab] = useState('orders'); // orders | patients | appointments | prescriptions | inventory | users | stats | products
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data States
  const [orders, setOrders] = useState([]);
  const [orderFilter, setOrderFilter] = useState('all');
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [users, setUsers] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [reportData, setReportData] = useState(null);

  // Voucher form state
  const [editingVoucherId, setEditingVoucherId] = useState(null);
  const [voucherForm, setVoucherForm] = useState({
    code: '', name: '', discount_type: 'percent', discount_value: '',
    min_order_value: '', max_discount: '', end_date: '', usage_limit: 100, is_active: true
  });

  // Form States - Patient
  const [patientModal, setPatientModal] = useState(null); // 'add' | 'edit' | null
  const [currentPatient, setCurrentPatient] = useState({ name: '', gender: 'Nam', dateOfBirth: '', phone: '', address: '', medicalHistory: '' });

  // Form States - Appointment
  const [appointmentModal, setAppointmentModal] = useState(null); // 'add' | 'edit' | null
  const [currentAppointment, setCurrentAppointment] = useState({ patientId: '', doctorId: '', appointmentDate: '', reason: '', status: 'Scheduled', notes: '' });

  // Form States - Prescription
  const [prescriptionModal, setPrescriptionModal] = useState(null); // 'add' | null
  const [currentPrescription, setCurrentPrescription] = useState({ patientId: '', doctorName: 'Bác sĩ Đông Y', hospital: 'Phòng khám Đông Y', items: [] });
  const [selectedMedicineId, setSelectedMedicineId] = useState('');
  const [selectedMedicineQty, setSelectedMedicineQty] = useState(1);
  const [hideOutOfStock, setHideOutOfStock] = useState(true);

  // Form States - Product (Herbal Medicine)
  const [prodName, setProdName] = useState('');
  const [prodCategoryId, setProdCategoryId] = useState(1); // Default to Herbal TPCN
  const [prodSupplierId, setProdSupplierId] = useState(1);
  const [prodPrice, setProdPrice] = useState('');
  const [prodOldPrice, setProdOldPrice] = useState('');
  const [prodStock, setProdStock] = useState('100');
  const [prodUnit, setProdUnit] = useState('Hộp');
  const [prodOrigin, setProdOrigin] = useState('Việt Nam');
  const [prodPackaging, setProdPackaging] = useState('');
  const [prodImgUrl, setProdImgUrl] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodReqPrescription, setProdReqPrescription] = useState(false);

  // Excel Bulk Import State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importPreviewData, setImportPreviewData] = useState(null);
  const [importSessionId, setImportSessionId] = useState('');
  const [importSelectedRows, setImportSelectedRows] = useState(new Set());
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // Current logged in user profile (from localStorage)
  const [loggedInUser, setLoggedInUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setLoggedInUser(parsedUser);
      if (parsedUser.role_id === 1) {
        setActiveTab('users');
      } else {
        setActiveTab('orders');
      }
    }
  }, []);

  // Main Loader
  useEffect(() => {
    loadTabContent();
  }, [activeTab]);

  const loadTabContent = async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'orders') {
        const data = await api.fetchAdminOrders();
        setOrders(data);
      } else if (activeTab === 'patients') {
        const data = await api.fetchPatients();
        setPatients(data);
      } else if (activeTab === 'appointments') {
        const data = await api.fetchAppointments();
        setAppointments(data);
        const usersData = await api.fetchUsers();
        setUsers(usersData.filter(u => u.role_id === 3)); // Only doctors
        const patientsData = await api.fetchPatients();
        setPatients(patientsData);
      } else if (activeTab === 'prescriptions') {
        const data = await api.fetchPrescriptions();
        setPrescriptions(data);
        const patientsData = await api.fetchPatients();
        setPatients(patientsData);
        const medData = await api.fetchMedicines(null, '', null, null, true);
        setMedicines(medData);
        const apptsData = await api.fetchAppointments();
        setAppointments(apptsData);
        const usersData = await api.fetchUsers();
        setUsers(usersData.filter(u => u.role_id === 3)); // Only doctors for pharmacist authorization select
      } else if (activeTab === 'inventory') {
        const data = await api.fetchWarehouses();
        setWarehouses(data);
      } else if (activeTab === 'users') {
        const data = await api.fetchUsers();
        setUsers(data);
      } else if (activeTab === 'stats') {
        const [ordersData, patientsData, appointmentsData, medData, repData] = await Promise.all([
          api.fetchAdminOrders().catch(() => []),
          api.fetchPatients().catch(() => []),
          api.fetchAppointments().catch(() => []),
          api.fetchMedicines(null, '', null, null, true).catch(() => []),
          api.fetchReportDashboard().catch(err => { console.warn(err); return null; })
        ]);
        setOrders(ordersData);
        setPatients(patientsData);
        setAppointments(appointmentsData);
        setMedicines(medData);
        setReportData(repData);
      } else if (activeTab === 'products') {
        const medData = await api.fetchMedicines(null, '', null, null, true);
        setMedicines(medData);
      } else if (activeTab === 'vouchers') {
        const data = await api.fetchAdminVouchers();
        setVouchers(data);
      }
    } catch (err) {
      console.error(err);
      setError('Lỗi tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  // Roles Authorization
  const hasAccess = (allowedRoles) => {
    if (!loggedInUser) return false;
    return allowedRoles.includes(loggedInUser.role_id);
  };

  // Orders functions
  const handleStatusChange = async (orderId, newStatus) => {
    if (!hasAccess([3])) {
      setError('Chỉ nhân viên nhà thuốc có quyền cập nhật trạng thái đơn hàng.');
      return;
    }
    try {
      await api.updateOrderStatus(orderId, { status: newStatus });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      showSuccess('Cập nhật trạng thái đơn hàng thành công!');
    } catch (err) {
      setError(err.message || 'Lỗi khi cập nhật trạng thái đơn hàng.');
    }
  };

  const handleConfirmDelivered = async (orderId) => {
    if (!hasAccess([3])) {
      setError('Chỉ nhân viên nhà thuốc có quyền xác nhận đã giao.');
      return;
    }
    try {
      await api.updateOrderStatus(orderId, { status: 'Delivered' });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'Delivered' } : o));
      showSuccess('Đã xác nhận đơn hàng giao thành công!');
    } catch (err) {
      setError('Lỗi khi xác nhận đã giao đơn hàng.');
    }
  };

  // COD: xác nhận đã thu tiền mặt khi giao hàng (chỉ đơn đã giao, chưa thu, thanh toán COD)
  const handleConfirmCashCollected = async (order) => {
    if (!hasAccess([1, 3, 6])) {
      setError('Bạn không có quyền xác nhận thu tiền.');
      return;
    }
    if (!order.paymentId) {
      setError('Đơn hàng chưa có bản ghi thanh toán để cập nhật.');
      return;
    }
    if (!window.confirm(`Xác nhận đã thu tiền mặt ${formatPrice(order.total_amount || order.totalAmount)} của đơn #${order.id}?`)) return;
    try {
      await api.updatePaymentStatus(order.paymentId, 'Success');
      showSuccess(`Đã xác nhận thu tiền đơn #${order.id}!`);
      await loadTabContent();
    } catch (err) {
      setError('Lỗi khi xác nhận thu tiền đơn hàng.');
    }
  };

  const handleApproveReturn = async (order) => {
    if (!hasAccess([3])) {
      setError('Chỉ nhân viên nhà thuốc có quyền duyệt trả hàng.');
      return;
    }
    if (!window.confirm(`Duyệt trả hàng cho đơn #${order.id}?\nSố tiền ${formatPrice(order.total_amount || order.totalAmount)} sẽ được hoàn lại cho khách hàng.`)) return;
    try {
      await api.updateOrderStatus(order.id, { status: 'Returned', paymentStatus: 'Refunded' });
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'Returned', paymentStatus: 'Refunded', payment_status: 'Refunded' } : o));
      showSuccess('Đã duyệt trả hàng và hoàn tiền cho khách hàng!');
    } catch (err) {
      setError('Lỗi khi duyệt trả hàng.');
    }
  };

  const handleRejectReturn = async (order) => {
    if (!hasAccess([3])) {
      setError('Chỉ nhân viên nhà thuốc có quyền từ chối trả hàng.');
      return;
    }
    if (!window.confirm(`Từ chối yêu cầu trả hàng của đơn #${order.id}?`)) return;
    try {
      await api.updateOrderStatus(order.id, { status: 'Delivered' });
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'Delivered', returnReason: '' } : o));
      showSuccess('Đã từ chối yêu cầu trả hàng.');
    } catch (err) {
      setError('Lỗi khi từ chối trả hàng.');
    }
  };

  const filteredOrders = orders.filter(o => {
    if (orderFilter === 'all') return true;
    if (orderFilter === 'Returned') return o.status === 'Returned' || o.status === 'ReturnRequested';
    return o.status === orderFilter;
  });

  const returnRequests = orders.filter(o => o.status === 'ReturnRequested');

  // Payment reconcile - only Admin/Accountant (Pharmacy chỉ xem)
  const handlePaymentReconcile = async (order, newPaymentStatus) => {
    if (!hasAccess([1, 6])) {
      setError('Chỉ Quản trị viên hoặc Kế toán mới được đối soát thanh toán.');
      return;
    }
    if (!order.paymentId) {
      setError('Đơn hàng chưa có bản ghi thanh toán để cập nhật.');
      return;
    }
    const statusMap = {
      Paid: 'Success',
      Success: 'Success',
      Unpaid: 'Pending',
      Pending: 'Pending',
      Failed: 'Failed',
      Refunded: 'Refunded',
    };
    try {
      await api.updatePaymentStatus(order.paymentId, statusMap[newPaymentStatus] || newPaymentStatus);
      showSuccess('Cập nhật trạng thái thanh toán thành công!');
      await loadTabContent();
    } catch (err) {
      setError('Lỗi khi cập nhật thanh toán.');
    }
  };

  // Patients functions
  const handlePatientSubmit = async (e) => {
    e.preventDefault();
    if (!hasAccess([3])) {
      setError('Chỉ nhân viên nhà thuốc có quyền chỉnh sửa thông tin bệnh nhân.');
      return;
    }
    try {
      if (patientModal === 'add') {
        const added = await api.createPatient(currentPatient);
        setPatients(prev => [added, ...prev]);
        showSuccess('Thêm bệnh nhân thành công!');
      } else {
        const updated = await api.updatePatient(currentPatient.id, currentPatient);
        setPatients(prev => prev.map(p => p.id === currentPatient.id ? updated : p));
        showSuccess('Cập nhật bệnh nhân thành công!');
      }
      setPatientModal(null);
    } catch (err) {
      setError(err.message || 'Lỗi khi lưu bệnh nhân.');
    }
  };

  const handleDeletePatient = async (id) => {
    if (!hasAccess([3])) {
      setError('Chỉ nhân viên nhà thuốc có quyền xóa bệnh nhân.');
      return;
    }
    if (!window.confirm('Bạn có chắc chắn muốn xóa bệnh nhân này? Tất cả hồ sơ liên quan sẽ bị xóa.')) return;
    try {
      await api.deletePatient(id);
      setPatients(prev => prev.filter(p => p.id !== id));
      showSuccess('Xóa bệnh nhân thành công!');
    } catch (err) {
      setError('Lỗi khi xóa bệnh nhân.');
    }
  };

  // Appointments functions
  const handleAppointmentSubmit = async (e) => {
    e.preventDefault();
    if (!hasAccess([3])) {
      setError('Chỉ nhân viên nhà thuốc có quyền điều chỉnh lịch hẹn.');
      return;
    }
    try {
      const payload = {
        patientId: parseInt(currentAppointment.patientId),
        doctorId: currentAppointment.doctorId ? parseInt(currentAppointment.doctorId) : null,
        appointmentDate: toLocalWallClockIso(currentAppointment.appointmentDate),
        reason: currentAppointment.reason,
        status: currentAppointment.status,
        notes: currentAppointment.notes
      };

      if (appointmentModal === 'add') {
        await api.createAppointment(payload);
        showSuccess('Tạo lịch hẹn thành công!');
      } else {
        await api.updateAppointment(currentAppointment.id, payload);
        showSuccess('Cập nhật lịch hẹn thành công!');
      }
      setAppointmentModal(null);
      loadTabContent();
    } catch (err) {
      setError('Lỗi khi lưu lịch hẹn.');
    }
  };

  const handleDeleteAppointment = async (id) => {
    if (!hasAccess([3])) {
      setError('Chỉ nhân viên nhà thuốc có quyền xóa lịch hẹn.');
      return;
    }
    if (!window.confirm('Xóa lịch hẹn này?')) return;
    try {
      await api.deleteAppointment(id);
      setAppointments(prev => prev.filter(a => a.id !== id));
      showSuccess('Xóa lịch hẹn thành công!');
    } catch (err) {
      setError('Lỗi khi xóa lịch hẹn.');
    }
  };

  // Prescription functions
  const addMedicineToPrescription = () => {
    if (!selectedMedicineId) return;
    const med = medicines.find(m => m.id === parseInt(selectedMedicineId));
    if (!med) return;

    const existingInDraft = currentPrescription.items.find(i => i.medicineId === med.id);
    const addedQty = existingInDraft ? existingInDraft.quantity : 0;
    const stockInDb = med.stock_quantity ?? med.stockQuantity ?? 0;
    const availableStock = stockInDb - addedQty;

    if (availableStock <= 0) {
      setError(`Vị thuốc/dược phẩm '${med.name}' hiện đã hết hàng khả dụng trong kho!`);
      return;
    }
    if (selectedMedicineQty > availableStock) {
      setError(`Vị thuốc/dược phẩm '${med.name}' chỉ còn ${availableStock}${med.unit || 'g'} khả dụng trong kho, không đủ để kê ${selectedMedicineQty}${med.unit || 'g'}!`);
      return;
    }

    if (existingInDraft) {
      setCurrentPrescription(prev => ({
        ...prev,
        items: prev.items.map(i => i.medicineId === med.id ? { ...i, quantity: i.quantity + selectedMedicineQty } : i)
      }));
    } else {
      setCurrentPrescription(prev => ({
        ...prev,
        items: [...prev.items, { medicineId: med.id, medicineName: med.name, quantity: selectedMedicineQty }]
      }));
    }
    setSelectedMedicineId('');
    setSelectedMedicineQty(1);
    setError('');
  };

  const removeMedicineFromPrescription = (id) => {
    setCurrentPrescription(prev => ({
      ...prev,
      items: prev.items.filter(i => i.medicineId !== id)
    }));
  };

  const handlePrescriptionSubmit = async (e) => {
    e.preventDefault();
    if (!hasAccess([3])) {
      setError('Chỉ nhân viên nhà thuốc có quyền kê đơn thuốc.');
      return;
    }
    const patientIdInt = parseInt(currentPrescription.patientId) || patients[0]?.id || 1;
    if (!patientIdInt) {
      setError('Vui lòng chọn bệnh nhân!');
      return;
    }
    if (currentPrescription.items.length === 0) {
      setError('Vui lòng thêm ít nhất một vị thuốc/thảo dược vào đơn thuốc!');
      return;
    }

    try {
      const payload = {
        userId: patientIdInt,
        patientId: patientIdInt,
        appointmentId: currentPrescription.appointmentId ? parseInt(currentPrescription.appointmentId) : null,
        doctorName: currentPrescription.doctorName || 'Bác sĩ Đông Y',
        hospital: currentPrescription.hospital || 'Phòng khám Đông Y TMPMS',
        diagnosisNote: currentPrescription.diagnosisNote || 'Thể bệnh Tâm Tỳ Lưỡng Hư',
        items: currentPrescription.items.map(i => ({
          medicineId: parseInt(i.medicineId),
          quantity: parseInt(i.quantity)
        }))
      };

      await api.createPrescription(payload);
      showSuccess('Kê đơn thuốc Đông Y thành công!');

      // Cập nhật ngay tồn kho trong state FE để giao diện phản hồi tức thì
      setMedicines(prev => prev.map(m => {
        const item = currentPrescription.items.find(i => i.medicineId === m.id);
        if (item) {
          const oldStock = m.stock_quantity ?? m.stockQuantity ?? 0;
          const newStock = Math.max(0, oldStock - item.quantity);
          return { ...m, stock_quantity: newStock, stockQuantity: newStock };
        }
        return m;
      }));

      setPrescriptionModal(null);
      await loadTabContent();
    } catch (err) {
      setError(err.message || 'Không thể kê đơn thuốc. Vui lòng kiểm tra lại.');
    }
  };

  const handlePrescriptionStatus = async (id, status) => {
    if (!hasAccess([3])) {
      setError('Chỉ nhân viên nhà thuốc có quyền duyệt/từ chối đơn thuốc.');
      return;
    }
    try {
      await api.updatePrescriptionStatus(id, status);
      setPrescriptions(prev => prev.map(p => p.id === id ? { ...p, status } : p));
      showSuccess('Cập nhật đơn thuốc thành công!');
    } catch (err) {
      setError('Lỗi cập nhật trạng thái đơn thuốc.');
    }
  };

  // User Administration
  const handleUserRoleChange = async (userId, roleName) => {
    if (!hasAccess([1])) {
      setError('Chỉ Quản trị viên hệ thống (Admin) có quyền phân quyền người dùng.');
      return;
    }
    try {
      await api.updateUserRole(userId, roleName);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, roleName: roleName } : u));
      showSuccess('Cập nhật quyền người dùng thành công!');
      loadTabContent();
    } catch (err) {
      setError('Lỗi khi đổi quyền người dùng.');
    }
  };

  const handleUserStatusToggle = async (userId, currentStatus) => {
    if (!hasAccess([1])) {
      setError('Chỉ Quản trị viên hệ thống (Admin) có quyền kích hoạt/khóa tài khoản.');
      return;
    }
    try {
      await api.toggleUserStatus(userId, !currentStatus);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !currentStatus } : u));
      showSuccess('Cập nhật trạng thái hoạt động thành công!');
    } catch (err) {
      setError('Lỗi khi thay đổi trạng thái hoạt động.');
    }
  };

  const [editingMedicineId, setEditingMedicineId] = useState(null);

  const handleEditMedicineClick = (medicine) => {
    setEditingMedicineId(medicine.id);
    setProdName(medicine.name || '');
    setProdCategoryId(medicine.category_id || 1);
    setProdSupplierId(medicine.supplier_id || 1);
    setProdPrice(medicine.price || '');
    setProdOldPrice(medicine.old_price || '');
    setProdStock(medicine.stock_quantity || '');
    setProdUnit(medicine.unit || 'Hộp');
    setProdOrigin(medicine.origin || 'Việt Nam');
    setProdPackaging(medicine.packaging || '');
    setProdImgUrl(medicine.image_url || '');
    setProdDesc(medicine.description || '');
    setProdReqPrescription(medicine.requires_prescription || false);
  };

  const handleCancelProductEdit = () => {
    setEditingMedicineId(null);
    setProdName('');
    setProdCategoryId(1);
    setProdSupplierId(1);
    setProdPrice('');
    setProdOldPrice('');
    setProdStock('100');
    setProdUnit('Hộp');
    setProdOrigin('Việt Nam');
    setProdPackaging('');
    setProdImgUrl('');
    setProdDesc('');
    setProdReqPrescription(false);
  };

  const handleDeleteMedicine = async (id) => {
    if (!hasAccess([1])) {
      setError('Chỉ Admin có quyền xóa thuốc.');
      return;
    }
    if (!window.confirm('Bạn có chắc chắn muốn xóa vị thuốc này khỏi hệ thống?')) return;
    try {
      await api.deleteMedicine(id);
      setMedicines(prev => prev.filter(m => m.id !== id));
      showSuccess('Xóa vị thuốc thành công!');
    } catch (err) {
      setError('Lỗi khi xóa vị thuốc.');
    }
  };

  // ---- Excel Bulk Import Handlers ----
  const handleImportPreview = async () => {
    if (!importFile) { setError('Vui lòng chọn file Excel (.xlsx)'); return; }
    setImportLoading(true);
    setError('');
    try {
      const data = await api.previewImport(importFile);
      setImportPreviewData(data);
      setImportSessionId(data.importSessionId);
      // Mặc định tick tất cả dòng không lỗi
      const defaultSelected = new Set(
        data.rows.filter(r => r.status !== 'Error' && r.status !== 'Delete').map(r => r.rowIndex)
      );
      setImportSelectedRows(defaultSelected);
      setImportResult(null);
    } catch (err) {
      setError(err.message || 'Không thể đọc file Excel');
    } finally {
      setImportLoading(false);
    }
  };

  const handleImportConfirm = async () => {
    if (!importSessionId || importSelectedRows.size === 0) {
      setError('Vui lòng chọn ít nhất 1 dòng để nhập');
      return;
    }
    setImportLoading(true);
    setError('');
    try {
      const result = await api.confirmImport(importSessionId, Array.from(importSelectedRows));
      setImportResult(result);
      setImportPreviewData(null);
      setImportSessionId('');
      // Reload danh sách thuốc
      const meds = await api.fetchMedicines(null, '', null, null, true);
      setMedicines(meds);
      const msgs = [];
      if (result.successCount > 0) msgs.push(`Thêm/Cập nhật ${result.successCount} SP`);
      if (result.deletedCount > 0) msgs.push(`Xóa ${result.deletedCount} SP`);
      showSuccess(`Đồng bộ thành công! ${msgs.join(' — ')}`);
    } catch (err) {
      setError(err.message || 'Không thể xác nhận nhập hàng loạt');
    } finally {
      setImportLoading(false);
    }
  };

  const toggleImportRow = (rowIndex) => {
    setImportSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(rowIndex)) next.delete(rowIndex);
      else next.add(rowIndex);
      return next;
    });
  };

  const handleCloseImportModal = () => {
    setShowImportModal(false);
    setImportFile(null);
    setImportPreviewData(null);
    setImportSessionId('');
    setImportSelectedRows(new Set());
    setImportResult(null);
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch(api.getImportTemplateUrl());
      if (!res.ok) throw new Error('Không thể tải file mẫu');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mau_nhap_duoc_pham.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || 'Lỗi khi tải file mẫu');
    }
  };

  const handleDownloadExport = async () => {
    try {
      const res = await fetch(api.getExportUrl());
      if (!res.ok) throw new Error('Không thể xuất file danh mục');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `danh_muc_duoc_pham_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || 'Lỗi khi xuất danh mục Excel');
    }
  };

  // Add/Edit Product (Herbal Catalog)
  const handleProductSubmit = async (e) => {
    e.preventDefault();
    if (!hasAccess([1])) {
      setError('Chỉ Admin có quyền quản lý kho dược phẩm.');
      return;
    }

    if (!prodName.trim() || !prodPrice || !prodImgUrl.trim()) {
      setError('Vui lòng điền đầy đủ Tên, Giá, và Ảnh sản phẩm!');
      return;
    }

    try {
      const payload = {
        name: prodName,
        category_id: parseInt(prodCategoryId),
        supplier_id: parseInt(prodSupplierId),
        price: parseFloat(prodPrice),
        old_price: prodOldPrice ? parseFloat(prodOldPrice) : null,
        stock_quantity: parseInt(prodStock),
        unit: prodUnit,
        origin: prodOrigin,
        packaging: prodPackaging,
        image_url: prodImgUrl,
        description: prodDesc,
        requires_prescription: prodReqPrescription,
        manufacture_date: new Date(),
        expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      };

      if (editingMedicineId) {
        const updated = await api.updateMedicine(editingMedicineId, payload);
        showSuccess('Cập nhật thông tin thảo dược thành công!');
        setMedicines(prev => prev.map(m => m.id === editingMedicineId ? { ...m, ...payload, id: editingMedicineId } : m));
      } else {
        const added = await api.addMedicine(payload);
        showSuccess('Thêm thảo dược mới thành công!');
        setMedicines(prev => [added, ...prev]);
      }
      
      handleCancelProductEdit();
    } catch (err) {
      setError('Lỗi khi lưu sản phẩm. Vui lòng kiểm tra lại!');
    }
  };


  // Helper Formats
  const formatPrice = (price) => {
    if (price == null) return 'Liên hệ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  // Stats Logic
  const getStats = () => {
    if (reportData) {
      return {
        revenue: reportData.totalRevenue !== undefined ? reportData.totalRevenue : (reportData.TotalRevenue || 0),
        ordersCount: reportData.totalOrders !== undefined ? reportData.totalOrders : (reportData.TotalOrders || 0),
        patientsCount: reportData.totalCustomers !== undefined ? reportData.totalCustomers : (reportData.TotalCustomers || patients.length),
        appointmentsCount: appointments.length,
        pendingOrders: orders.filter(o => o.status === 'Pending').length,
        activeAppointments: appointments.filter(a => a.status === 'Scheduled' || a.status === 'Confirmed').length,
        lowStockCount: reportData.lowStockCount !== undefined ? reportData.lowStockCount : (reportData.LowStockCount || 0),
        medicinesCount: reportData.totalMedicines !== undefined ? reportData.totalMedicines : (reportData.TotalMedicines || medicines.length)
      };
    }

    const totalRev = orders.filter(o => o.payment_status === 'Paid').reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
    const lowStock = medicines.filter(m => m.stock_quantity < 20);
    return {
      revenue: totalRev,
      ordersCount: orders.length,
      patientsCount: patients.length,
      appointmentsCount: appointments.length,
      pendingOrders: orders.filter(o => o.status === 'Pending').length,
      activeAppointments: appointments.filter(a => a.status === 'Scheduled').length,
      lowStockCount: lowStock.length,
      medicinesCount: medicines.length
    };
  };

  const stats = activeTab === 'stats' ? getStats() : {};

  return (
    <div className="admin-container">
      {/* Role Banner / Auth details */}
      <div className="admin-role-badge">
        <Shield size={16} />
        <span>Tài khoản: <strong>{loggedInUser?.username}</strong> - Vai trò: 
          <strong className="role-highlight">
            {loggedInUser?.role_id === 1 && ' Quản trị viên (Admin)'}
            {loggedInUser?.role_id === 3 && ' Nhân viên Nhà thuốc (Pharmacy)'}
          </strong>
        </span>
      </div>

      <div className="admin-header">
        <div className="admin-title-wrap">
          <Leaf className="admin-title-icon" />
          <h2 className="admin-title">
            {loggedInUser?.role_id === 1 ? 'Bảng Quản Trị Hệ Thống' : 'Bảng Điều Hành Nhà Thuốc & Lâm Sàng'}
          </h2>
        </div>
        
        {/* Navigation Tabs based on Role */}
        <div className="admin-tabs">
          {/* PHARMACY TABS: Orders, Patients, Appointments, Prescriptions, Inventory, Stats */}
          {hasAccess([3]) && (
            <button className={`admin-tab-btn ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
              <ShoppingCart size={16} /> Đơn hàng
            </button>
          )}
          {hasAccess([3]) && (
            <button className={`admin-tab-btn ${activeTab === 'patients' ? 'active' : ''}`} onClick={() => setActiveTab('patients')}>
              <Users size={16} /> Hồ sơ Bệnh nhân
            </button>
          )}
          {hasAccess([3]) && (
            <button className={`admin-tab-btn ${activeTab === 'appointments' ? 'active' : ''}`} onClick={() => setActiveTab('appointments')}>
              <Calendar size={16} /> Lịch hẹn Khám
            </button>
          )}
          {hasAccess([3]) && (
            <button className={`admin-tab-btn ${activeTab === 'prescriptions' ? 'active' : ''}`} onClick={() => setActiveTab('prescriptions')}>
              <FileText size={16} /> Chẩn đoán & Kê đơn
            </button>
          )}
          {hasAccess([3]) && (
            <button className={`admin-tab-btn ${activeTab === 'inventory' ? 'active' : ''}`} onClick={() => setActiveTab('inventory')}>
              <Package size={16} /> Kho Dược liệu
            </button>
          )}
          {hasAccess([3]) && (
            <button className={`admin-tab-btn ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>
              <BarChart2 size={16} /> Báo cáo & Thống kê
            </button>
          )}
          {hasAccess([1, 3]) && (
            <button className={`admin-tab-btn ${activeTab === 'pharmacy-chat' ? 'active' : ''}`} onClick={() => setActiveTab('pharmacy-chat')}>
              <MessageSquare size={16} /> Tư vấn trực tuyến
            </button>
          )}

          {/* ADMIN TABS: User Management + Medicine CRUD + Vouchers */}
          {hasAccess([1]) && (
            <button className={`admin-tab-btn ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
              <User size={16} /> Quản lý Người dùng
            </button>
          )}
          {hasAccess([1]) && (
            <button className={`admin-tab-btn ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')}>
              <Package size={16} /> Quản lý Dược phẩm
            </button>
          )}
          {hasAccess([1]) && (
            <button className={`admin-tab-btn ${activeTab === 'vouchers' ? 'active' : ''}`} onClick={() => setActiveTab('vouchers')}>
              <Tag size={16} /> Voucher & Khuyến mãi
            </button>
          )}
        </div>
      </div>

      {success && <div className="admin-success-msg">{success}</div>}
      {error && <div className="admin-error-msg">{error}</div>}

      {loading ? (
        <div className="admin-loading">
          <div className="loading-spinner"></div>
          <p>Đang tải dữ liệu và biên dịch báo cáo...</p>
        </div>
      ) : (
        <div className="admin-tab-content">
          
          {/* TAB: ORDERS & INVOICES */}
          {activeTab === 'orders' && (
            <div className="admin-card">
              <h3 className="card-title">Quản lý Đơn đặt hàng & Thu tiền</h3>

              {/* Return approval area */}
              {returnRequests.length > 0 && (
                <div className="return-approval-box">
                  <h4 className="return-approval-title">🔄 Yêu cầu trả hàng chờ duyệt ({returnRequests.length})</h4>
                  {returnRequests.map(r => (
                    <div key={r.id} className="return-approval-row">
                      <div className="return-approval-info">
                        <div className="return-approval-head">
                          <strong>Đơn #{r.id}</strong>
                          <span>— {r.username} ({r.email || 'không có email'})</span>
                        </div>
                        <div className="return-approval-reason">Lý do: {r.returnReason || 'Không có lý do'}</div>
                      </div>
                      <div className="return-approval-actions">
                        <button className="btn-approve" onClick={() => handleApproveReturn(r)}>Duyệt trả & hoàn tiền</button>
                        <button className="btn-reject" onClick={() => handleRejectReturn(r)}>Từ chối</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Status filter tabs */}
              <div className="admin-orders-tabs">
                {ORDER_FILTERS.map(f => {
                  const count = f.key === 'all'
                    ? orders.length
                    : f.key === 'Returned'
                      ? orders.filter(o => o.status === 'Returned' || o.status === 'ReturnRequested').length
                      : orders.filter(o => o.status === f.key).length;
                  return (
                    <button
                      key={f.key}
                      className={`admin-orders-tab ${orderFilter === f.key ? 'active' : ''}`}
                      onClick={() => setOrderFilter(f.key)}
                    >
                      {f.label} ({count})
                    </button>
                  );
                })}
              </div>

              {filteredOrders.length === 0 ? (
                <div className="admin-empty">Không có đơn đặt hàng nào ở trạng thái này.</div>
              ) : (
                <div className="table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Đơn</th>
                        <th>Khách hàng</th>
                        <th>Thời gian</th>
                        <th>Nội dung đơn hàng</th>
                        <th>Tổng tiền</th>
                        <th>Trạng thái giao</th>
                        <th>Thanh toán</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((o) => {
                        const detail = o.paymentStatusDetail || '';
                        const paymentStatus = detail === 'Success'
                          ? 'Paid'
                          : detail === 'Refunded'
                            ? 'Refunded'
                            : detail === 'Failed'
                              ? 'Failed'
                              : (o.payment_status || o.paymentStatus || 'Unpaid');
                        const statusCls = (o.status || '').toLowerCase() === 'returnrequested' ? 'return-requested' : (o.status || '').toLowerCase();
                        return (
                          <tr key={o.id}>
                            <td className="col-id">#{o.id}</td>
                            <td>
                              <strong>{o.username}</strong>
                              <div className="sub-text">{o.email}</div>
                            </td>
                            <td>{formatDate(o.created_at || o.createdAt)}</td>
                            <td>
                              <div className="order-items-list">
                                {o.items && o.items.map(item => (
                                  <div key={item.id} className="item-line">
                                    • {item.medicine_name || item.medicineName} (x{item.quantity})
                                  </div>
                                ))}
                                {o.returnReason && (
                                  <div className="return-reason-cell">🔄 Lý do trả: {o.returnReason}</div>
                                )}
                              </div>
                            </td>
                            <td className="col-total">{formatPrice(o.total_amount || o.totalAmount)}</td>
                            <td>
                              <div className="order-status-cell">
                                <span className={`status-text ${statusCls}`}>
                                  {o.status === 'ReturnRequested' ? 'Chờ duyệt trả hàng'
                                    : o.status === 'Returned' ? 'Đã trả hàng'
                                      : o.status === 'Pending' ? 'Chờ duyệt'
                                        : o.status === 'Shipping' ? 'Đang giao'
                                          : o.status === 'Delivered' ? 'Đã giao'
                                            : o.status === 'Cancelled' ? 'Đã hủy' : o.status}
                                </span>
                                {o.status !== 'Delivered' && o.status !== 'Cancelled' && o.status !== 'Returned' && o.status !== 'ReturnRequested' && (
                                  <button
                                    className="confirm-delivered-btn"
                                    onClick={() => handleConfirmDelivered(o.id)}
                                    title="Xác nhận đã giao hàng cho khách"
                                  >
                                    ✓ Xác nhận đã giao
                                  </button>
                                )}
                                {o.status === 'Delivered' && o.paymentMethod === 'COD' && o.paymentId && paymentStatus !== 'Paid' && paymentStatus !== 'Refunded' && hasAccess([1, 3, 6]) && (
                                  <button
                                    className="collect-cash-btn"
                                    onClick={() => handleConfirmCashCollected(o)}
                                    title="Xác nhận đã thu tiền mặt khi giao hàng (COD)"
                                  >
                                    ✓ Xác nhận đã thu tiền
                                  </button>
                                )}
                                {o.status !== 'Cancelled' && o.status !== 'Returned' && o.status !== 'ReturnRequested' && (
                                  <select
                                    className={`status-select ${statusCls}`}
                                    value={o.status}
                                    onChange={(e) => handleStatusChange(o.id, e.target.value)}
                                  >
                                    <option value="Pending">Chờ duyệt</option>
                                    <option value="Shipping">Đang giao</option>
                                    <option value="Delivered">Đã giao</option>
                                    <option value="Cancelled">Đã hủy</option>
                                  </select>
                                )}
                              </div>
                            </td>
                            <td>
                              <span className={`payment-toggle-btn ${paymentStatus.toLowerCase()}`}>
                                {paymentStatus === 'Paid' ? 'Đã thu tiền' : paymentStatus === 'Refunded' ? 'Đã hoàn tiền' : 'Chưa thu tiền'}
                              </span>
                              {hasAccess([1, 6]) && (
                                <select
                                  className="payment-reconcile-select"
                                  value={paymentStatus}
                                  onChange={(e) => handlePaymentReconcile(o, e.target.value)}
                                  title="Đối soát thanh toán (Admin/Kế toán)"
                                >
                                  <option value="Paid">Đã thu (Success)</option>
                                  <option value="Unpaid">Chưa thu</option>
                                  <option value="Failed">Thất bại</option>
                                  <option value="Refunded">Hoàn tiền</option>
                                </select>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB: PATIENT MANAGEMENT */}
          {activeTab === 'patients' && (
            <div className="admin-card">
              <div className="card-header-actions">
                <h3 className="card-title">Hồ sơ khám bệnh của bệnh nhân</h3>
                <button className="btn-add-action" onClick={() => {
                  setCurrentPatient({ name: '', gender: 'Nam', dateOfBirth: '', phone: '', address: '', medicalHistory: '' });
                  setPatientModal('add');
                }}><Plus size={16} /> Đăng ký bệnh nhân</button>
              </div>

              {patientModal && (
                <form className="modal-form-box" onSubmit={handlePatientSubmit}>
                  <h4>{patientModal === 'add' ? 'Đăng ký hồ sơ bệnh nhân mới' : 'Chỉnh sửa hồ sơ bệnh nhân'}</h4>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Họ và tên bệnh nhân *</label>
                      <input type="text" className="form-input" required value={currentPatient.name} onChange={e => setCurrentPatient({...currentPatient, name: e.target.value})} placeholder="Nguyễn Văn A" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Giới tính</label>
                      <select className="form-select" value={currentPatient.gender} onChange={e => setCurrentPatient({...currentPatient, gender: e.target.value})}>
                        <option value="Nam">Nam</option>
                        <option value="Nữ">Nữ</option>
                        <option value="Khác">Khác</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Ngày sinh</label>
                      <input type="date" className="form-input" value={currentPatient.dateOfBirth ? currentPatient.dateOfBirth.split('T')[0] : ''} onChange={e => setCurrentPatient({...currentPatient, dateOfBirth: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Số điện thoại *</label>
                      <input type="tel" className="form-input" required value={currentPatient.phone} onChange={e => setCurrentPatient({...currentPatient, phone: e.target.value})} placeholder="0905123456" />
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label">Địa chỉ liên hệ</label>
                      <input type="text" className="form-input" value={currentPatient.address} onChange={e => setCurrentPatient({...currentPatient, address: e.target.value})} placeholder="Số nhà, tên đường, thành phố..." />
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label">Tiền sử bệnh lý & Triệu chứng lâm sàng</label>
                      <textarea className="form-textarea" rows="3" value={currentPatient.medicalHistory} onChange={e => setCurrentPatient({...currentPatient, medicalHistory: e.target.value})} placeholder="Mô tả triệu chứng, các bệnh lý nền (tim mạch, dị ứng vị thuốc...)" />
                    </div>
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="btn-save">Lưu thông tin</button>
                    <button type="button" className="btn-cancel" onClick={() => setPatientModal(null)}>Hủy bỏ</button>
                  </div>
                </form>
              )}

              {patients.length === 0 ? (
                <div className="admin-empty">Chưa có bệnh nhân nào được lưu trữ.</div>
              ) : (
                <div className="table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Họ tên bệnh nhân</th>
                        <th>Giới tính</th>
                        <th>Ngày sinh</th>
                        <th>Số điện thoại</th>
                        <th>Địa chỉ</th>
                        <th>Tiền sử bệnh lý</th>
                        <th>Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patients.map(p => (
                        <tr key={p.id}>
                          <td className="col-id">#{p.id}</td>
                          <td><strong>{p.name}</strong></td>
                          <td>{p.gender}</td>
                          <td>{p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString('vi-VN') : 'Chưa cập nhật'}</td>
                          <td>{p.phone}</td>
                          <td>{p.address || 'Chưa có'}</td>
                          <td><div className="med-history-text">{p.medicalHistory || 'Không có'}</div></td>
                          <td>
                            <div className="table-actions-row">
                              <button className="action-icon-btn edit" onClick={() => { setCurrentPatient(p); setPatientModal('edit'); }} title="Sửa"><Edit2 size={14} /></button>
                              <button className="action-icon-btn delete" onClick={() => handleDeletePatient(p.id)} title="Xóa"><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB: APPOINTMENT MANAGEMENT */}
          {activeTab === 'appointments' && (
            <div className="admin-card">
              <div className="card-header-actions">
                <h3 className="card-title">Quản lý Lịch hẹn khám bệnh</h3>
                <button className="btn-add-action" onClick={() => {
                  setCurrentAppointment({ patientId: patients[0]?.id || '', doctorId: users[0]?.id || '', appointmentDate: '', reason: '', status: 'Scheduled', notes: '' });
                  setAppointmentModal('add');
                }}><Plus size={16} /> Đặt lịch hẹn mới</button>
              </div>

              {appointmentModal && (
                <form className="modal-form-box" onSubmit={handleAppointmentSubmit}>
                  <h4>{appointmentModal === 'add' ? 'Đặt lịch hẹn mới' : 'Cập nhật thông tin lịch hẹn'}</h4>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Chọn Bệnh nhân *</label>
                      <select className="form-select" value={currentAppointment.patientId} onChange={e => setCurrentAppointment({...currentAppointment, patientId: e.target.value})}>
                        <option value="">-- Chọn bệnh nhân --</option>
                        {patients.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.phone})</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Thầy thuốc / Bác sĩ khám *</label>
                      <select className="form-select" value={currentAppointment.doctorId} onChange={e => setCurrentAppointment({...currentAppointment, doctorId: e.target.value})}>
                        <option value="">-- Chọn bác sĩ --</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id}>{u.username} ({u.email})</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Thời gian khám *</label>
                      <input type="datetime-local" className="form-input" required value={currentAppointment.appointmentDate ? currentAppointment.appointmentDate.substring(0, 16) : ''} onChange={e => setCurrentAppointment({...currentAppointment, appointmentDate: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Trạng thái cuộc hẹn</label>
                      <select className="form-select" value={currentAppointment.status} onChange={e => setCurrentAppointment({...currentAppointment, status: e.target.value})}>
                        <option value="Scheduled">Đã lên lịch</option>
                        <option value="Confirmed">Đã xác nhận</option>
                        <option value="Completed">Đã hoàn thành</option>
                        <option value="Cancelled">Đã hủy</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label">Lý do khám bệnh</label>
                      <input type="text" className="form-input" value={currentAppointment.reason} onChange={e => setCurrentAppointment({...currentAppointment, reason: e.target.value})} placeholder="Đau lưng, tái khám xương khớp..." />
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label">Ghi chú lâm sàng</label>
                      <textarea className="form-textarea" rows="2" value={currentAppointment.notes} onChange={e => setCurrentAppointment({...currentAppointment, notes: e.target.value})} placeholder="Chỉ định đặc biệt, triệu chứng khẩn cấp..." />
                    </div>
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="btn-save">Lưu lịch hẹn</button>
                    <button type="button" className="btn-cancel" onClick={() => setAppointmentModal(null)}>Hủy bỏ</button>
                  </div>
                </form>
              )}

              {appointments.length === 0 ? (
                <div className="admin-empty">Không có lịch hẹn nào được thiết lập.</div>
              ) : (
                <div className="table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID Lịch</th>
                        <th>Bệnh nhân</th>
                        <th>Điện thoại</th>
                        <th>Bác sĩ chỉ định</th>
                        <th>Thời gian hẹn</th>
                        <th>Lý do khám</th>
                        <th>Trạng thái</th>
                        <th>Ghi chú</th>
                        <th>Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appointments.map(a => (
                        <tr key={a.id}>
                          <td className="col-id">#{a.id}</td>
                          <td><strong>{a.patientName}</strong></td>
                          <td>{a.patientPhone}</td>
                          <td>Thầy thuốc {a.doctorName || 'Chưa phân công'}</td>
                          <td>{formatDate(a.appointmentDate)}</td>
                          <td>{a.reason}</td>
                          <td>
                            <span className={`appointment-status ${a.status.toLowerCase()}`}>
                              {a.status === 'Scheduled' ? 'Chờ khám' : a.status === 'Confirmed' ? 'Đã xác nhận' : a.status === 'Completed' ? 'Hoàn thành' : 'Đã hủy'}
                            </span>
                          </td>
                          <td><div className="med-history-text">{a.notes || 'Không'}</div></td>
                          <td>
                            <div className="table-actions-row">
                              <button className="action-icon-btn edit" onClick={() => { setCurrentAppointment(a); setAppointmentModal('edit'); }} title="Sửa lịch"><Edit2 size={14} /></button>
                              <button className="action-icon-btn delete" onClick={() => handleDeleteAppointment(a.id)} title="Xóa lịch"><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB: DIAGNOSIS & PRESCRIPTION */}
          {activeTab === 'prescriptions' && (
            <div className="admin-card">
              <div className="card-header-actions">
                <h3 className="card-title">Danh sách Đơn thuốc & Kê đơn Lâm sàng</h3>
                <button className="btn-add-action" onClick={() => {
                  setCurrentPrescription({ patientId: patients[0]?.id || '', doctorName: `Thầy thuốc ${loggedInUser?.username || ''}`, hospital: 'Phòng khám Đông Y', diagnosisNote: 'Thể bệnh Tâm Tỳ Lưỡng Hư', items: [] });
                  setPrescriptionModal('add');
                }}><Plus size={16} /> Kê đơn thuốc thảo dược</button>
              </div>
 
              {/* SECTION: Danh sách hàng chờ cần kê đơn */}
              <div className="prescription-queue-section" style={{ marginBottom: '28px', padding: '18px', backgroundColor: '#f0fdf4', border: '1.5px solid #a7f3d0', borderRadius: '16px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#0f766e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  📋 Danh sách bệnh nhân chờ kê đơn (Lịch hẹn khám chưa có đơn thuốc)
                </h4>
                {appointments.filter(appt => (appt.status === 'Scheduled' || appt.status === 'Confirmed') && !prescriptions.some(presc => presc.appointmentId === appt.id)).length === 0 ? (
                  <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Hàng chờ trống. Không có lịch hẹn khám nào cần kê đơn thuốc.</p>
                ) : (
                  <div className="table-wrapper" style={{ border: '1px solid #d1fae5' }}>
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Bệnh nhân</th>
                          <th>Điện thoại</th>
                          <th>Thời gian hẹn</th>
                          <th>Lý do khám / Triệu chứng</th>
                          <th>Bác sĩ chỉ định</th>
                          <th>Hành động</th>
                        </tr>
                      </thead>
                      <tbody>
                        {appointments.filter(appt => (appt.status === 'Scheduled' || appt.status === 'Confirmed') && !prescriptions.some(presc => presc.appointmentId === appt.id)).map(appt => (
                          <tr key={appt.id}>
                            <td><strong>{appt.patientName}</strong></td>
                            <td>{appt.patientPhone}</td>
                            <td>{formatDate(appt.appointmentDate)}</td>
                            <td>{appt.reason}</td>
                            <td>Thầy thuốc {appt.doctorName || 'Chưa phân công'}</td>
                            <td>
                              <button 
                                className="btn-add-action" 
                                style={{ padding: '6px 12px', fontSize: '11px' }}
                                onClick={() => {
                                  // Pre-fill the prescription modal
                                  const nameForDoctor = loggedInUser?.role_id === 4 
                                    ? '' 
                                    : `Thầy thuốc ${loggedInUser?.username || ''}`;
                                  
                                  // Pre-fill herbs based on keywords
                                  let suggestedHerbs = [];
                                  const lowerReason = (appt.reason || '').toLowerCase();
                                  if (lowerReason.includes('mất ngủ') || lowerReason.includes('ngủ')) {
                                    suggestedHerbs = [{ medicineId: 101, medicineName: 'Hoạt Huyết Dưỡng Não Traphaco', quantity: 1 }];
                                  } else if (lowerReason.includes('đau lưng') || lowerReason.includes('gối')) {
                                    suggestedHerbs = [{ medicineId: 310, medicineName: 'Bát Vị Quế Phụ OPC', quantity: 1 }];
                                  } else if (lowerReason.includes('nóng') || lowerReason.includes('mụn') || lowerReason.includes('ngứa')) {
                                    suggestedHerbs = [{ medicineId: 102, medicineName: 'Trà túi lọc Cà Gai Leo thải độc gan', quantity: 1 }];
                                  } else if (lowerReason.includes('tiêu hóa') || lowerReason.includes('đầy bụng') || lowerReason.includes('dạ dày')) {
                                    suggestedHerbs = [{ medicineId: 414, medicineName: 'Berberin Traphaco Hỗ Trợ Tiêu Hóa', quantity: 1 }];
                                  }

                                  setCurrentPrescription({
                                    patientId: appt.patientId || appt.userId,
                                    appointmentId: appt.id,
                                    doctorName: nameForDoctor,
                                    hospital: 'Phòng khám Đông Y',
                                    diagnosisNote: appt.reason || 'Thể bệnh Tâm Tỳ Lưỡng Hư',
                                    items: suggestedHerbs
                                  });
                                  setPrescriptionModal('add');
                                }}
                              >
                                <Plus size={12} /> Kê đơn
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {prescriptionModal && (
                <form className="modal-form-box" onSubmit={handlePrescriptionSubmit}>
                  <h4>Kê đơn thuốc Đông Y mới</h4>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Hồ sơ bệnh nhân khám *</label>
                      <select className="form-select" required value={currentPrescription.patientId} onChange={e => setCurrentPrescription({...currentPrescription, patientId: e.target.value})}>
                        <option value="">-- Chọn bệnh nhân chỉ định --</option>
                        {patients.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.phone})</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">
                        {loggedInUser?.role_id === 4 ? 'Bác sĩ ủy quyền kê đơn *' : 'Thầy thuốc chuẩn trị *'}
                      </label>
                      {loggedInUser?.role_id === 4 ? (
                        <select 
                          className="form-select" 
                          required 
                          value={currentPrescription.doctorName} 
                          onChange={e => setCurrentPrescription({...currentPrescription, doctorName: e.target.value})}
                        >
                          <option value="">-- Chọn bác sĩ ủy quyền --</option>
                          {users.map(doc => (
                            <option key={doc.id} value={`Bác sĩ ${doc.username}`}>Bác sĩ {doc.username}</option>
                          ))}
                        </select>
                      ) : (
                        <input type="text" className="form-input" required value={currentPrescription.doctorName} onChange={e => setCurrentPrescription({...currentPrescription, doctorName: e.target.value})} />
                      )}
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label">Nơi khám bệnh *</label>
                      <input type="text" className="form-input" required value={currentPrescription.hospital} onChange={e => setCurrentPrescription({...currentPrescription, hospital: e.target.value})} />
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label">Chẩn đoán y khoa / Thể bệnh Đông Y *</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        required 
                        placeholder="Ví dụ: Thể bệnh Tâm Tỳ Lưỡng Hư, Suy Nhược Thần Kinh, Đau thần kinh tọa..." 
                        value={currentPrescription.diagnosisNote || ''} 
                        onChange={e => setCurrentPrescription({...currentPrescription, diagnosisNote: e.target.value})} 
                      />
                    </div>
                  </div>

                  {currentPrescription.patientId && (() => {
                    const selPatient = patients.find(p => p.id === parseInt(currentPrescription.patientId));
                    if (!selPatient) return null;
                    return (
                      <div className="patient-summary-bubble" style={{ padding: '14px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', marginTop: '16px', fontSize: '13px', lineHeight: '1.5' }}>
                        <h5 style={{ margin: '0 0 8px 0', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13.5px', fontWeight: '800' }}>
                          <User size={14} /> Thông tin chi tiết bệnh nhân:
                        </h5>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                          <div>• Giới tính: <strong>{selPatient.gender || 'Chưa rõ'}</strong></div>
                          <div>• Ngày sinh: <strong>{selPatient.dateOfBirth ? new Date(selPatient.dateOfBirth).toLocaleDateString('vi-VN') : 'Chưa có'}</strong></div>
                          <div>• Điện thoại: <strong>{selPatient.phone || 'Chưa có'}</strong></div>
                          <div style={{ gridColumn: 'span 2' }}>• Địa chỉ: <strong>{selPatient.address || 'Chưa cập nhật'}</strong></div>
                          <div style={{ gridColumn: 'span 2', marginTop: '6px', backgroundColor: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #dbeafe' }}>
                            <strong style={{ color: '#1e3a8a' }}>Tiền sử bệnh lý / Triệu chứng đăng ký:</strong>
                            <p style={{ margin: '4px 0 0 0', color: '#4b5563', fontStyle: 'italic', fontSize: '12.5px' }}>{selPatient.medicalHistory || 'Chưa ghi nhận bệnh lý từ hồ sơ.'}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Add Medicines / Herbs Section */}
                  <div className="med-prescribe-box">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                      <h5 style={{ margin: 0 }}>Thêm vị thuốc / Thảo dược vào thang đơn</h5>
                      <label style={{ fontSize: '12px', color: '#0f766e', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500', backgroundColor: '#f0fdf4', padding: '3px 8px', borderRadius: '4px', border: '1px solid #bbf7d0' }}>
                        <input
                          type="checkbox"
                          checked={hideOutOfStock}
                          onChange={e => setHideOutOfStock(e.target.checked)}
                          style={{ cursor: 'pointer' }}
                        />
                        <span>Ẩn vị thuốc/thảo dược đã hết hàng (0g)</span>
                      </label>
                    </div>

                    <div className="prescribe-inputs">
                      <select className="form-select flex-1" value={selectedMedicineId} onChange={e => setSelectedMedicineId(e.target.value)}>
                        <option value="">-- Chọn thảo dược/thuốc Đông Y --</option>
                        {medicines
                          .filter(m => {
                            const existingInDraft = currentPrescription.items.find(i => i.medicineId === m.id);
                            const addedQty = existingInDraft ? existingInDraft.quantity : 0;
                            const stockInDb = m.stock_quantity ?? m.stockQuantity ?? 0;
                            const availableStock = stockInDb - addedQty;
                            if (hideOutOfStock && availableStock <= 0) return false;
                            return true;
                          })
                          .sort((a, b) => {
                            const addedA = (currentPrescription.items.find(i => i.medicineId === a.id)?.quantity) || 0;
                            const availA = (a.stock_quantity ?? a.stockQuantity ?? 0) - addedA;
                            const addedB = (currentPrescription.items.find(i => i.medicineId === b.id)?.quantity) || 0;
                            const availB = (b.stock_quantity ?? b.stockQuantity ?? 0) - addedB;
                            return availB - availA;
                          })
                          .map(m => {
                            const existingInDraft = currentPrescription.items.find(i => i.medicineId === m.id);
                            const addedQty = existingInDraft ? existingInDraft.quantity : 0;
                            const stockInDb = m.stock_quantity ?? m.stockQuantity ?? 0;
                            const availableStock = stockInDb - addedQty;
                            const unit = m.unit || 'gram';
                            const priceText = m.price != null ? `${m.price.toLocaleString('vi-VN')}đ/${unit}` : 'Liên hệ';
                            const isOutOfStock = availableStock <= 0;
                            return (
                              <option key={m.id} value={m.id} disabled={isOutOfStock}>
                                {m.name} ({priceText}) - {isOutOfStock ? `❌ Hết hàng (còn 0${unit})` : `Tồn kho khả dụng: còn ${availableStock}${unit}`}
                              </option>
                            );
                          })}
                      </select>
                      <input type="number" className="form-input w-24" min="1" value={selectedMedicineQty} onChange={e => setSelectedMedicineQty(parseInt(e.target.value))} placeholder="SL" />
                      <button type="button" className="btn-add-item" onClick={addMedicineToPrescription}><Plus size={16} /> Thêm vị</button>
                    </div>

                    <div className="prescription-items-preview">
                      <h6>Chi tiết đơn thuốc:</h6>
                      {currentPrescription.items.length === 0 ? (
                        <p className="no-items-alert">Chưa có vị thuốc nào được thêm.</p>
                      ) : (
                        <div className="preview-items-list">
                          {currentPrescription.items.map(item => (
                            <div key={item.medicineId} className="preview-item-row">
                              <span>🌿 <strong>{item.medicineName}</strong> - Số lượng: {item.quantity}</span>
                              <button type="button" className="btn-remove-item" onClick={() => removeMedicineFromPrescription(item.medicineId)}><X size={14} /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="btn-save">Hoàn thành kê đơn</button>
                    <button type="button" className="btn-cancel" onClick={() => setPrescriptionModal(null)}>Hủy bỏ</button>
                  </div>
                </form>
              )}

              {prescriptions.length === 0 ? (
                <div className="admin-empty">Không có đơn thuốc nào được lưu trên hệ thống.</div>
              ) : (
                <div className="table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID Đơn</th>
                        <th>Bệnh nhân</th>
                        <th>Chẩn đoán y khoa</th>
                        <th>Ngày kê đơn</th>
                        <th>Thầy thuốc phụ trách</th>
                        <th>Đại lý/Nơi kê đơn</th>
                        <th>Các vị thuốc chỉ định</th>
                        <th>Trạng thái đơn</th>
                        <th>Xử lý đơn</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prescriptions.map(p => {
                        const matchingPatient = patients.find(pt => pt.id === (p.patientId || p.userId));
                        const displayName = p.patientName || p.userName || matchingPatient?.name || `Bệnh nhân #${p.userId}`;
                        const displayPhone = matchingPatient?.phone;
                        return (
                          <tr key={p.id}>
                            <td className="col-id">#{p.id}</td>
                            <td>
                              <strong style={{ color: '#0f172a', display: 'block', fontWeight: '700' }}>
                                {displayName}
                              </strong>
                              {displayPhone && (
                                <span style={{ fontSize: '11px', color: '#64748b' }}>
                                  📞 {displayPhone}
                                </span>
                              )}
                            </td>
                            <td>
                              <span className="prescription-med-tag" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontWeight: '600', padding: '4px 8px' }}>
                                🩺 {p.diagnosisNote || 'Thể bệnh Tâm Tỳ Lưỡng Hư'}
                              </span>
                            </td>
                            <td>{formatDate(p.prescriptionDate)}</td>
                            <td>{p.doctorName}</td>
                            <td>{p.hospital}</td>
                            <td>
                              <div className="prescription-medicines-cell">
                                {p.items && p.items.map((item, idx) => (
                                  <span key={idx} className="prescription-med-tag">
                                    🌿 {item.medicineName} (x{item.quantity})
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td>
                              <span className={`prescription-status ${getPrescriptionStatusClass(p.status)}`}>
                                {getPrescriptionStatusLabel(p.status, 'admin')}
                              </span>
                            </td>
                            <td>
                              <div className="pres-actions">
                                {p.status === 'Pending' && (
                                  <button className="btn-pres-action fill" onClick={() => handlePrescriptionStatus(p.id, PRESCRIPTION_ACTION.APPROVE)} title="Duyệt đơn thuốc, mở khóa cho bệnh nhân thêm vào giỏ hàng">
                                    <Check size={12} /> Duyệt đơn
                                  </button>
                                )}
                                {(p.status === 'Pending' || p.status === 'Approved') && (
                                  <button className="btn-pres-action cancel" onClick={() => handlePrescriptionStatus(p.id, PRESCRIPTION_ACTION.REJECT)} title="Từ chối đơn thuốc">
                                    <X size={12} /> Từ chối
                                  </button>
                                )}
                                {p.status !== 'Pending' && p.status !== 'Approved' && <span className="completed-text">Đã xử lý</span>}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB: INVENTORY & WAREHOUSE */}
          {activeTab === 'inventory' && (
            <div className="admin-card">
              <h3 className="card-title">Tình trạng Kho hàng & Kiểm kê Dược liệu</h3>
              {warehouses.length === 0 ? (
                <div className="admin-empty">Không có thông tin nhà kho.</div>
              ) : (
                <div className="inventory-grid">
                  {warehouses.map(w => (
                    <div key={w.id} className="warehouse-card">
                      <div className="wh-header">
                        <Package className="wh-icon" size={24} />
                        <div>
                          <h4>{w.name}</h4>
                          <span className="sub-text">{w.address}</span>
                        </div>
                      </div>
                      <div className="wh-body">
                        <div className="wh-stat">
                          <span className="wh-stat-num">{(w.total_quantity ?? w.totalQuantity ?? 0).toLocaleString()}</span>
                          <span className="wh-stat-lbl">Tổng vị thuốc lưu kho</span>
                        </div>
                        <div className="wh-info">
                          <Info size={14} /> <span>Tình trạng kho: Hoạt động bình thường. Đảm bảo điều kiện độ ẩm lý tưởng cho thảo dược Đông Y.</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: USER ADMINISTRATION */}
          {activeTab === 'users' && (
            <div className="admin-card">
              <h3 className="card-title">Phân quyền & Quản lý Tài khoản người dùng</h3>
              {users.length === 0 ? (
                <div className="admin-empty">Không tìm thấy người dùng.</div>
              ) : (
                <div className="table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Tên tài khoản</th>
                        <th>Email đăng ký</th>
                        <th>Số điện thoại</th>
                        <th>Vai trò hiện tại</th>
                        <th>Ngày tạo</th>
                        <th>Trạng thái hoạt động</th>
                        <th>Phân quyền lại</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id}>
                          <td className="col-id">#{u.id}</td>
                          <td><strong>{u.username}</strong></td>
                          <td>{u.email}</td>
                          <td>{u.phone || 'Chưa đăng ký'}</td>
                          <td>
                            <span className={`role-badge role-${u.role_id}`}>
                              {u.roleName}
                            </span>
                          </td>
                          <td>{formatDate(u.created_at)}</td>
                          <td>
                            <button
                              className={`user-status-btn ${u.is_active ? 'active' : 'blocked'}`}
                              onClick={() => handleUserStatusToggle(u.id, u.is_active)}
                            >
                              {u.is_active ? 'Đang hoạt động' : 'Đã khóa'}
                            </button>
                          </td>
                          <td>
                            <select 
                              className="role-assign-select"
                              value={u.roleName || "User"}
                              onChange={(e) => handleUserRoleChange(u.id, e.target.value)}
                            >
                              <option value="Admin">Quản trị viên (Admin)</option>
                              <option value="User">Khách hàng / Bệnh nhân (User)</option>
                              <option value="Pharmacy">Nhân viên Nhà thuốc (Pharmacy)</option>
                              <option value="Staff">Nhân viên Lễ tân / Bệnh viện (Staff)</option>
                              <option value="Doctor">Bác sĩ / Thầy thuốc (Doctor)</option>
                              <option value="Accountant">Kế toán (Accountant)</option>
                              <option value="Warehouse">Thủ kho (Warehouse)</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB: STATS, CLINIC REPORTS */}
          {activeTab === 'stats' && (
            <div className="stats-dashboard">
              {/* Summary Cards */}
              <div className="stats-summary-grid">
                <div className="stat-summary-card revenue">
                  <div className="card-icon-wrap"><BarChart2 size={24} /></div>
                  <div className="stat-data">
                    <span className="stat-val">{formatPrice(stats.revenue)}</span>
                    <span className="stat-lbl">Tổng Doanh thu (Đã thu)</span>
                  </div>
                </div>

                <div className="stat-summary-card patients">
                  <div className="card-icon-wrap"><Users size={24} /></div>
                  <div className="stat-data">
                    <span className="stat-val">{stats.patientsCount}</span>
                    <span className="stat-lbl">Số lượng Bệnh nhân</span>
                  </div>
                </div>

                <div className="stat-summary-card appointments">
                  <div className="card-icon-wrap"><Calendar size={24} /></div>
                  <div className="stat-data">
                    <span className="stat-val">{stats.appointmentsCount}</span>
                    <span className="stat-lbl">Lịch hẹn khám bệnh</span>
                  </div>
                </div>

                <div className="stat-summary-card warning">
                  <div className="card-icon-wrap"><Package size={24} /></div>
                  <div className="stat-data">
                    <span className="stat-val">{stats.lowStockCount}</span>
                    <span className="stat-lbl">Dược liệu cần bổ sung gấp</span>
                  </div>
                </div>
              </div>

              {/* Detail graphs placeholder & Lists */}
              <div className="stats-detail-grid">
                <div className="stats-detail-card">
                  <h4>⚠️ Cảnh báo tồn kho cực thấp (dưới 20 đơn vị)</h4>
                  <div className="low-stock-list">
                    {medicines.filter(m => m.stock_quantity < 20).map(m => (
                      <div key={m.id} className="low-stock-row">
                        <span>🌿 <strong>{m.name}</strong> ({m.packaging || m.unit})</span>
                        <span className="stock-count-alert">Số lượng còn: {m.stock_quantity}</span>
                      </div>
                    ))}
                    {medicines.filter(m => m.stock_quantity < 20).length === 0 && (
                      <p className="no-warnings">Mọi vị thuốc đều có lượng dự trữ an toàn.</p>
                    )}
                  </div>
                </div>

                <div className="stats-detail-card">
                  <h4>💡 Tình trạng hoạt động phòng khám</h4>
                  <div className="clinic-status-rows">
                    <div className="status-row">
                      <span>Đơn hàng đang chờ duyệt giao:</span>
                      <strong>{stats.pendingOrders} đơn hàng</strong>
                    </div>
                    <div className="status-row">
                      <span>Lịch hẹn khám đang chờ khám:</span>
                      <strong>{stats.activeAppointments} lịch</strong>
                    </div>
                    <div className="status-row">
                      <span>Tổng danh mục thuốc/thảo dược:</span>
                      <strong>{stats.medicinesCount} sản phẩm</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: MANAGE MEDICINES (Admin CRUD) */}
          {activeTab === 'products' && (
            <div className="products-crud-layout">
              {/* LEFT: Add / Edit Form */}
              <div className="admin-card products-form-panel">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <h3 className="card-title" style={{ margin: 0 }}>
                    {editingMedicineId ? '✏️ Chỉnh sửa thông tin Dược phẩm' : '➕ Thêm Dược phẩm mới'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowImportModal(true)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      background: 'linear-gradient(135deg, #059669, #10b981)',
                      color: '#fff', border: 'none', borderRadius: '8px',
                      padding: '8px 16px', cursor: 'pointer', fontWeight: '600',
                      fontSize: '13px', boxShadow: '0 2px 8px rgba(16,185,129,0.35)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Upload size={15} /> 📤 Import Excel hàng loạt
                  </button>
                </div>
                {prodImgUrl && (
                  <div className="product-img-preview">
                    <img src={api.formatImageUrl(prodImgUrl)} alt="preview" onError={(e) => e.target.style.display='none'} />
                  </div>
                )}
                <form className="add-product-form" onSubmit={handleProductSubmit}>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Tên thuốc/thảo dược *</label>
                      <input
                        type="text"
                        className="form-input"
                        required
                        placeholder="Nhân Sâm Cao Cấp, Hoạt Huyết..."
                        value={prodName}
                        onChange={(e) => setProdName(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Danh mục dược liệu *</label>
                      <select
                        className="form-select"
                        value={prodCategoryId}
                        onChange={(e) => setProdCategoryId(e.target.value)}
                      >
                        <option value={1}>Thực phẩm chức năng / Bổ dưỡng</option>
                        <option value={2}>Dược mỹ phẩm thảo dược</option>
                        <option value={3}>Thuốc điều trị Đông Y</option>
                        <option value={4}>Chăm sóc cá nhân tự nhiên</option>
                        <option value={5}>Thiết bị y tế</option>
                        <option value={6}>Châm cứu &amp; Trị liệu</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Nhà cung cấp *</label>
                      <select
                        className="form-select"
                        value={prodSupplierId}
                        onChange={(e) => setProdSupplierId(e.target.value)}
                      >
                        <option value={1}>Công ty Cổ phần Traphaco</option>
                        <option value={2}>Công ty TNHH Dược phẩm OPC</option>
                        <option value={3}>Công ty Cổ phần Bách Thảo Dược</option>
                        <option value={4}>Nhà sâm KGC Hàn Quốc</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Giá bán lẻ (VND) *</label>
                      <input
                        type="number"
                        className="form-input"
                        required
                        placeholder="95000"
                        value={prodPrice}
                        onChange={(e) => setProdPrice(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Giá niêm yết cũ (để hiện giảm giá)</label>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="105000"
                        value={prodOldPrice}
                        onChange={(e) => setProdOldPrice(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Số lượng tồn kho *</label>
                      <input
                        type="number"
                        className="form-input"
                        required
                        placeholder="100"
                        value={prodStock}
                        onChange={(e) => setProdStock(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Đơn vị tính *</label>
                      <input
                        type="text"
                        className="form-input"
                        required
                        placeholder="Hộp, Chai, Lọ, Thang..."
                        value={prodUnit}
                        onChange={(e) => setProdUnit(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Quy cách đóng gói</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Hộp 100 viên, Gói 20 túi lọc..."
                        value={prodPackaging}
                        onChange={(e) => setProdPackaging(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Xuất xứ *</label>
                      <input
                        type="text"
                        className="form-input"
                        required
                        placeholder="Việt Nam, Hàn Quốc..."
                        value={prodOrigin}
                        onChange={(e) => setProdOrigin(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Hình ảnh (URL) *</label>
                      <input
                        type="text"
                        className="form-input"
                        required
                        placeholder="https://images.unsplash.com/..."
                        value={prodImgUrl}
                        onChange={(e) => setProdImgUrl(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ display: 'flex', gap: '8px', alignItems: 'center', margin: '8px 0' }}>
                    <input
                      type="checkbox"
                      id="req-pres-herbal"
                      checked={prodReqPrescription}
                      onChange={(e) => setProdReqPrescription(e.target.checked)}
                    />
                    <label htmlFor="req-pres-herbal" style={{ fontSize: '14px', fontWeight: '600', color: '#374151', cursor: 'pointer' }}>
                      Yêu cầu có đơn thuốc của Bác sĩ mới được mua
                    </label>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Mô tả chi tiết</label>
                    <textarea
                      className="form-textarea"
                      rows="3"
                      placeholder="Mô tả công dụng, tính vị quy kinh, liều dùng..."
                      value={prodDesc}
                      onChange={(e) => setProdDesc(e.target.value)}
                    />
                  </div>

                  <div className="product-form-actions">
                    <button type="submit" className="add-submit-btn">
                      {editingMedicineId ? '💾 Lưu thay đổi' : '➕ Nhập kho thảo dược'}
                    </button>
                    {editingMedicineId && (
                      <button type="button" className="cancel-edit-btn" onClick={handleCancelProductEdit}>
                        ✕ Hủy chỉnh sửa
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* RIGHT: Medicine list with Edit/Delete */}
              <div className="admin-card products-list-panel">
                <h3 className="card-title">📋 Danh sách Dược phẩm ({medicines.length} mục)</h3>
                <div className="medicine-crud-list">
                  {medicines.length === 0 && (
                    <div className="admin-empty">Chưa có dược phẩm nào trong kho.</div>
                  )}
                  {medicines.map(m => (
                    <div key={m.id} className={`medicine-crud-row ${editingMedicineId === m.id ? 'editing' : ''}`}>
                      <div className="medicine-crud-img">
                        <img src={api.formatImageUrl(m.image_url)} alt={m.name} onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_MED_IMG; }} />
                      </div>
                      <div className="medicine-crud-info">
                        <strong>{m.name}</strong>
                        <span className="med-meta">{m.packaging || m.unit} · {m.origin}</span>
                        <span className="med-price">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(m.price)}</span>
                        <span className={`med-stock ${m.stock_quantity < 20 ? 'low' : ''}`}>
                          Tồn kho: {m.stock_quantity} {m.unit}
                        </span>
                      </div>
                      <div className="medicine-crud-actions">
                        <button
                          className="med-edit-btn"
                          onClick={() => handleEditMedicineClick(m)}
                          title="Chỉnh sửa"
                        >
                          ✏️ Sửa
                        </button>
                        <button
                          className="med-delete-btn"
                          onClick={() => handleDeleteMedicine(m.id)}
                          title="Xóa khỏi danh mục"
                        >
                          🗑️ Xóa
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB: VOUCHERS (Admin only) ─── */}
          {activeTab === 'vouchers' && hasAccess([1]) && (
            <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 20, alignItems: 'start' }}>
              {/* Form */}
              <div className="admin-card">
                <h3 className="admin-section-title">
                  <Tag size={16} /> {editingVoucherId ? 'Cập nhật Voucher' : 'Thêm Voucher mới'}
                </h3>
                <div className="admin-form">
                  <div className="form-group">
                    <label>Mã voucher *</label>
                    <input className="admin-input" value={voucherForm.code} onChange={e => setVoucherForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="VD: LONGCHAU20" />
                  </div>
                  <div className="form-group">
                    <label>Tên mô tả</label>
                    <input className="admin-input" value={voucherForm.name} onChange={e => setVoucherForm(p => ({ ...p, name: e.target.value }))} placeholder="Giảm 20% cho đơn từ 200K" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div className="form-group">
                      <label>Loại giảm</label>
                      <select className="admin-input" value={voucherForm.discount_type} onChange={e => setVoucherForm(p => ({ ...p, discount_type: e.target.value }))}>
                        <option value="percent">Phần trăm (%)</option>
                        <option value="fixed">Số tiền (VNĐ)</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Giá trị giảm *</label>
                      <input type="number" className="admin-input" value={voucherForm.discount_value} onChange={e => setVoucherForm(p => ({ ...p, discount_value: e.target.value }))} placeholder={voucherForm.discount_type === 'percent' ? '10' : '50000'} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div className="form-group">
                      <label>Đơn tối thiểu (đ)</label>
                      <input type="number" className="admin-input" value={voucherForm.min_order_value} onChange={e => setVoucherForm(p => ({ ...p, min_order_value: e.target.value }))} placeholder="200000" />
                    </div>
                    <div className="form-group">
                      <label>Giảm tối đa (đ)</label>
                      <input type="number" className="admin-input" value={voucherForm.max_discount} onChange={e => setVoucherForm(p => ({ ...p, max_discount: e.target.value }))} placeholder="50000" />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div className="form-group">
                      <label>Số lượng</label>
                      <input type="number" className="admin-input" value={voucherForm.usage_limit} onChange={e => setVoucherForm(p => ({ ...p, usage_limit: e.target.value }))} placeholder="100" />
                    </div>
                    <div className="form-group">
                      <label>Ngày hết hạn</label>
                      <input type="date" className="admin-input" value={voucherForm.end_date} onChange={e => setVoucherForm(p => ({ ...p, end_date: e.target.value }))} />
                    </div>
                  </div>
                  <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <input type="checkbox" id="vIsActive" checked={voucherForm.is_active} onChange={e => setVoucherForm(p => ({ ...p, is_active: e.target.checked }))} />
                    <label htmlFor="vIsActive" style={{ fontWeight: 600, cursor: 'pointer' }}>Kích hoạt ngay</label>
                  </div>
                  <div className="product-form-actions">
                    <button className="admin-add-btn" style={{ flex: 2 }} onClick={async () => {
                      if (!voucherForm.code || !voucherForm.discount_value) { setError('Vui lòng nhập mã và giá trị giảm'); return; }
                      try {
                        if (editingVoucherId) {
                          await api.updateVoucher(editingVoucherId, { ...voucherForm, discount_value: parseFloat(voucherForm.discount_value), min_order_value: parseFloat(voucherForm.min_order_value) || 0, max_discount: voucherForm.max_discount ? parseFloat(voucherForm.max_discount) : null });
                          showSuccess('Cập nhật voucher thành công!');
                        } else {
                          await api.createVoucher({ ...voucherForm, discount_value: parseFloat(voucherForm.discount_value), min_order_value: parseFloat(voucherForm.min_order_value) || 0, max_discount: voucherForm.max_discount ? parseFloat(voucherForm.max_discount) : null });
                          showSuccess('Thêm voucher thành công!');
                        }
                        setVoucherForm({ code: '', name: '', discount_type: 'percent', discount_value: '', min_order_value: '', max_discount: '', end_date: '', usage_limit: 100, is_active: true });
                        setEditingVoucherId(null);
                        const data = await api.fetchAdminVouchers(); setVouchers(data);
                      } catch (e) { setError(e.message); }
                    }}>
                      {editingVoucherId ? '💾 Cập nhật' : '➕ Thêm Voucher'}
                    </button>
                    {editingVoucherId && (
                      <button className="cancel-edit-btn" onClick={() => { setEditingVoucherId(null); setVoucherForm({ code: '', name: '', discount_type: 'percent', discount_value: '', min_order_value: '', max_discount: '', end_date: '', usage_limit: 100, is_active: true }); }}>Hủy</button>
                    )}
                  </div>
                </div>
              </div>

              {/* List */}
              <div className="admin-card">
                <h3 className="admin-section-title"><Tag size={16} /> Danh sách Voucher ({vouchers.length})</h3>
                <div className="medicine-crud-list" style={{ maxHeight: 550 }}>
                  {vouchers.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>Chưa có voucher nào</p>
                  ) : vouchers.map(v => {
                    const expired = v.end_date && new Date(v.end_date) < new Date();
                    const daysLeft = v.end_date ? Math.ceil((new Date(v.end_date) - new Date()) / 86400000) : null;
                    return (
                      <div key={v.id} className={`medicine-crud-row ${editingVoucherId === v.id ? 'editing' : ''}`}>
                        <div className="medicine-crud-info" style={{ flex: 1 }}>
                          <strong style={{ color: '#0d9488', fontFamily: 'monospace', fontSize: 15 }}>{v.code}</strong>
                          <span className="med-meta">{v.name || '—'}</span>
                          <span className="med-price">
                            {v.discount_type === 'percent' ? `${v.discount_value}%` : new Intl.NumberFormat('vi-VN').format(v.discount_value) + 'đ'} OFF
                            {v.min_order_value > 0 && <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 400 }}> · Đơn từ {new Intl.NumberFormat('vi-VN').format(v.min_order_value)}đ</span>}
                          </span>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
                            <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20, background: v.is_active && !expired ? '#dcfce7' : '#fee2e2', color: v.is_active && !expired ? '#166534' : '#991b1b', fontWeight: 700 }}>
                              {v.is_active && !expired ? 'Đang hoạt động' : expired ? 'Hết hạn' : 'Tắt'}
                            </span>
                            {daysLeft !== null && !expired && (
                              <span style={{ fontSize: 11, color: daysLeft <= 3 ? '#dc2626' : '#64748b' }}>
                                ⏱ Còn {daysLeft} ngày
                              </span>
                            )}
                            <span style={{ fontSize: 11, color: '#94a3b8' }}>Đã dùng: {v.used_count}/{v.usage_limit}</span>
                          </div>
                        </div>
                        <div className="medicine-crud-actions">
                          <button className="med-edit-btn" onClick={() => {
                            setEditingVoucherId(v.id);
                            setVoucherForm({
                              code: v.code, name: v.name || '', discount_type: v.discount_type,
                              discount_value: v.discount_value, min_order_value: v.min_order_value || '',
                              max_discount: v.max_discount || '', end_date: v.end_date ? v.end_date.split('T')[0] : '',
                              usage_limit: v.usage_limit, is_active: v.is_active
                            });
                          }}>✏️ Sửa</button>
                          <button
                            className="med-edit-btn"
                            style={v.is_active
                              ? { background: 'rgba(245,158,11,0.1)', color: '#d97706', borderColor: '#d97706' }
                              : { background: 'rgba(13,148,136,0.1)', color: '#0d9488', borderColor: '#0d9488' }
                            }
                            onClick={async () => {
                              await api.updateVoucher(v.id, { is_active: !v.is_active });
                              const data = await api.fetchAdminVouchers(); setVouchers(data);
                            }}>
                            {v.is_active ? '⏸ Tắt' : '▶ Bật'}
                          </button>
                          <button className="med-delete-btn" onClick={async () => {
                            if (!confirm(`Xóa voucher "${v.code}"?`)) return;
                            await api.deleteVoucher(v.id);
                            const data = await api.fetchAdminVouchers(); setVouchers(data);
                            showSuccess('Đã xóa voucher!');
                          }}>🗑️ Xóa</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB: PHARMACY LIVE CHAT */}
          {activeTab === 'pharmacy-chat' && (
            <PharmacyChatDashboard loggedInUser={loggedInUser} />
          )}

        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: Import Excel hàng loạt                                */}
      {/* ============================================================ */}
      {showImportModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px', backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '900px',
            maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            {/* Header */}
            <div style={{
              padding: '20px 24px', borderBottom: '1px solid #e5e7eb',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)'
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#065f46' }}>
                  📤 Quản lý Dược phẩm 2 chiều qua Excel
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>
                  Xuất toàn bộ danh mục → chỉnh sửa → nhập lại để đồng bộ (Thêm / Sửa / Xóa). Hỗ trợ ảnh nhúng và link URL.
                </p>
              </div>
              <button onClick={handleCloseImportModal} style={{
                background: 'none', border: '1px solid #d1d5db', borderRadius: '8px',
                padding: '6px 12px', cursor: 'pointer', color: '#6b7280', fontSize: '13px'
              }}>✕ Đóng</button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

              {/* Step 1: Download + Upload */}
              {!importResult && (
                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe',
                      borderRadius: '8px', padding: '10px 16px', cursor: 'pointer',
                      fontWeight: '600', fontSize: '13px', whiteSpace: 'nowrap'
                    }}
                  >
                    ⬇️ Tải file mẫu rỗng
                  </button>

                  {/* NÚT XUẤT TOÀN BỘ DANH MỤC */}
                  <button
                    type="button"
                    onClick={handleDownloadExport}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                      color: '#fff', border: 'none',
                      borderRadius: '8px', padding: '10px 16px', cursor: 'pointer',
                      fontWeight: '600', fontSize: '13px', whiteSpace: 'nowrap',
                      boxShadow: '0 2px 8px rgba(14,165,233,0.35)'
                    }}
                  >
                    📥 Xuất toàn bộ danh mục ra Excel
                  </button>

                  <label style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: importFile ? '#f0fdf4' : '#f9fafb',
                    color: importFile ? '#065f46' : '#374151',
                    border: `1px solid ${importFile ? '#86efac' : '#d1d5db'}`,
                    borderRadius: '8px', padding: '10px 16px', cursor: 'pointer',
                    fontWeight: '600', fontSize: '13px', flex: 1, minWidth: '220px'
                  }}>
                    📂 {importFile ? importFile.name : 'Chọn file Excel (.xlsx)'}
                    <input
                      type="file" accept=".xlsx"
                      style={{ display: 'none' }}
                      onChange={e => {
                        setImportFile(e.target.files[0] || null);
                        setImportPreviewData(null);
                        setImportResult(null);
                      }}
                    />
                  </label>

                  <button
                    onClick={handleImportPreview}
                    disabled={!importFile || importLoading}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      background: (!importFile || importLoading) ? '#e5e7eb' : 'linear-gradient(135deg, #7c3aed, #a855f7)',
                      color: (!importFile || importLoading) ? '#9ca3af' : '#fff',
                      border: 'none', borderRadius: '8px', padding: '10px 20px',
                      cursor: (!importFile || importLoading) ? 'not-allowed' : 'pointer',
                      fontWeight: '600', fontSize: '13px'
                    }}
                  >
                    {importLoading ? '⏳ Đang xử lý...' : '🔍 Xem trước dữ liệu'}
                  </button>
                </div>
              )}

              {/* Preview Table */}
              {importPreviewData && !importResult && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <p style={{ margin: 0, fontWeight: '600', color: '#374151' }}>
                      Tổng <strong>{importPreviewData.totalRows}</strong> dòng — đang chọn <strong>{importSelectedRows.size}</strong> dòng để nhập
                    </p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => setImportSelectedRows(new Set(
                        importPreviewData.rows
                          .filter(r => r.status !== 'Error' && r.status !== 'Delete')
                          .map(r => r.rowIndex)
                      ))}
                        style={{ fontSize: '12px', padding: '4px 10px', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', background: '#f9fafb' }}>
                        ☑️ Chọn tất cả (không tính Xóa)
                      </button>
                      <button onClick={() => setImportSelectedRows(new Set())}
                        style={{ fontSize: '12px', padding: '4px 10px', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', background: '#f9fafb' }}>
                        ☐ Bỏ chọn tất cả
                      </button>
                    </div>
                  </div>

                  <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ background: '#f3f4f6' }}>
                          <th style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #e5e7eb', width: '40px' }}>✓</th>
                          <th style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #e5e7eb', width: '70px' }}>Ảnh</th>
                          <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Tên sản phẩm</th>
                          <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Danh mục</th>
                          <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>Giá bán</th>
                          <th style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>Trạng thái</th>
                          <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Ghi chú lỗi / cảnh báo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importPreviewData.rows.map(row => {
                          const isSelected = importSelectedRows.has(row.rowIndex);
                          const isDelete = row.status === 'Delete';
                          const isError = row.status === 'Error';
                          const statusColor = isDelete ? '#7f1d1d' : row.status === 'New' ? '#16a34a' : row.status === 'Update' ? '#ca8a04' : '#dc2626';
                          const statusBg = isDelete ? '#fef2f2' : row.status === 'New' ? '#f0fdf4' : row.status === 'Update' ? '#fefce8' : '#fff5f5';
                          const statusLabel = isDelete ? '⚠️ SẼ XÓA VĨNH VIỄN' : row.status === 'New' ? '✨ Mới' : row.status === 'Update' ? '🔄 Cập nhật' : '❌ Lỗi';
                          return (
                            <tr key={row.rowIndex} style={{
                              background: isDelete ? '#fef2f2' : isError ? '#fff5f5' : isSelected ? '#f0fdf4' : '#fff',
                              borderBottom: '1px solid #f3f4f6',
                              opacity: isError ? 0.75 : 1,
                              outline: isDelete && isSelected ? '2px solid #dc2626' : 'none'
                            }}>
                              <td style={{ padding: '10px', textAlign: 'center' }}>
                                {isDelete ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => toggleImportRow(row.rowIndex)}
                                      style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#dc2626' }}
                                    />
                                    {!isSelected && <span style={{ fontSize: '9px', color: '#dc2626', fontWeight: '700' }}>tick để xóa</span>}
                                  </div>
                                ) : (
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    disabled={isError}
                                    onChange={() => toggleImportRow(row.rowIndex)}
                                    style={{ cursor: isError ? 'not-allowed' : 'pointer', width: '16px', height: '16px' }}
                                  />
                                )}
                              </td>
                              <td style={{ padding: '8px', textAlign: 'center' }}>
                                {row.imageThumbnailBase64 ? (
                                  <img
                                    src={row.imageThumbnailBase64}
                                    alt={row.name}
                                    style={{ width: '52px', height: '52px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e5e7eb' }}
                                  />
                                ) : (
                                  <div style={{
                                    width: '52px', height: '52px', borderRadius: '6px',
                                    background: '#f3f4f6', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', fontSize: '20px', margin: '0 auto'
                                  }}>🌿</div>
                                )}
                              </td>
                              <td style={{ padding: '10px', fontWeight: '600', color: '#1f2937', maxWidth: '180px' }}>
                                {row.name || <em style={{ color: '#9ca3af' }}>Tên rỗng</em>}
                              </td>
                              <td style={{ padding: '10px', color: '#6b7280' }}>{row.categoryName}</td>
                              <td style={{ padding: '10px', textAlign: 'right', fontWeight: '600', color: '#059669' }}>
                                {row.price > 0
                                  ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(row.price)
                                  : <span style={{ color: '#9ca3af' }}>Liên hệ</span>}
                              </td>
                              <td style={{ padding: '10px', textAlign: 'center' }}>
                                <span style={{
                                  display: 'inline-block', padding: '3px 10px', borderRadius: '999px',
                                  fontWeight: '700', fontSize: '11px',
                                  background: statusBg, color: statusColor, border: `1px solid ${statusColor}40`
                                }}>
                                  {statusLabel}
                                </span>
                              </td>
                              <td style={{ padding: '10px', fontSize: '12px' }}>
                                {row.errorMessage && <div style={{ color: '#dc2626', fontWeight: '600' }}>⚠️ {row.errorMessage}</div>}
                                {row.warnings?.map((w, i) => (
                                  <div key={i} style={{ color: '#92400e' }}>💡 {w}</div>
                                ))}
                                {!row.errorMessage && (!row.warnings || row.warnings.length === 0) && (
                                  <span style={{ color: '#9ca3af' }}>—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Kết quả sau confirm */}
              {importResult && (
                <div style={{
                  textAlign: 'center', padding: '40px 20px',
                  background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                  borderRadius: '12px'
                }}>
                  <div style={{ fontSize: '60px', marginBottom: '16px' }}>🎉</div>
                  <h3 style={{ margin: '0 0 8px', color: '#065f46', fontSize: '22px' }}>
                    Đồng bộ hoàn tất!
                  </h3>
                  {importResult.successCount > 0 && (
                    <p style={{ margin: '0 0 4px', fontSize: '16px', color: '#374151' }}>
                      ✅ Thêm/Cập nhật: <strong style={{ color: '#16a34a', fontSize: '20px' }}>{importResult.successCount}</strong> sản phẩm
                    </p>
                  )}
                  {importResult.deletedCount > 0 && (
                    <p style={{ margin: '4px 0', fontSize: '15px', color: '#7f1d1d' }}>
                      🗑️ Đã xóa: <strong>{importResult.deletedCount}</strong> sản phẩm
                    </p>
                  )}
                  {importResult.failedCount > 0 && (
                    <p style={{ margin: '4px 0', color: '#dc2626', fontSize: '14px' }}>
                      ❌ Thất bại: <strong>{importResult.failedCount}</strong> dòng
                    </p>
                  )}
                  <button
                    onClick={handleCloseImportModal}
                    style={{
                      marginTop: '20px', padding: '10px 28px',
                      background: 'linear-gradient(135deg, #059669, #10b981)',
                      color: '#fff', border: 'none', borderRadius: '8px',
                      cursor: 'pointer', fontWeight: '700', fontSize: '14px'
                    }}
                  >
                    Đóng & Xem danh sách mới
                  </button>
                </div>
              )}
            </div>

            {/* Footer: Confirm button */}
            {importPreviewData && !importResult && (
              <div style={{
                padding: '16px 24px', borderTop: '1px solid #e5e7eb',
                display: 'flex', justifyContent: 'flex-end', gap: '10px',
                background: '#f9fafb'
              }}>
                {/* Cảnh báo nếu có dòng Xóa được tick */}
                {importPreviewData && (() => {
                  const deleteCount = importPreviewData.rows.filter(
                    r => r.status === 'Delete' && importSelectedRows.has(r.rowIndex)
                  ).length;
                  return deleteCount > 0 ? (
                    <div style={{
                      padding: '8px 14px', background: '#fef2f2', borderRadius: '8px',
                      border: '1px solid #fca5a5', color: '#7f1d1d', fontSize: '13px', fontWeight: '600'
                    }}>
                      ⚠️ Xác nhận sẽ XÓA {deleteCount} sản phẩm. Không thể hoàn tác!
                    </div>
                  ) : null;
                })()}
                <button onClick={handleCloseImportModal} style={{
                  padding: '10px 20px', border: '1px solid #d1d5db', borderRadius: '8px',
                  cursor: 'pointer', background: '#fff', color: '#374151', fontWeight: '600'
                }}>
                  Hủy
                </button>
                <button
                  onClick={handleImportConfirm}
                  disabled={importSelectedRows.size === 0 || importLoading}
                  style={{
                    padding: '10px 24px', border: 'none', borderRadius: '8px',
                    cursor: importSelectedRows.size === 0 ? 'not-allowed' : 'pointer',
                    background: importSelectedRows.size === 0
                      ? '#e5e7eb'
                      : 'linear-gradient(135deg, #059669, #10b981)',
                    color: importSelectedRows.size === 0 ? '#9ca3af' : '#fff',
                    fontWeight: '700', fontSize: '14px'
                  }}
                >
                  {importLoading ? '⏳ Đang xử lý...' : `✅ Xác nhận ${importSelectedRows.size} dòng`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminView;
