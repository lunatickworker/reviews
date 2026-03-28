// frontend/src/components/common/DataTable.jsx
import React from 'react';
import { getPageStyles, colors, spacing, borderRadius } from '../../styles/theme';

/**
 * 일관된 데이터 테이블 컴포넌트
 * 테이블 헤더, 행 스트라이핑, 호버 효과 포함
 */
const DataTable = ({ 
  columns, // [{ key, label, width, render, align }]
  data,
  onRowClick,
  striped = true,
  compact = false,
}) => {
  const styles = getPageStyles();

  const getCellPadding = () => {
    return compact ? 'calc(6px 12px)' : spacing.md;
  };

  return (
    <div
      style={{
        overflowX: 'auto',
        borderRadius: borderRadius.lg,
        border: `1px solid ${colors.border}`,
        background: colors.background.secondary,
      }}
    >
      <table style={styles.table}>
        <thead>
          <tr style={{ background: 'rgba(55, 65, 81, 0.9)' }}>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  ...styles.tableHeader,
                  width: col.width,
                  textAlign: col.align || 'left',
                  padding: getCellPadding(),
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data && data.length > 0 ? (
            data.map((row, idx) => (
              <tr
                key={idx}
                onClick={() => onRowClick && onRowClick(row)}
                style={{
                  background: striped && idx % 2 === 1 
                    ? 'rgba(255, 255, 255, 0.02)' 
                    : 'transparent',
                  cursor: onRowClick ? 'pointer' : 'default',
                  transition: 'background 0.2s ease',
                  '&:hover': onRowClick ? { background: 'rgba(168, 85, 247, 0.1)' } : {},
                }}
                onMouseEnter={(e) => {
                  if (onRowClick) {
                    e.currentTarget.style.background = 'rgba(168, 85, 247, 0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (onRowClick) {
                    e.currentTarget.style.background = striped && idx % 2 === 1
                      ? 'rgba(255, 255, 255, 0.02)'
                      : 'transparent';
                  }
                }}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    style={{
                      ...styles.tableCell,
                      textAlign: col.align || 'left',
                      padding: getCellPadding(),
                    }}
                  >
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={columns.length}
                style={{
                  textAlign: 'center',
                  padding: spacing.xl,
                  color: colors.text.muted,
                  ...styles.tableCell,
                }}
              >
                데이터가 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
