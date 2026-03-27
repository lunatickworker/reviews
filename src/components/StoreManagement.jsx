import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { storeApi } from '../utils/api';
import * as XLSX from 'xlsx';

const StoreManagement = () => {
  const { token, isAdmin } = useAuth();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [addressWarning, setAddressWarning] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', order: 'desc' });
  const [selectedUser, setSelectedUser] = useState('');
  
  const [newStore, setNewStore] = useState({
    storeName: '',
    address: '',
    reviewMessage: '',
    imageUrls: [],
    dailyFrequency: 1,
    totalCount: 1,
  });

  const [tempImageUrl, setTempImageUrl] = useState('');  // 임시 이미지 URL 입력 필드

  // 주소 검증 함수 (URL만 허용)
  const validateAddress = (address) => {
    if (!address || !address.trim()) {
      return { valid: true, warning: '' }; // 선택입력이므로 비워도 됨
    }

    const trimmedAddress = address.trim();

    // URL 형식 체크
    if (!trimmedAddress.startsWith('http://') && !trimmedAddress.startsWith('https://')) {
      return {
        valid: false,
        warning: '⚠️ 주소는 https://로 시작하는 URL 형식이어야 합니다.',
      };
    }

    // URL 형식 검증
    try {
      new URL(trimmedAddress);
      return { valid: true, warning: '' };
    } catch {
      return {
        valid: false,
        warning: '⚠️ URL 형식이 올바르지 않습니다. (예: https://maps.app.goo.gl/...)',
      };
    }
  };

  const loadStores = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await storeApi.getAll(token);
      setStores(data || []);
    } catch (err) {
      console.error('매장 조회 오류:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  const resetForm = () => {
    setNewStore({ storeName: '', address: '', reviewMessage: '', imageUrls: [], dailyFrequency: 1, totalCount: 1 });
    setTempImageUrl('');
    setEditingId(null);
    setShowForm(false);
    setAddressWarning('');
  };

  const handleSort = (key) => {
    setSortConfig({
      key,
      order: sortConfig.key === key && sortConfig.order === 'asc' ? 'desc' : 'asc',
    });
  };

  // 등록자별 매장 수 계산
  const getUserStoreStats = () => {
    const stats = {};
    stores.forEach(store => {
      const userId = store.user?.user_id || '미등록';
      stats[userId] = (stats[userId] || 0) + 1;
    });
    return stats;
  };

  const getSortedStores = () => {
    let filtered = [...stores];

    // 필터링: 선택된 등록자가 있으면 필터링
    if (selectedUser) {
      filtered = filtered.filter(store => {
        const userId = store.user?.user_id || '미등록';
        return userId === selectedUser;
      });
    }

    // 정렬
    const sorted = filtered.sort((a, b) => {
      let aValue, bValue;

      if (sortConfig.key === 'store_name') {
        aValue = a.store_name || '';
        bValue = b.store_name || '';
        // 문자열 비교
        if (sortConfig.order === 'asc') {
          return aValue.localeCompare(bValue, 'ko-KR');
        } else {
          return bValue.localeCompare(aValue, 'ko-KR');
        }
      } else if (sortConfig.key === 'user_id') {
        aValue = a.user?.user_id || '미등록';
        bValue = b.user?.user_id || '미등록';
        if (sortConfig.order === 'asc') {
          return aValue.localeCompare(bValue, 'ko-KR');
        } else {
          return bValue.localeCompare(aValue, 'ko-KR');
        }
      } else if (sortConfig.key === 'created_at') {
        aValue = new Date(a.created_at);
        bValue = new Date(b.created_at);
      }

      if (aValue < bValue) return sortConfig.order === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.order === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  };

  const handleEditStore = (store) => {
    setNewStore({
      storeName: store.store_name,
      address: store.address || '',
      reviewMessage: store.review_message || '',
      imageUrls: Array.isArray(store.image_urls) ? store.image_urls : [],
      dailyFrequency: store.daily_frequency || 1,
      totalCount: store.total_count || 1,
    });
    setTempImageUrl('');
    setEditingId(store.id);
    setShowForm(true);
    setError('');
    setSuccessMessage('');
    setAddressWarning('');
  };

  const handleAddressChange = (value) => {
    setNewStore({ ...newStore, address: value });
    const validation = validateAddress(value);
    setAddressWarning(validation.warning);
  };

  // 이미지 URL 추가
  const handleAddImageUrl = () => {
    if (!tempImageUrl.trim()) {
      setError('이미지 URL을 입력하세요.');
      return;
    }

    // URL 형식 검증
    if (!tempImageUrl.trim().startsWith('http://') && !tempImageUrl.trim().startsWith('https://')) {
      setError('⚠️ 이미지 URL은 http:// 또는 https://로 시작해야 합니다.');
      return;
    }

    try {
      new URL(tempImageUrl.trim());
    } catch {
      setError('⚠️ 유효한 URL 형식이 아닙니다.');
      return;
    }

    // 중복 체크
    if (newStore.imageUrls.includes(tempImageUrl.trim())) {
      setError('이미 추가된 이미지 URL입니다.');
      return;
    }

    setNewStore({
      ...newStore,
      imageUrls: [...newStore.imageUrls, tempImageUrl.trim()]
    });
    setTempImageUrl('');
    setError('');
  };

  // 이미지 URL 제거
  const handleRemoveImageUrl = (index) => {
    setNewStore({
      ...newStore,
      imageUrls: newStore.imageUrls.filter((_, i) => i !== index)
    });
  };

  const handleCreateOrUpdateStore = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!newStore.storeName.trim()) {
      setError('매장명을 입력하세요.');
      return;
    }

    const dailyFreq = parseInt(newStore.dailyFrequency) || 1;
    const totalCnt = parseInt(newStore.totalCount) || 1;

    // ✓ 검증: 총 발행 횟수는 일발행 횟수 이상이어야 함
    if (totalCnt < dailyFreq) {
      setError(`총 발행 횟수는 일발행 횟수(${dailyFreq}회) 이상이어야 합니다.`);
      return;
    }

    const addressValidation = validateAddress(newStore.address);
    if (!addressValidation.valid) {
      const confirmContinue = window.confirm(
        `${addressValidation.warning}\n\n계속 진행하시겠습니까?`
      );
      if (!confirmContinue) {
        setAddressWarning(addressValidation.warning);
        return;
      }
    }

    try {
      if (editingId) {
        await storeApi.update(
          editingId,
          newStore.storeName.trim(),
          newStore.address.trim(),
          newStore.reviewMessage.trim(),
          newStore.imageUrls,
          dailyFreq,
          totalCnt,
          token
        );
        setSuccessMessage('매장이 수정되었습니다.');
      } else {
        await storeApi.create(
          newStore.storeName.trim(),
          newStore.address.trim(),
          newStore.reviewMessage.trim(),
          newStore.imageUrls,
          dailyFreq,
          totalCnt,
          token
        );
        setSuccessMessage('매장이 등록되었습니다.');
      }
      
      resetForm();
      await loadStores();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message || '작업에 실패했습니다.');
    }
  };

  const handleDeleteStore = async (storeId) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    try {
      await storeApi.delete(storeId, token);
      await loadStores();
      setSuccessMessage('매장이 삭제되었습니다.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('매장 삭제에 실패했습니다.');
    }
  };

  const handleExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setError('');
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const workbook = XLSX.read(event.target.result, { type: 'binary' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          let successCount = 0;
          let failCount = 0;
          const failedStores = [];

          for (const row of jsonData) {
            const storeName = row['매장명']?.toString().trim();
            const address = row['매장주소']?.toString().trim() || '';
            const reviewMessage = row['리뷰메세지']?.toString().trim() || '';
            const imageUrlsText = row['이미지주소']?.toString().trim() || '';
            // 쉼표로 구분된 여러 이미지 URL이 있을 수 있음
            const imageUrls = imageUrlsText
              ? imageUrlsText.split(',').map(url => url.trim()).filter(url => url.length > 0)
              : [];
            const dailyFrequency = parseInt(row['하루횟수']) || 1;
            const totalCount = parseInt(row['총횟수']) || 1;

            if (!storeName) {
              failCount++;
              failedStores.push('매장명 없음');
              continue;
            }

            const addressValidation = validateAddress(address);
            if (!addressValidation.valid) {
              failCount++;
              failedStores.push(`${storeName}: ${addressValidation.warning}`);
              continue;
            }

            try {
              await storeApi.create(storeName, address, reviewMessage, imageUrls, dailyFrequency, totalCount, token);
              successCount++;
            } catch (err) {
              failCount++;
              failedStores.push(`${storeName}: ${err.message}`);
            }
          }

          let message = `✅ ${successCount}개 매장 등록완료`;
          if (failCount > 0) {
            message += `, ❌ ${failCount}개 오류`;
            if (failedStores.length > 0) {
              message += `\n\n오류 내역:\n${failedStores.slice(0, 5).join('\n')}`;
              if (failedStores.length > 5) {
                message += `\n... 외 ${failedStores.length - 5}개`;
              }
            }
          }

          setSuccessMessage(message);
          setTimeout(() => setSuccessMessage(''), 5000);
          await loadStores();
        } catch (error) {
          setError('엑셀 파일 형식이 올바르지 않습니다. (매장명, 매장주소, 리뷰메세지, 이미지주소 컬럼 필요)');
        }
      };
      reader.readAsBinaryString(file);
    } catch (error) {
      setError('파일 읽기에 실패했습니다.');
    }

    e.target.value = '';
  };

  const downloadTemplate = () => {
    const template = [
      { 매장명: '장어맛집', 매장주소: 'https://maps.app.goo.gl/4C1ftLsCmzKvpw6Q7', 리뷰메세지: '맜있게 먹었어요.', 이미지주소: 'https://example.com/image1.jpg, https://example.com/image2.jpg', 하루횟수: 2, 총횟수: 10 },
    ];

    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    XLSX.writeFile(workbook, '매장등록_템플릿.xlsx');
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.titleSection}>
          <h2 style={styles.title}>🏪 매장 등록</h2>
          <div style={styles.storeCount}>
            <span style={styles.countLabel}>등록된 매장</span>
            <span style={styles.countValue}>{stores.length}</span>
          </div>
        </div>

        <div style={styles.controlBar}>
          <div style={styles.buttonGroup}>
            <button onClick={() => !showForm ? (setShowForm(true), setEditingId(null), setNewStore({ storeName: '', address: '', reviewMessage: '', imageUrls: [], dailyFrequency: 1, totalCount: 1 }), setTempImageUrl(''), setAddressWarning('')) : resetForm()} style={styles.createButton}>
              {showForm ? '✕ 취소' : '➕ 새 매장'}
            </button>
            <button onClick={downloadTemplate} style={styles.templateButton}>
              📥 템플릿
            </button>
            <label style={styles.excelButton}>
              📤 업로드
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleExcelUpload}
                style={{ display: 'none' }}
              />
            </label>
          </div>
          {isAdmin && stores.length > 0 && (
            <div style={styles.filterSection}>
              <label style={styles.filterLabel}>등록자</label>
              <select 
                value={selectedUser} 
                onChange={(e) => setSelectedUser(e.target.value)}
                style={styles.filterSelect}
              >
                <option value="">전체 ({stores.length})</option>
                {Object.entries(getUserStoreStats()).map(([userId, count]) => (
                  <option key={userId} value={userId}>
                    {userId} ({count})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {error && <p style={styles.error}>{error}</p>}
      {successMessage && (
        <p style={styles.success}>
          {successMessage.split('\n').map((line, idx) => (
            <React.Fragment key={idx}>
              {line}
              {idx < successMessage.split('\n').length - 1 && <br />}
            </React.Fragment>
          ))}
        </p>
      )}

      {showForm && (
        <form onSubmit={handleCreateOrUpdateStore} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>매장명 *</label>
            <input
              type="text"
              placeholder="예: 장어맛집"
              value={newStore.storeName}
              onChange={(e) => setNewStore({ ...newStore, storeName: e.target.value })}
              style={styles.input}
              autoFocus
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>매장 주소</label>
            <input
              type="text"
              placeholder="예: https://maps.app.goo.gl/ABC123XYZ..."
              value={newStore.address}
              onChange={(e) => handleAddressChange(e.target.value)}
              style={styles.input}
            />
            {addressWarning && <p style={styles.warning}>{addressWarning}</p>}
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>리뷰 메세지</label>
            <textarea
              placeholder="예: 맜있게 먹었어요."
              value={newStore.reviewMessage}
              onChange={(e) => setNewStore({ ...newStore, reviewMessage: e.target.value })}
              style={{ ...styles.input, minHeight: '80px', resize: 'vertical' }}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>이미지 주소</label>
            <div style={styles.imageInputGroup}>
              <input
                type="text"
                placeholder="예: https://example.com/image.jpg"
                value={tempImageUrl}
                onChange={(e) => setTempImageUrl(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddImageUrl()}
                style={{ ...styles.input, flex: 1 }}
              />
              <button
                type="button"
                onClick={handleAddImageUrl}
                style={styles.addImageButton}
              >
                ➕ 추가
              </button>
            </div>
            <p style={styles.helperText}>
              ℹ️ 이미지 URL은 https://로 시작하는 형식이어야 합니다. (선택입력)
            </p>

            {newStore.imageUrls.length > 0 && (
              <div style={styles.imageList}>
                <label style={styles.imageListLabel}>추가된 이미지 ({newStore.imageUrls.length}개)</label>
                <ul style={styles.imageListUl}>
                  {newStore.imageUrls.map((imageUrl, idx) => (
                    <li key={idx} style={styles.imageListItem}>
                      <a href={imageUrl} target="_blank" rel="noopener noreferrer" style={styles.imageLink}>
                        {imageUrl.substring(0, 50)}...
                      </a>
                      <button
                        type="button"
                        onClick={() => handleRemoveImageUrl(idx)}
                        style={styles.removeImageButton}
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '15px' }}>
            <div style={styles.formGroup}>
              <label style={styles.label}>하루 발행 횟수</label>
              <input
                type="number"
                min="1"
                placeholder="1"
                value={newStore.dailyFrequency}
                onChange={(e) => setNewStore({ ...newStore, dailyFrequency: e.target.value })}
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>총 발행 횟수</label>
              <input
                type="number"
                min="1"
                placeholder="1"
                value={newStore.totalCount}
                onChange={(e) => setNewStore({ ...newStore, totalCount: e.target.value })}
                style={styles.input}
              />
              <p style={styles.helperText}>
                ℹ️ 총 발행 횟수는 하루 발행 횟수({newStore.dailyFrequency || 1}) 이상이어야 합니다.
              </p>
            </div>
          </div>

          <button type="submit" style={styles.submitButton}>
            {editingId ? '수정' : '등록'}
          </button>
        </form>
      )}

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.headerRow}>
              <th style={{ ...styles.th, width: '12%', cursor: 'pointer' }} 
                onClick={() => handleSort('store_name')}
              >
                매장명 {sortConfig.key === 'store_name' && (sortConfig.order === 'asc' ? '▲' : '▼')}
              </th>
              <th style={{ ...styles.th, width: isAdmin ? '16%' : '20%' }}>주소</th>
              <th style={{ ...styles.th, width: isAdmin ? '18%' : '22%' }}>리뷰 메세지</th>
              <th style={{ ...styles.th, width: '8%' }}>하루발행</th>
              <th style={{ ...styles.th, width: '8%' }}>총발행</th>
              {isAdmin && (
                <th 
                  style={{ ...styles.th, width: '10%', cursor: 'pointer' }}
                  onClick={() => handleSort('user_id')}
                >
                  등록자 {sortConfig.key === 'user_id' && (sortConfig.order === 'asc' ? '▲' : '▼')}
                </th>
              )}
              <th style={{ ...styles.th, width: '10%' }}>등록일</th>
              <th style={{ ...styles.th, width: '8%' }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={isAdmin ? 8 : 7} style={styles.loadingCell}>로딩 중...</td>
              </tr>
            ) : stores.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 8 : 7} style={styles.emptyCellBG}>
                  등록된 매장이 없습니다. 새 매장을 등록해주세요.
                </td>
              </tr>
            ) : (
              getSortedStores().map((store, idx) => (
                <tr
                  key={store.id}
                  style={{
                    ...styles.tr,
                    backgroundColor: idx % 2 === 0 ? 'rgba(230, 190, 255, 0.08)' : 'rgba(255, 192, 203, 0.08)',
                  }}
                >
                  <td style={{ ...styles.td, width: '12%', fontWeight: '600' }}>{store.store_name}</td>
                  <td style={{ ...styles.td, width: isAdmin ? '16%' : '20%', fontSize: '15px' }}>
                    {store.address ? (
                      store.address.startsWith('http') ? (
                        <a href={store.address} target="_blank" rel="noopener noreferrer" style={styles.link}>
                          {store.address.substring(0, 25)}...
                        </a>
                      ) : (
                        store.address
                      )
                    ) : (
                      '-'
                    )}
                  </td>
                  <td style={{ ...styles.td, width: isAdmin ? '18%' : '22%', fontSize: '15px' }}>
                    {store.review_message || '-'}
                  </td>
                  <td style={{ ...styles.td, width: '8%', fontSize: '15px', textAlign: 'center', fontWeight: '500', color: '#f59e0b' }}>
                    {store.daily_frequency || '-'}회
                  </td>
                  <td style={{ ...styles.td, width: '8%', fontSize: '15px', textAlign: 'center', fontWeight: '500', color: '#06b6d4' }}>
                    {store.total_count || '-'}회
                  </td>
                  {isAdmin && (
                    <td style={{ ...styles.td, width: '10%', fontSize: '15px', fontWeight: '500', color: '#a78bfa' }}>
                      {store.user?.user_id || '-'}
                    </td>
                  )}
                  <td style={{ ...styles.td, width: '10%', fontSize: '15px' }}>
                    {new Date(store.created_at).toLocaleDateString('ko-KR')}
                  </td>
                  <td style={{ ...styles.td, width: '8%' }}>
                    <div style={styles.actionButtons}>
                      <button
                        onClick={() => handleEditStore(store)}
                        style={styles.editButton}
                        title="수정"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDeleteStore(store.id)}
                        style={styles.deleteButton}
                        title="삭제"
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StoreManagement;

const styles = {
  container: {
    background: 'rgba(37, 45, 66, 0.7)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid rgba(124, 58, 237, 0.2)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
  },

  header: {
    marginBottom: '20px',
    paddingBottom: '16px',
    borderBottom: '1px solid rgba(124, 58, 237, 0.2)',
  },

  titleSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    gap: '16px',
  },

  title: {
    margin: 0,
    color: '#ffffff',
    fontSize: '24px',
    fontWeight: '600',
    flex: 1,
  },

  storeCount: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 14px',
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    border: '1px solid rgba(124, 58, 237, 0.3)',
    borderRadius: '6px',
    backdropFilter: 'blur(5px)',
    whiteSpace: 'nowrap',
  },

  countLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#b0b9c6',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },

  countValue: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#7c3aed',
  },

  controlBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },

  filterSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 14px',
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    border: '1px solid rgba(124, 58, 237, 0.25)',
    borderRadius: '6px',
    whiteSpace: 'nowrap',
  },

  filterLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#a78bfa',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },

  filterSelect: {
    padding: '6px 10px',
    backgroundColor: 'rgba(30, 35, 50, 0.8)',
    color: '#e5e7eb',
    border: '1px solid rgba(124, 58, 237, 0.4)',
    borderRadius: '5px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    minWidth: '140px',
  },


  error: {
    padding: '12px 14px',
    backgroundColor: 'rgba(218, 18, 125, 0.15)',
    border: '1px solid rgba(218, 18, 125, 0.3)',
    borderRadius: '6px',
    color: '#ff6b9d',
    fontSize: '14px',
    marginBottom: '16px',
    whiteSpace: 'pre-wrap',
  },

  success: {
    padding: '12px 14px',
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    border: '1px solid rgba(76, 175, 80, 0.3)',
    borderRadius: '6px',
    color: '#76ff03',
    fontSize: '14px',
    marginBottom: '16px',
    whiteSpace: 'pre-wrap',
  },

  buttonGroup: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 0,
  },

  createButton: {
    padding: '8px 16px',
    backgroundColor: 'rgba(124, 58, 237, 0.5)',
    border: '1px solid rgba(124, 58, 237, 0.6)',
    borderRadius: '6px',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(5px)',
    whiteSpace: 'nowrap',
  },

  templateButton: {
    padding: '8px 16px',
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    border: '1px solid rgba(76, 175, 80, 0.5)',
    borderRadius: '6px',
    color: '#76ff03',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(5px)',
    whiteSpace: 'nowrap',
  },

  excelButton: {
    padding: '8px 16px',
    backgroundColor: 'rgba(33, 150, 243, 0.3)',
    border: '1px solid rgba(33, 150, 243, 0.5)',
    borderRadius: '6px',
    color: '#42a5f5',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(5px)',
    display: 'inline-block',
    whiteSpace: 'nowrap',
  },

  form: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '24px',
    padding: '16px',
    background: 'rgba(124, 58, 237, 0.1)',
    borderRadius: '8px',
    border: '1px solid rgba(124, 58, 237, 0.2)',
    backdropFilter: 'blur(5px)',
    alignItems: 'flex-end',
  },

  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },

  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#d1d5db',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },

  input: {
    padding: '8px 11px',
    border: '1px solid rgba(124, 58, 237, 0.3)',
    borderRadius: '6px',
    fontSize: '16px',
    backgroundColor: 'rgba(40, 50, 70, 0.9)',
    color: '#e0e0e0',
    backdropFilter: 'blur(5px)',
    fontFamily: 'inherit',
    transition: 'all 0.2s ease',
  },

  warning: {
    fontSize: '14px',
    color: '#ffb74d',
    marginTop: '4px',
    padding: '6px',
    backgroundColor: 'rgba(255, 183, 77, 0.1)',
    borderRadius: '4px',
    border: '1px solid rgba(255, 183, 77, 0.3)',
  },

  helperText: {
    fontSize: '12px',
    color: '#64b5f6',
    marginTop: '6px',
    padding: '4px 6px',
    backgroundColor: 'rgba(100, 181, 246, 0.1)',
    borderRadius: '4px',
    border: '1px solid rgba(100, 181, 246, 0.2)',
    margin: '6px 0 0 0',
  },

  submitButton: {
    padding: '8px 18px',
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    border: '1px solid rgba(76, 175, 80, 0.5)',
    borderRadius: '6px',
    color: '#76ff03',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(5px)',
    height: 'fit-content',
  },

  tableWrapper: {
    borderRadius: '8px',
    border: '1px solid rgba(124, 58, 237, 0.2)',
    overflow: 'auto',
    background: 'rgba(37, 45, 66, 0.5)',
    backdropFilter: 'blur(5px)',
    maxHeight: '70vh',
    padding: '12px',
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
    minWidth: '1100px',
  },

  headerRow: {
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    borderBottom: '2px solid rgba(124, 58, 237, 0.3)',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },

  th: {
    padding: '10px 12px',
    textAlign: 'left',
    color: '#e5e7eb',
    fontWeight: '600',
    fontSize: '13px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },

  tr: {
    borderBottom: '1px solid rgba(124, 58, 237, 0.15)',
    transition: 'background-color 0.2s ease',
  },

  td: {
    padding: '10px 12px',
    color: '#e5e7eb',
    fontSize: '14px',
    verticalAlign: 'middle',
  },

  loadingCell: {
    padding: '16px',
    textAlign: 'center',
    color: '#8b96a8',
    fontStyle: 'italic',
    fontSize: '14px',
  },

  emptyCellBG: {
    padding: '32px 16px',
    textAlign: 'center',
    color: '#8b96a8',
    fontStyle: 'italic',
    fontSize: '15px',
  },

  deleteButton: {
    padding: '4px 8px',
    backgroundColor: 'rgba(218, 18, 125, 0.2)',
    border: '1px solid rgba(218, 18, 125, 0.4)',
    borderRadius: '4px',
    color: '#ff6b9d',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    backdropFilter: 'blur(3px)',
    whiteSpace: 'nowrap',
  },

  editButton: {
    padding: '4px 8px',
    backgroundColor: 'rgba(33, 150, 243, 0.2)',
    border: '1px solid rgba(33, 150, 243, 0.4)',
    borderRadius: '4px',
    color: '#42a5f5',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    backdropFilter: 'blur(3px)',
    whiteSpace: 'nowrap',
    marginRight: '4px',
  },

  actionButtons: {
    display: 'flex',
    gap: '4px',
    flexWrap: 'nowrap',
    alignItems: 'center',
    justifyContent: 'center',
  },

  link: {
    color: '#42a5f5',
    textDecoration: 'underline',
    cursor: 'pointer',
  },

  imageInputGroup: {
    display: 'flex',
    gap: '8px',
    alignItems: 'flex-start',
  },

  addImageButton: {
    padding: '8px 14px',
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    border: '1px solid rgba(76, 175, 80, 0.5)',
    borderRadius: '6px',
    color: '#76ff03',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(5px)',
    whiteSpace: 'nowrap',
    height: 'fit-content',
    marginTop: '0px',
  },

  imageList: {
    marginTop: '12px',
    padding: '10px',
    backgroundColor: 'rgba(76, 175, 80, 0.08)',
    border: '1px solid rgba(76, 175, 80, 0.2)',
    borderRadius: '6px',
  },

  imageListLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#76ff03',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    display: 'block',
    marginBottom: '8px',
  },

  imageListUl: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },

  imageListItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 8px',
    backgroundColor: 'rgba(40, 50, 70, 0.6)',
    border: '1px solid rgba(76, 175, 80, 0.2)',
    borderRadius: '4px',
    fontSize: '12px',
  },

  imageLink: {
    color: '#42a5f5',
    textDecoration: 'none',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    marginRight: '8px',
  },

  removeImageButton: {
    padding: '2px 6px',
    backgroundColor: 'rgba(218, 18, 125, 0.2)',
    border: '1px solid rgba(218, 18, 125, 0.4)',
    borderRadius: '4px',
    color: '#ff6b9d',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    backdropFilter: 'blur(3px)',
    whiteSpace: 'nowrap',
    minWidth: '28px',
  },
};
