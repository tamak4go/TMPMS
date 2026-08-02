import React, { useState, useMemo, useEffect } from 'react';
import { Filter, SlidersHorizontal, ArrowUpDown, ChevronRight, X, RotateCcw, AlertCircle } from 'lucide-react';
import { ProductCard } from '../components/ProductSection';
import './CategoryListView.css';

const supplierNames = {
  1: 'Dược phẩm Traphaco',
  2: 'Dược phẩm OPC',
  3: 'Bách Thảo Dược',
  4: 'Sâm KGC Hàn Quốc',
  5: 'Dược phẩm Thái Minh'
};

const CategoryListView = ({ categoryId, categoryName, products, onProductClick, onBackToHome }) => {
  // Filter States
  const [selectedPriceRange, setSelectedPriceRange] = useState('all');
  const [selectedPrescription, setSelectedPrescription] = useState('all');
  const [selectedSupplier, setSelectedSupplier] = useState('all');
  
  // Sort State
  const [sortBy, setSortBy] = useState('popular'); // popular | priceAsc | priceDesc
  
  // Pagination State
  const [visibleCount, setVisibleCount] = useState(12);

  // Reset pagination when category changes
  useEffect(() => {
    setVisibleCount(12);
    setSelectedPriceRange('all');
    setSelectedPrescription('all');
    setSelectedSupplier('all');
    setSortBy('popular');
  }, [categoryId]);

  // Extract suppliers available in current product list
  const availableSuppliers = useMemo(() => {
    const ids = new Set();
    products.forEach(p => {
      // Find supplierId. Backend might return supplierId or supplier_id
      const sid = p.supplierId || p.supplier_id;
      if (sid) ids.add(sid);
    });
    return Array.from(ids).map(id => ({
      id,
      name: supplierNames[id] || `Nhà cung cấp #${id}`
    }));
  }, [products]);

  // Filter and Sort products
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Filter by Price range
    if (selectedPriceRange === 'under100') {
      result = result.filter(p => p.price < 100000);
    } else if (selectedPriceRange === '100to500') {
      result = result.filter(p => p.price >= 100000 && p.price <= 500000);
    } else if (selectedPriceRange === 'over500') {
      result = result.filter(p => p.price > 500000);
    }

    // Filter by Prescription status
    if (selectedPrescription === 'prescription') {
      result = result.filter(p => p.requiresPrescription === true);
    } else if (selectedPrescription === 'nonprescription') {
      result = result.filter(p => p.requiresPrescription === false);
    }

    // Filter by Supplier
    if (selectedSupplier !== 'all') {
      const targetSid = parseInt(selectedSupplier);
      result = result.filter(p => {
        const sid = p.supplierId || p.supplier_id;
        return sid === targetSid;
      });
    }

    // Sorting
    if (sortBy === 'priceAsc') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'priceDesc') {
      result.sort((a, b) => b.price - a.price);
    } else {
      // popular / default: sort by id
      result.sort((a, b) => a.id - b.id);
    }

    return result;
  }, [products, selectedPriceRange, selectedPrescription, selectedSupplier, sortBy]);

  // Paginated products
  const displayedProducts = useMemo(() => {
    return filteredProducts.slice(0, visibleCount);
  }, [filteredProducts, visibleCount]);

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 12);
  };

  const handleResetFilters = () => {
    setSelectedPriceRange('all');
    setSelectedPrescription('all');
    setSelectedSupplier('all');
    setSortBy('popular');
  };

  return (
    <div className="category-list-container">
      {/* Breadcrumbs */}
      <div className="cl-breadcrumbs">
        <a href="#" onClick={(e) => { e.preventDefault(); onBackToHome(); }} className="cl-breadcrumb-home">Trang chủ</a>
        <ChevronRight size={14} className="cl-breadcrumb-separator" />
        <span className="cl-breadcrumb-current">{categoryName}</span>
      </div>

      {/* Header Info */}
      <div className="cl-header">
        <h2 className="cl-title">{categoryName}</h2>
        <span className="cl-count">({filteredProducts.length} sản phẩm)</span>
      </div>

      {/* Main Content Layout */}
      <div className="cl-main-layout">
        {/* Sidebar Filters */}
        <aside className="cl-sidebar">
          <div className="cl-filter-card">
            <div className="cl-filter-header">
              <div className="cl-filter-title">
                <Filter size={16} />
                <span>Bộ lọc sản phẩm</span>
              </div>
              {(selectedPriceRange !== 'all' || selectedPrescription !== 'all' || selectedSupplier !== 'all') && (
                <button className="cl-reset-btn" onClick={handleResetFilters}>
                  <RotateCcw size={12} />
                  <span>Xóa lọc</span>
                </button>
              )}
            </div>

            {/* Filter Section: Requires Prescription */}
            {categoryId === 3 && (
              <div className="cl-filter-section">
                <h4 className="cl-section-title">Yêu cầu kê đơn</h4>
                <div className="cl-radio-group">
                  <label className={`cl-radio-label ${selectedPrescription === 'all' ? 'active' : ''}`}>
                    <input 
                      type="radio" 
                      name="prescription" 
                      checked={selectedPrescription === 'all'} 
                      onChange={() => setSelectedPrescription('all')} 
                    />
                    <span>Tất cả thuốc</span>
                  </label>
                  <label className={`cl-radio-label ${selectedPrescription === 'prescription' ? 'active' : ''}`}>
                    <input 
                      type="radio" 
                      name="prescription" 
                      checked={selectedPrescription === 'prescription'} 
                      onChange={() => setSelectedPrescription('prescription')} 
                    />
                    <span className="badge-rx">Rx</span>
                    <span>Thuốc kê đơn</span>
                  </label>
                  <label className={`cl-radio-label ${selectedPrescription === 'nonprescription' ? 'active' : ''}`}>
                    <input 
                      type="radio" 
                      name="prescription" 
                      checked={selectedPrescription === 'nonprescription'} 
                      onChange={() => setSelectedPrescription('nonprescription')} 
                    />
                    <span>Không kê đơn</span>
                  </label>
                </div>
              </div>
            )}

            {/* Filter Section: Price */}
            <div className="cl-filter-section">
              <h4 className="cl-section-title">Giá sản phẩm</h4>
              <div className="cl-radio-group">
                <label className={`cl-radio-label ${selectedPriceRange === 'all' ? 'active' : ''}`}>
                  <input 
                    type="radio" 
                    name="priceRange" 
                    checked={selectedPriceRange === 'all'} 
                    onChange={() => setSelectedPriceRange('all')} 
                  />
                  <span>Tất cả mức giá</span>
                </label>
                <label className={`cl-radio-label ${selectedPriceRange === 'under100' ? 'active' : ''}`}>
                  <input 
                    type="radio" 
                    name="priceRange" 
                    checked={selectedPriceRange === 'under100'} 
                    onChange={() => setSelectedPriceRange('under100')} 
                  />
                  <span>Dưới 100.000đ</span>
                </label>
                <label className={`cl-radio-label ${selectedPriceRange === '100to500' ? 'active' : ''}`}>
                  <input 
                    type="radio" 
                    name="priceRange" 
                    checked={selectedPriceRange === '100to500'} 
                    onChange={() => setSelectedPriceRange('100to500')} 
                  />
                  <span>100.000đ - 500.000đ</span>
                </label>
                <label className={`cl-radio-label ${selectedPriceRange === 'over500' ? 'active' : ''}`}>
                  <input 
                    type="radio" 
                    name="priceRange" 
                    checked={selectedPriceRange === 'over500'} 
                    onChange={() => setSelectedPriceRange('over500')} 
                  />
                  <span>Trên 500.000đ</span>
                </label>
              </div>
            </div>

            {/* Filter Section: Suppliers */}
            {availableSuppliers.length > 0 && (
              <div className="cl-filter-section">
                <h4 className="cl-section-title">Nhà sản xuất</h4>
                <div className="cl-radio-group">
                  <label className={`cl-radio-label ${selectedSupplier === 'all' ? 'active' : ''}`}>
                    <input 
                      type="radio" 
                      name="supplier" 
                      checked={selectedSupplier === 'all'} 
                      onChange={() => setSelectedSupplier('all')} 
                    />
                    <span>Tất cả nhà sản xuất</span>
                  </label>
                  {availableSuppliers.map(sup => (
                    <label key={sup.id} className={`cl-radio-label ${selectedSupplier === String(sup.id) ? 'active' : ''}`}>
                      <input 
                        type="radio" 
                        name="supplier" 
                        checked={selectedSupplier === String(sup.id)} 
                        onChange={() => setSelectedSupplier(String(sup.id))} 
                      />
                      <span>{sup.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Product Grid & Sort */}
        <main className="cl-content">
          {/* Sorting Toolbar */}
          <div className="cl-toolbar">
            <div className="cl-sort-wrap">
              <SlidersHorizontal size={14} className="cl-sort-icon" />
              <span className="cl-sort-label">Sắp xếp theo:</span>
              <div className="cl-sort-options">
                <button 
                  className={`cl-sort-btn ${sortBy === 'popular' ? 'active' : ''}`}
                  onClick={() => setSortBy('popular')}
                >
                  Bán chạy nhất
                </button>
                <button 
                  className={`cl-sort-btn ${sortBy === 'priceAsc' ? 'active' : ''}`}
                  onClick={() => setSortBy('priceAsc')}
                >
                  Giá thấp - cao
                </button>
                <button 
                  className={`cl-sort-btn ${sortBy === 'priceDesc' ? 'active' : ''}`}
                  onClick={() => setSortBy('priceDesc')}
                >
                  Giá cao - thấp
                </button>
              </div>
            </div>
          </div>

          {/* Product Grid */}
          {filteredProducts.length === 0 ? (
            <div className="cl-empty-state">
              <AlertCircle size={48} className="cl-empty-icon" />
              <h3>Không tìm thấy sản phẩm</h3>
              <p>Không có sản phẩm nào phù hợp với bộ lọc hiện tại của bạn. Vui lòng xóa bộ lọc và thử lại.</p>
              <button className="cl-reset-btn-large" onClick={handleResetFilters}>
                Xóa tất cả bộ lọc
              </button>
            </div>
          ) : (
            <>
              <div className="cl-grid">
                {displayedProducts.map(product => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    onProductClick={onProductClick} 
                  />
                ))}
              </div>

              {/* Load More Button */}
              {visibleCount < filteredProducts.length && (
                <div className="cl-load-more-wrap">
                  <button className="cl-load-more-btn" onClick={handleLoadMore}>
                    Xem thêm {filteredProducts.length - visibleCount} sản phẩm
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default CategoryListView;
