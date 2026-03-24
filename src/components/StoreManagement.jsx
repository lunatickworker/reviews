import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { storeApi } from '../utils/api';
import * as XLSX from 'xlsx';

const StoreManagement = () => {
  const { token } = useAuth();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [addressWarning, setAddressWarning] = useState('');
  
  const [newStore, setNewStore] = useState({
    storeName: '',
    address: '',
    reviewMessage: '',
  });

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
    setNewStore({ storeName: '', address: '', reviewMessage: '' });
    setEditingId(null);
    setShowForm(false);
    setAddressWarning('');
  };

  const handleEditStore = (store) => {
    setNewStore({
      storeName: store.store_name,
      address: store.address || '',
      reviewMessage: store.review_message || '',
    });
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

  const handleCreateOrUpdateStore = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!newStore.storeName.trim()) {
      setError('매장명을 입력하세요.');
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
          token
        );
        setSuccessMessage('매장이 수정되었습니다.');
      } else {
        await storeApi.create(
          newStore.storeName.trim(),
          newStore.address.trim(),
          newStore.reviewMessage.trim(),
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
              await storeApi.create(storeName, address, reviewMessage, token);
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
          setError('엑셀 파일 형식이 올바르지 않습니다. (매장명, 매장주소, 리뷰메세지 컬럼 필요)');
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
      { 매장명: '장어맛집', 매장주소: 'https://maps.app.goo.gl/4C1ftLsCmzKvpw6Q7', 리뷰메세지: '맜있게 먹었어요.' },
      { 매장명: '부산 해운대점', 매장주소: '부산시 해운대구', 리뷰메세지: '만족합니다' },
    ];

    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    XLSX.writeFile(workbook, '매장등록_템플릿.xlsx');
  };

  return (
    <div style={styles.container}>
      <div style={styles.titleSection}>
        <h2 style={styles.title}>🏪 매장 등록</h2>
        <div style={styles.storeCount}>
          <span style={styles.countLabel}>등록된 매장:</span>
          <span style={styles.countValue}>{stores.length}개</span>
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

      <div style={styles.buttonGroup}>
        <button onClick={() => !showForm ? (setShowForm(true), setEditingId(null), setNewStore({ storeName: '', address: '', reviewMessage: '' }), setAddressWarning('')) : resetForm()} style={styles.createButton}>
          {showForm ? '✕ 취소' : '➕ 새 매장 등록'}
        </button>
        <button onClick={downloadTemplate} style={styles.templateButton}>
          📥 템플릿 다운로드
        </button>
        <label style={styles.excelButton}>
          📤 엑셀 업로드
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleExcelUpload}
            style={{ display: 'none' }}
          />
        </label>
      </div>

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

          <button type="submit" style={styles.submitButton}>
            {editingId ? '수정' : '등록'}
          </button>
        </form>
      )}

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.headerRow}>
              <th style={{ ...styles.th, width: '15%' }}>매장명</th>
              <th style={{ ...styles.th, width: '25%' }}>주소</th>
              <th style={{ ...styles.th, width: '35%' }}>리뷰 메세지</th>
              <th style={{ ...styles.th, width: '15%' }}>등록일</th>
              <th style={{ ...styles.th, width: '10%' }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" style={styles.loadingCell}>로딩 중...</td>
              </tr>
            ) : stores.length === 0 ? (
              <tr>
                <td colSpan="5" style={styles.emptyCellBG}>
                  등록된 매장이 없습니다. 새 매장을 등록해주세요.
                </td>
              </tr>
            ) : (
              stores.map((store, idx) => (
                <tr
                  key={store.id}
                  style={{
                    ...styles.tr,
                    backgroundColor: idx % 2 === 0 ? 'rgba(230, 190, 255, 0.08)' : 'rgba(255, 192, 203, 0.08)',
                  }}
                >
                  <td style={{ ...styles.td, width: '15%', fontWeight: '600' }}>{store.store_name}</td>
                  <td style={{ ...styles.td, width: '25%', fontSize: '15px' }}>
                    {store.address ? (
                      store.address.startsWith('http') ? (
                        <a href={store.address} target="_blank" rel="noopener noreferrer" style={styles.link}>
                          {store.address.substring(0, 30)}...
                        </a>
                      ) : (
                        store.address
                      )
                    ) : (
                      '-'
                    )}
                  </td>
                  <td style={{ ...styles.td, width: '35%', fontSize: '15px' }}>
                    {store.review_message || '-'}
                  </td>
                  <td style={{ ...styles.td, width: '15%', fontSize: '15px' }}>
                    {new Date(store.created_at).toLocaleDateString('ko-KR')}
                  </td>
                  <td style={{ ...styles.td, width: '10%' }}>
                    <div style={styles.actionButtons}>
                      <button
                        onClick={() => handleEditStore(store)}
                        style={styles.editButton}
                        title="수정"
                      >
                        ✎ 수정
                      </button>
                      <button
                        onClick={() => handleDeleteStore(store.id)}
                        style={styles.deleteButton}
                        title="삭제"
                      >
                        🗑️ 삭제
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
    padding: '30px',
    border: '1px solid rgba(124, 58, 237, 0.2)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
  },

  titleSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    gap: '20px',
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
    gap: '10px',
    padding: '12px 20px',
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    border: '1px solid rgba(124, 58, 237, 0.3)',
    borderRadius: '8px',
    backdropFilter: 'blur(5px)',
    whiteSpace: 'nowrap',
  },

  countLabel: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#b0b9c6',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },

  countValue: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#7c3aed',
  },

  error: {
    padding: '12px 15px',
    backgroundColor: 'rgba(218, 18, 125, 0.15)',
    border: '1px solid rgba(218, 18, 125, 0.3)',
    borderRadius: '8px',
    color: '#ff6b9d',
    fontSize: '18px',
    marginBottom: '15px',
    whiteSpace: 'pre-wrap',
  },

  success: {
    padding: '12px 15px',
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    border: '1px solid rgba(76, 175, 80, 0.3)',
    borderRadius: '8px',
    color: '#76ff03',
    fontSize: '18px',
    marginBottom: '15px',
    whiteSpace: 'pre-wrap',
  },

  buttonGroup: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },

  createButton: {
    padding: '12px 20px',
    backgroundColor: 'rgba(124, 58, 237, 0.5)',
    border: '1px solid rgba(124, 58, 237, 0.6)',
    borderRadius: '8px',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '18px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(5px)',
    whiteSpace: 'nowrap',
  },

  templateButton: {
    padding: '12px 20px',
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    border: '1px solid rgba(76, 175, 80, 0.5)',
    borderRadius: '8px',
    color: '#76ff03',
    cursor: 'pointer',
    fontSize: '18px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(5px)',
    whiteSpace: 'nowrap',
  },

  excelButton: {
    padding: '12px 20px',
    backgroundColor: 'rgba(33, 150, 243, 0.3)',
    border: '1px solid rgba(33, 150, 243, 0.5)',
    borderRadius: '8px',
    color: '#42a5f5',
    cursor: 'pointer',
    fontSize: '18px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(5px)',
    display: 'inline-block',
    whiteSpace: 'nowrap',
  },

  form: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px',
    marginBottom: '25px',
    padding: '20px',
    background: 'rgba(124, 58, 237, 0.1)',
    borderRadius: '8px',
    border: '1px solid rgba(124, 58, 237, 0.2)',
    backdropFilter: 'blur(5px)',
    alignItems: 'flex-end',
  },

  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },

  label: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#e0e0e0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },

  input: {
    padding: '10px 12px',
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
    fontSize: '15px',
    color: '#ffb74d',
    marginTop: '5px',
    padding: '8px',
    backgroundColor: 'rgba(255, 183, 77, 0.1)',
    borderRadius: '4px',
    border: '1px solid rgba(255, 183, 77, 0.3)',
  },

  submitButton: {
    padding: '10px 20px',
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    border: '1px solid rgba(76, 175, 80, 0.5)',
    borderRadius: '6px',
    color: '#76ff03',
    cursor: 'pointer',
    fontSize: '16px',
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
    maxHeight: '60vh',
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '16px',
  },

  headerRow: {
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    borderBottom: '2px solid rgba(124, 58, 237, 0.3)',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },

  th: {
    padding: '12px 15px',
    textAlign: 'left',
    color: '#ffffff',
    fontWeight: '600',
    fontSize: '15px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },

  tr: {
    borderBottom: '1px solid rgba(124, 58, 237, 0.15)',
    transition: 'background-color 0.2s ease',
  },

  td: {
    padding: '12px 15px',
    color: '#e0e0e0',
  },

  loadingCell: {
    padding: '20px',
    textAlign: 'center',
    color: '#8b96a8',
    fontStyle: 'italic',
  },

  emptyCellBG: {
    padding: '40px 20px',
    textAlign: 'center',
    color: '#8b96a8',
    fontStyle: 'italic',
    fontSize: '18px',
  },

  deleteButton: {
    padding: '6px 10px',
    backgroundColor: 'rgba(218, 18, 125, 0.2)',
    border: '1px solid rgba(218, 18, 125, 0.4)',
    borderRadius: '4px',
    color: '#ff6b9d',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    backdropFilter: 'blur(3px)',
    whiteSpace: 'nowrap',
  },

  editButton: {
    padding: '6px 10px',
    backgroundColor: 'rgba(33, 150, 243, 0.2)',
    border: '1px solid rgba(33, 150, 243, 0.4)',
    borderRadius: '4px',
    color: '#42a5f5',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    backdropFilter: 'blur(3px)',
    whiteSpace: 'nowrap',
    marginRight: '5px',
  },

  actionButtons: {
    display: 'flex',
    gap: '5px',
    flexWrap: 'wrap',
  },

  link: {
    color: '#42a5f5',
    textDecoration: 'underline',
    cursor: 'pointer',
  },
};
