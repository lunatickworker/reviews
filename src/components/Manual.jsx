import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const Manual = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [expandedSections, setExpandedSections] = useState({ agency: true, admin: true });

  const styles = {
    container: {
      padding: '40px',
      maxWidth: '1200px',
      margin: '0 auto',
      backgroundColor: 'transparent',
      background: 'linear-gradient(135deg, rgba(0,0,0,0.95) 0%, rgba(15,23,42,0.95) 100%)',
      minHeight: '100vh',
      color: '#e5e7eb',
      fontFamily: "'Noto Sans KR', sans-serif",
    },
    header: {
      marginBottom: '40px',
      borderBottom: '2px solid #7c3aed',
      paddingBottom: '20px',
    },
    title: {
      fontSize: '36px',
      fontWeight: 'bold',
      color: '#e5e7eb',
      marginBottom: '8px',
    },
    subtitle: {
      fontSize: '16px',
      color: '#9ca3af',
    },
    section: {
      marginBottom: '40px',
    },
    sectionTitle: {
      fontSize: '28px',
      fontWeight: '600',
      color: '#a855f7',
      marginBottom: '20px',
      borderBottom: '1px solid #3f3f46',
      paddingBottom: '12px',
    },
    subsectionTitle: {
      fontSize: '20px',
      fontWeight: '600',
      color: '#60a5fa',
      marginTop: '20px',
      marginBottom: '12px',
    },
    subsubsectionTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#818cf8',
      marginTop: '16px',
      marginBottom: '10px',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      marginTop: '20px',
      marginBottom: '20px',
      backgroundColor: '#1f2937',
      borderRadius: '6px',
      overflow: 'hidden',
    },
    th: {
      backgroundColor: '#374151',
      padding: '12px 16px',
      textAlign: 'left',
      fontWeight: '600',
      color: '#e5e7eb',
      borderBottom: '1px solid #4b5563',
    },
    td: {
      padding: '12px 16px',
      borderBottom: '1px solid #2d3748',
      color: '#d1d5db',
    },
    trEven: {
      backgroundColor: '#111827',
    },
    ul: {
      marginLeft: '20px',
      marginBottom: '16px',
    },
    li: {
      marginBottom: '10px',
      lineHeight: '1.8',
      color: '#d1d5db',
    },
    code: {
      backgroundColor: '#1f2937',
      padding: '12px 16px',
      borderRadius: '6px',
      fontFamily: "'Courier New', monospace",
      fontSize: '13px',
      color: '#c7d2e0',
      marginTop: '12px',
      marginBottom: '12px',
      overflowX: 'auto',
      whiteSpace: 'pre-wrap',
      wordWrap: 'break-word',
      border: '1px solid #374151',
    },
    note: {
      backgroundColor: '#1e293b',
      borderLeft: '4px solid #0ea5e9',
      padding: '16px',
      marginTop: '16px',
      marginBottom: '16px',
      borderRadius: '4px',
      color: '#cbd5e1',
    },
    hr: {
      borderTop: 'none',
      borderBottom: '1px solid #374151',
      margin: '40px 0',
    },
    strong: {
      color: '#fbbf24',
    },
    link: {
      color: '#60a5fa',
      cursor: 'pointer',
      textDecoration: 'none',
      borderBottom: '1px dotted #60a5fa',
    },
    toc: {
      backgroundColor: '#1f2937',
      borderLeft: '4px solid #a855f7',
      padding: '20px',
      marginBottom: '30px',
      borderRadius: '6px',
    },
    tocTitle: {
      color: '#a855f7',
      fontSize: '18px',
      fontWeight: '600',
      marginBottom: '15px',
    },
    tocList: {
      listStyle: 'none',
      paddingLeft: 0,
    },
    tocItem: {
      marginBottom: '10px',
      color: '#60a5fa',
    },
    tocSubItem: {
      marginLeft: '20px',
      marginTop: '12px',
    },
    preCode: {
      backgroundColor: '#1f2937',
      padding: '16px',
      borderRadius: '6px',
      fontFamily: "'Courier New', monospace",
      fontSize: '12px',
      color: '#c7d2e0',
      marginTop: '12px',
      marginBottom: '12px',
      overflowX: 'auto',
      whiteSpace: 'pre-wrap',
      wordWrap: 'break-word',
      border: '1px solid #374151',
      lineHeight: '1.5',
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Google Reviews 관리 시스템 사용법</h1>
        <p style={styles.subtitle}>사용자 상세 설명서</p>
      </div>

      {/* 목차 */}
      <div style={styles.toc}>
        <h3 style={styles.tocTitle}>목차</h3>
        <ul style={styles.tocList}>
          <li style={styles.tocItem}>
            <span style={styles.link} onClick={() => setExpandedSections({...expandedSections, agency: !expandedSections.agency})}>
              {expandedSections.agency ? '▼' : '►'} 📖 사용자 가이드
            </span>
            {expandedSections.agency && (
              <ul style={{...styles.tocList, ...styles.tocSubItem}}>
                {/* <li style={styles.tocItem}><a href="#agency-menu" style={styles.link}>접근 가능한 메뉴</a></li> */}
                <li style={styles.tocItem}><a href="#agency-store" style={styles.link}>1. 매장 등록 가이드</a></li>
                <li style={styles.tocItem}><a href="#agency-task" style={styles.link}>2. 작업 진행 현황</a></li>
                <li style={styles.tocItem}><a href="#agency-review" style={styles.link}>3. 리뷰 가이드</a></li>
              </ul>
            )}
          </li>
          {isAdmin && (
            <li style={styles.tocItem}>
              <span style={styles.link} onClick={() => setExpandedSections({...expandedSections, admin: !expandedSections.admin})}>
                {expandedSections.admin ? '▼' : '►'} ⚙️ 관리자 가이드
              </span>
              {expandedSections.admin && (
                <ul style={{...styles.tocList, ...styles.tocSubItem}}>
                  {/* <li style={styles.tocItem}><a href="#admin-menu" style={styles.link}>접근 가능한 메뉴</a></li> */}
                  <li style={styles.tocItem}><a href="#admin-dashboard" style={styles.link}>1. 관리자 대시보드</a></li>
                  <li style={styles.tocItem}><a href="#admin-store" style={styles.link}>2. 매장 관리</a></li>
                  <li style={styles.tocItem}><a href="#admin-monitoring" style={styles.link}>3. 모니터링 및 분석</a></li>
                  <li style={styles.tocItem}><a href="#admin-deploy" style={styles.link}>4. 배포 및 자동화</a></li>
                  <li style={styles.tocItem}><a href="#admin-user" style={styles.link}>5. 사용자 및 계정 관리</a></li>
                  <li style={styles.tocItem}><a href="#admin-setting" style={styles.link}>6. 시스템 설정</a></li>
                  <li style={styles.tocItem}><a href="#admin-trouble" style={styles.link}>7. 트러블슈팅</a></li>
                </ul>
              )}
            </li>
          )}
        </ul>
      </div>

      {/* 사용자 가이드 */}
      <div id="agency-guide">
          <h2 style={styles.sectionTitle}>사용자(Agency) 가이드</h2>

          <div style={styles.section}>
            <h3 style={styles.subsectionTitle} id="agency-menu">접근 가능한 메뉴</h3>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>메뉴</th>
                  <th style={styles.th}>설명</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { menu: '대시보드', desc: '전체 현황 및 통계 확인' },
                  { menu: '매장 등록', desc: '새로운 매장 정보 등록 및 이미지 업로드' },
                  { menu: '작업 관리', desc: '등록한 매장의 작업 상태 관리' },
                  { menu: '리뷰', desc: '최종 승인된 매장의 리뷰 현황 분석' },
                  { menu: '계정 관리', desc: '팀 계정 관리' },
                ].map((item, idx) => (
                  <tr key={idx} style={idx % 2 === 0 ? styles.trEven : {}}>
                    <td style={styles.td}><strong style={styles.strong}>{item.menu}</strong></td>
                    <td style={styles.td}>{item.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={styles.section}>
            <h3 style={styles.subsectionTitle} id="agency-store">1. 매장 등록 가이드</h3>
            <div style={styles.note}>
              <strong style={styles.strong}>이 중요:</strong> 리뷰 메시지는 시스템 작동을 위한 필수 입력 항목입니다. 누락 시 등록이 불가능합니다.
            </div>

            <div style={styles.subsubsectionTitle}>Step 1: 매장 정보 입력</div>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>필드</th>
                  <th style={styles.th}>필수/선택</th>
                  <th style={styles.th}>설명</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { field: '매장명', req: '필수', desc: '고객에게 보이는 매장 이름' },
                  { field: '주소', req: '필수', desc: 'Google Maps에 표시될 정확한 위치' },
                  { field: '리뷰 메시지', req: '필수', desc: '리뷰 가이드를 작성 후 AI로 생성한 원고' },
                  { field: '이미지 (1번째)', req: '선택', desc: '업로드 이미지' },
                  { field: '이미지 (2번째)', req: '선택', desc: '업로드 이미지' },
                ].map((item, idx) => (
                  <tr key={idx} style={idx % 2 === 0 ? styles.trEven : {}}>
                    <td style={styles.td}><strong style={styles.strong}>{item.field}</strong></td>
                    <td style={styles.td}>{item.req}</td>
                    <td style={styles.td}>{item.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={styles.subsubsectionTitle}>Step 2: 원고 작성 필수 프로세스 (AI 활용)</div>
            <div style={styles.preCode}>
1️⃣ 리뷰 가이드 작성 (필수)<br/>
   ├─ 매장의 주요 특징 정리 (서빙 품질, 음식 맛, 분위기, 청결도 등)<br/>
   ├─ 고객 관점의 핵심 메시지 작성<br/>
   └─ 방문 경험을 통해 느낀 점<br/>
<br/>
2️⃣ AI로 원고 생성<br/>
   ├─ ChatGPT, Gemini, Claude 등 AI 도구 활용<br/>
   ├─ 작성한 리뷰 가이드를 프롬프트로 입력<br/>
   └─ 생성된 원고를 필드에 복사<br/>
<br/>
3️⃣ 검수 및 최종 편집<br/>
   ├─ 자연스러운 한국어 표현 확인<br/>
   ├─ 매장 정보와 맞는지 검증<br/>
   └─ 부적절한 단어 수정
            </div>

            <div style={styles.subsubsectionTitle}>Step 3: 발행 주기 설정</div>
            <ul style={styles.ul}>
              <li style={styles.li}><strong style={styles.strong}>일일 발행 횟수</strong> - 1일에 얼마나 자주 발행할지 (기본: 1회/일)</li>
              <li style={styles.li}><strong style={styles.strong}>총 발행 횟수</strong> - 전체 며칠 동안 발행할지 (기본: 1회)</li>
            </ul>

            <div style={styles.preCode}>
발행 주기 설정 예시:
━━━━━━━━━━━━━━━━━━━━━━━━━━<br/>
 일일 발행:  [1] 회/일<br/>
 총 발행:    [1] 회<br/>
━━━━━━━━━━━━━━━━━━━━━━━━━━<br/>
→ 결과: 단 1일에 1번만 발행
            </div>
          </div>

          <div style={styles.section}>
            <h3 style={styles.subsectionTitle} id="agency-task">2. 작업 진행 현황 가이드</h3>
            <p style={{ color: '#d1d5db' }}>📋 작업 관리 메뉴에서 등록한 매장의 진행 상황을 실시간 확인합니다.</p>

            <div style={styles.subsubsectionTitle}>작업 관리 테이블 예시</div>
            <div style={styles.preCode}>
작업 관리 테이블 예시<br/>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━<br/>
 매장명        리뷰    이미지    발행 상태    등록일<br/>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━<br/>
 카페 ABC     ◯ 승인중  ◯ 승인중   대기중    2026-04-10<br/>
 버거킹       ✓ 완료    ✓ 완료    완료      2026-04-09<br/>
 피자헛       ✓ 완료    ◯ 진행중   진행중    2026-04-08<br/>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            </div>

            <div style={styles.subsubsectionTitle}>상태별 아이콘</div>
            <ul style={styles.ul}>
              <li style={styles.li}><strong style={styles.strong}>⏹️ 없음</strong> - 아직 작업 대기 중</li>
              <li style={styles.li}><strong style={styles.strong}>⏳ 승인중</strong> - 리뷰/이미지 발행 진행 중</li>
              <li style={styles.li}><strong style={styles.strong}>✅ 완료</strong> - 발행 완료됨</li>
              <li style={styles.li}><strong style={styles.strong}>❌ 실패</strong> - 발행 실패 (로그 확인 필요)</li>
            </ul>

            <div style={styles.subsubsectionTitle}>이미지 추가 업로드</div>
            <p style={{ color: '#d1d5db', marginBottom: '10px' }}>매장 등록 후 이미지를 추가로 업로드할 수 있습니다.</p>
            <div style={styles.preCode}>
작업 관리 → 해당 매장 클릭<br/>
  ↓<br/>
[📸 이미지 업로드] 버튼<br/>
  ↓<br/>
파일 선택 후 업로드 (최대 2개)<br/>
  ↓<br/>
✅ DB에 저장<br/>
  ↓<br/>
📖 리뷰 탭에서 확인<br/>
<br/>
※ 여러 번 업로드 가능: 1차(2개) → 2차(추가 2개) → 3차(추가 2개) 반복 가능
            </div>
          </div>

          <div style={styles.section}>
            <h3 style={styles.subsectionTitle} id="agency-review">3. 리뷰 가이드</h3>
            <p style={{ color: '#d1d5db' }}>📖 리뷰 메뉴에서 최종 승인된 매장의 리뷰를 확인합니다.</p>

            <div style={styles.subsubsectionTitle}>최종 승인된 매장 확인</div>
            <div style={styles.preCode}>
리뷰 분석 대시보드 예시<br/>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━<br/>
  매장명        리뷰 상태      이미지 상태    링크<br/>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━<br/>
✅ 카페 ABC     ✅ 완료        ✅ 완료      리뷰보기 ↗<br/>
✅ 버거킹       ✅ 완료        ✅ 완료      리뷰보기 ↗<br/>
✅ 스타벅스     ✅ 완료        ⏳ 진행중    -<br/>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            </div>

            <div style={styles.subsubsectionTitle}>링크 확인 프로세스</div>
            <ol style={styles.ul}>
              <li style={styles.li}>리뷰 상태가 "✅ 완료" 인지 확인</li>
              <li style={styles.li}>이미지 상태가 "✅ 완료" 인지 확인</li>
              <li style={styles.li}>리뷰 탭 → 리뷰상세확인 컬럼의 <strong style={styles.strong}>[리뷰보기 ↗]</strong> 클릭</li>
              <li style={styles.li}>Google Maps에서 발행된 리뷰 및 이미지 확인</li>
            </ol>
          </div>
        </div>

      {/* 관리자 가이드 */}
      {isAdmin && (
        <div id="admin-guide">
          <h2 style={styles.sectionTitle}>관리자(Admin) 가이드</h2>

          <div style={styles.section}>
            <h3 style={styles.subsectionTitle} id="admin-menu">접근 가능한 메뉴</h3>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>메뉴</th>
                  <th style={styles.th}>설명</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { menu: '대시보드', desc: '전체 시스템 현황 및 통계' },
                  { menu: '매장 등록', desc: '모든 사용자의 매장 관리' },
                  { menu: '작업 관리', desc: '모든 매장의 작업 상태 모니터링' },
                  { menu: '리뷰', desc: '전체 리뷰 현황 분석' },
                  { menu: '배포', desc: '수동 배포 트리거 및 스케줄 관리' },
                  { menu: '계정 관리', desc: '팀 사용자 및 권한 관리' },
                  { menu: 'Google 계정', desc: 'Google 계정 및 API 키 관리' },
                ].map((item, idx) => (
                  <tr key={idx} style={idx % 2 === 0 ? styles.trEven : {}}>
                    <td style={styles.td}><strong style={styles.strong}>{item.menu}</strong></td>
                    <td style={styles.td}>{item.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={styles.section}>
            <h3 style={styles.subsectionTitle} id="admin-dashboard">1. 관리자 대시보드</h3>
            <p style={{ color: '#d1d5db', marginBottom: '15px' }}>📊 대시보드 메뉴에서 시스템 전체 현황을 한눈에 파악합니다.</p>

            <div style={styles.preCode}>
📊 시스템 관리 대시보드<br/>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━<br/>
 📈 전체 통계<br/>
 ├─ 등록된 매장: 148개<br/>
 ├─ 활성 작업: 45개<br/>
 ├─ 완료된 매장: 103개<br/>
 └─ 실패 작업: 2개<br/>
<br/>
 🔄 전체 진행 상황<br/>
 ├─ 리뷰 완료율: 85% ████████░<br/>
 ├─ 이미지 완료율: 72% ███████░<br/>
 └─ 평균 소요 시간: 3.2일<br/>
<br/>
 👥 사용자별 현황<br/>
 ├─ teamA: 45개 매장 (40개 완료)<br/>
 ├─ teamB: 38개 매장 (35개 완료)<br/>
 └─ teamC: 65개 매장 (28개 완료)<br/>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            </div>
          </div>

          <div style={styles.section}>
            <h3 style={styles.subsectionTitle} id="admin-store">2. 매장 관리</h3>
            <p style={{ color: '#d1d5db' }}>🏪 매장 등록 메뉴에서 모든 사용자의 매장을 관리합니다.</p>
            <ul style={styles.ul}>
              <li style={styles.li}>새 매장 등록 (모든 사용자 대신 가능)</li>
              <li style={styles.li}>기존 매장 수정/삭제</li>
              <li style={styles.li}>사용자별 매장 필터링</li>
              <li style={styles.li}>일괄 작업 (대량 등록, 대량 삭제)</li>
            </ul>
          </div>

          <div style={styles.section}>
            <h3 style={styles.subsectionTitle} id="admin-monitoring">3. 모니터링 및 분석</h3>
            <p style={{ color: '#d1d5db', marginBottom: '15px' }}>📋 작업 관리 메뉴에서 모든 팀의 작업 상태를 모니터링할 수 있습니다.</p>
            <ul style={styles.ul}>
              <li style={styles.li}><strong style={styles.strong}>소속</strong> - 어느 팀에 속하는 매장인지 표시</li>
              <li style={styles.li}><strong style={styles.strong}>링크 입력</strong> - Google Maps 링크 수동 입력 (📝)</li>
              <li style={styles.li}><strong style={styles.strong}>링크 추출</strong> - Google Maps에서 자동 추출 (🔗)</li>
              <li style={styles.li}><strong style={styles.strong}>상세 로그</strong> - 작업 실행 로그 상세 확인 (👀)</li>
            </ul>
          </div>

          <div style={styles.section}>
            <h3 style={styles.subsectionTitle} id="admin-deploy">4. 배포 및 자동화</h3>
            <p style={{ color: '#d1d5db', marginBottom: '15px' }}>🚀 배포 메뉴에서 자동 배포 스케줄을 관리합니다.</p>

            <div style={styles.preCode}>
배포 설정 예시:<br/>
배포 시간: 09:00, 12:00, 15:00, 18:00 (매일 4회)<br/>
배포 상태: 🟢 활성<br/>
마지막 배포: 2026-04-10 18:00 (✅ 성공)<br/>
다음 배포: 2026-04-11 09:00
            </div>

            <ul style={styles.ul}>
              <li style={styles.li}><strong style={styles.strong}>📅 스케줄 관리</strong> - 배포 시간 설정, 간격 조정</li>
              <li style={styles.li}><strong style={styles.strong}>⏱️ 수동 배포</strong> - 즉시 배포, 예약 배포</li>
              <li style={styles.li}><strong style={styles.strong}>📊 배포 로그</strong> - 성공/실패 기록 확인</li>
            </ul>
          </div>

          <div style={styles.section}>
            <h3 style={styles.subsectionTitle} id="admin-user">5. 사용자 및 계정 관리</h3>

            <div style={styles.subsubsectionTitle}>👥 계정 관리</div>
            <ul style={styles.ul}>
              <li style={styles.li}>사용자 추가 (로그인 ID, 비밀번호, 역할, 팀)</li>
              <li style={styles.li}>사용자 수정 (비밀번호 재설정, 역할 변경)</li>
              <li style={styles.li}>사용자 삭제 (데이터 보관 옵션)</li>
            </ul>

            <div style={styles.subsubsectionTitle}>🔐 Google 계정</div>
            <ul style={styles.ul}>
              <li style={styles.li}>계정 추가 (이메일, 비밀번호, 2FA, API 키)</li>
              <li style={styles.li}>계정 상태 모니터링 (로그인 성공/실패, 마지막 사용 시간)</li>
              <li style={styles.li}>계정 삭제 (백업 생성 옵션)</li>
            </ul>
          </div>

          <div style={styles.section}>
            <h3 style={styles.subsectionTitle} id="admin-setting">6. 시스템 설정</h3>
            <ul style={styles.ul}>
              <li style={styles.li}><strong style={styles.strong}>보안 설정</strong> - 비밀번호 정책, 세션 타임아웃, IP 화이트리스트</li>
              <li style={styles.li}><strong style={styles.strong}>기능 토글</strong> - Agency 계정 생성 허용/금지, 자동 배포 활성화</li>
              <li style={styles.li}><strong style={styles.strong}>알림 설정</strong> - 작업 완료/실패 알림, 일일 리포트</li>
            </ul>
          </div>

          <div style={styles.section}>
            <h3 style={styles.subsectionTitle} id="admin-trouble">7. 트러블슈팅</h3>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>문제</th>
                  <th style={styles.th}>원인</th>
                  <th style={styles.th}>해결 방법</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { p: '배포 실패', c: 'Google 계정 로그인 오류', s: 'Google 계정 관리 → 계정 재설정' },
                  { p: '리뷰 링크 없음', c: '자동 추출 실패', s: '리뷰 탭 → [링크 추출] 버튼 재시도' },
                  { p: '사용자 접근 불가', c: '권한 설정 오류', s: '계정 관리 → 사용자 역할 재설정' },
                  { p: '대량 작업 느림', c: '배포 스케줄 과부하', s: '배포 → 스케줄 간격 조정' },
                ].map((item, idx) => (
                  <tr key={idx} style={idx % 2 === 0 ? styles.trEven : {}}>
                    <td style={styles.td}>{item.p}</td>
                    <td style={styles.td}>{item.c}</td>
                    <td style={styles.td}>{item.s}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={styles.section}>
            <h3 style={styles.subsectionTitle}>관리자 책임사항</h3>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>항목</th>
                  <th style={styles.th}>빈도</th>
                  <th style={styles.th}>설명</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { i: '일일 모니터링', f: '매일', d: '작업 실패 여부 확인, 필요시 재실행' },
                  { i: '주간 리포트', f: '매주', d: '전체 진행 상황 분석, 팀별 성과 리뷰' },
                  { i: '월간 유지보수', f: '매월', d: '시스템 업데이트, 백업, 최적화' },
                  { i: '긴급 대응', f: '수시', d: '배포 실패, 데이터 손상 등 긴급 상황 처리' },
                ].map((item, idx) => (
                  <tr key={idx} style={idx % 2 === 0 ? styles.trEven : {}}>
                    <td style={styles.td}>{item.i}</td>
                    <td style={styles.td}>{item.f}</td>
                    <td style={styles.td}>{item.d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ ...styles.note, marginTop: '40px' }}>
        <strong style={styles.strong}>✅ 질문 및 지원</strong>
        <p style={{ marginTop: '10px', color: '#cbd5e1' }}>시스템 사용 중 문제가 발생하면:</p>
        <ul style={{...styles.ul, marginTop: '10px'}}>
          <li style={styles.li}>이 매뉴얼에서 해당 섹션 참고</li>
          <li style={styles.li}><strong style={styles.strong}>로그 보기:</strong> 작업 탭 또는 리뷰 탭에서 [로그 보기] 클릭</li>
          <li style={styles.li}><strong style={styles.strong}>관리자 문의:</strong> devadmin 계정으로 시스템 관리자에게 문의</li>
        </ul>
      </div>
    </div>
  );
};

export default Manual;
