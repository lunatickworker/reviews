// frontend/src/components/common/PageLayout.jsx
import React from 'react';
import { getPageStyles } from '../../styles/theme';

/**
 * 모든 페이지에서 사용할 기본 레이아웃
 * 일관된 여백, 배경, 구조 제공
 */
const PageLayout = ({ children, title, description, actions, maxWidth = 'wide' }) => {
  const styles = getPageStyles();

  return (
    <div style={styles.pageContainer}>
      <div style={{ ...styles.pageContent, maxWidth: maxWidth === 'wide' ? '100%' : '900px' }}>
        {(title || description || actions) && (
          <div style={styles.pageHeader}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                {title && <h1 style={styles.pageTitle}>{title}</h1>}
                {description && <p style={styles.pageDescription}>{description}</p>}
              </div>
              {actions && <div style={{ display: 'flex', gap: '12px' }}>{actions}</div>}
            </div>
          </div>
        )}
        {children}
      </div>
    </div>
  );
};

export default PageLayout;
