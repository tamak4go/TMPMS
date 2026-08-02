const LEGACY_STATUS_MAP = {
  Active: 'Approved',
  Filled: 'Fulfilled',
  Cancelled: 'Rejected',
};

export function normalizePrescriptionStatus(status) {
  if (!status) return '';
  return LEGACY_STATUS_MAP[status] || status;
}

export function getPrescriptionStatusLabel(status, audience = 'admin') {
  const normalized = normalizePrescriptionStatus(status);

  if (audience === 'patient') {
    switch (normalized) {
      case 'Pending':
        return 'Chờ duyệt';
      case 'Approved':
        return 'Đã duyệt';
      case 'Fulfilled':
        return 'Đã hoàn tất';
      case 'Rejected':
        return 'Đã hủy';
      default:
        return 'Không rõ';
    }
  }

  switch (normalized) {
    case 'Pending':
      return 'Chờ duyệt';
    case 'Approved':
      return 'Đã duyệt';
    case 'Fulfilled':
      return 'Đã hoàn tất';
    case 'Rejected':
      return 'Đã hủy';
    default:
      return 'Không rõ';
  }
}

export function getPrescriptionStatusClass(status) {
  return normalizePrescriptionStatus(status).toLowerCase();
}

export const PRESCRIPTION_ACTION = {
  APPROVE: 'Approved',
  REJECT: 'Rejected',
};
