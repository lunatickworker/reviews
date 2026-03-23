// frontend/src/components/MapAutomation.jsx
import React, { useState } from 'react';

export default function MapAutomation() {
  const [shortUrl, setShortUrl] = useState('');
  const [placeName, setPlaceName] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    if (!shortUrl.trim()) {
      alert('단축 URL을 입력하세요.');
      return;
    }
    setLoading(true);
    setStatusMsg('자동화 진행 중...');

    try {
      const res = await fetch('http://localhost:4000/api/automate-map', {  // 실제 주소 반영
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shortUrl }),
      });
      const data = await res.json();
      if (res.ok) {
        setPlaceName(data.placeName);
        setStatusMsg(data.message);
      } else {
        setStatusMsg(`오류: ${data.error || '알 수 없는 오류'}`);
      }
    } catch (e) {
      setStatusMsg(`통신 실패: ${e.message}`);
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '600px', margin: '20px auto', fontFamily: "'AsiaHead', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <h2>구글맵 자동화 도구</h2>
      <input
        type="text"
        placeholder="단축 URL 입력 (예: https://maps.app.goo.gl/TPQUKwoHkBx5o1XB8)"
        value={shortUrl}
        onChange={e => setShortUrl(e.target.value)}
        style={{ width: '100%', padding: '8px', fontSize: '16px' }}
      />
      <button
        onClick={handleStart}
        disabled={loading}
        style={{ marginTop: '10px', padding: '10px 20px', fontSize: '16px' }}
      >
        {loading ? '자동화 중...' : '자동화 시작'}
      </button>

      {placeName && (
        <div style={{ marginTop: '20px' }}>
          <h3>장소명:</h3>
          <p>{placeName}</p>
        </div>
      )}

      {statusMsg && (
        <div style={{ marginTop: '10px', color: loading ? 'blue' : 'red' }}>
          {statusMsg}
        </div>
      )}
    </div>
  );
}