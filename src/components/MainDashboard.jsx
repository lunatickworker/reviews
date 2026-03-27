import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { taskApi, storeApi, scheduleApi } from '../utils/api';
import KPICard from './widgets/KPICard';
import ChartWidget from './widgets/ChartWidget';
import StatCard from './widgets/StatCard';
import { FiActivity, FiCheckCircle, FiCalendar, FiTarget, FiTrendingUp, FiUsers } from 'react-icons/fi';

/**
 * 메인 대시보드
 * 실시간 KPI, 차트, 분석을 표시
 */
const MainDashboard = () => {
  const { token, isAdmin } = useAuth();
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    totalStores: 0,
    activeSchedules: 0,
    reviewsCompleted: 0,
    successRate: 0,
  });
  const [chartData, setChartData] = useState({
    daily: [],
    status: [],
    store: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 데이터 로드
  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // 30초마다 새로고침
    return () => clearInterval(interval);
  }, [token]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // 1. 작업 통계
      const tasksResponse = await taskApi.getAll(token);
      const tasks = tasksResponse || [];
      const completed = tasks.filter((t) => t.status === 'completed').length;
      const successRate = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;

      // 2. 매장 통계
      const storesResponse = await storeApi.getAll(token);
      const stores = storesResponse || [];

      // 3. 스케줄 통계
      const schedulesResponse = await scheduleApi.getAll(token);
      const schedules = schedulesResponse || [];
      const active = schedules.filter((s) => s.status === 'active').length;

      setStats({
        totalTasks: tasks.length,
        completedTasks: completed,
        totalStores: stores.length,
        activeSchedules: active,
        reviewsCompleted: completed,
        successRate,
      });

      // 그래프 데이터 생성
      generateChartData(tasks, stores, schedules);
      setError('');
    } catch (err) {
      setError('데이터 로드 실패');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const generateChartData = (tasks, stores, schedules) => {
    // 일일 작업량
    const dailyData = {};
    tasks.forEach((task) => {
      const date = new Date(task.created_at).toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric',
      });
      dailyData[date] = (dailyData[date] || 0) + 1;
    });
    const dailyChart = Object.entries(dailyData).map(([name, count]) => ({ name, count }));

    // 작업 상태 분포
    const statusMap = {
      completed: 0,
      in_progress: 0,
      pending: 0,
      failed: 0,
    };
    tasks.forEach((task) => {
      statusMap[task.status] = (statusMap[task.status] || 0) + 1;
    });
    const statusChart = [
      { name: '완료', value: statusMap.completed },
      { name: '진행중', value: statusMap.in_progress },
      { name: '대기', value: statusMap.pending },
      { name: '실패', value: statusMap.failed },
    ].filter((s) => s.value > 0);

    // 매장별 작업량
    const storeMap = {};
    tasks.forEach((task) => {
      const storeName = task.place_name || '미지정';
      storeMap[storeName] = (storeMap[storeName] || 0) + 1;
    });
    const storeChart = Object.entries(storeMap)
      .map(([name, count]) => ({ name: name.substring(0, 15), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    setChartData({
      daily: dailyChart,
      status: statusChart,
      store: storeChart,
    });
  };

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(17,24,39,0.8) 0%, rgba(31,41,55,0.8) 100%)',
        minHeight: '100vh',
        padding: '24px',
        color: '#fff',
      }}
    >
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* 헤더 */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '32px', fontWeight: '700' }}>
            🎯 대시보드
          </h1>
          <p style={{ margin: 0, color: '#9ca3af', fontSize: '14px' }}>
            실시간 리뷰 배포 현황 및 상세 분석
          </p>
        </div>

        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '20px',
              color: '#fca5a5',
              fontSize: '13px',
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
            데이터 로드 중...
          </div>
        ) : (
          <>
            {/* KPI 카드 섹션 */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '16px',
                marginBottom: '32px',
              }}
            >
              <KPICard
                title="전체 작업"
                value={stats.totalTasks}
                unit="건"
                change={stats.successRate}
                trend="up"
                icon={FiActivity}
                color="purple"
              />
              <KPICard
                title="완료된 리뷰"
                value={stats.completedTasks}
                unit="건"
                change={Math.min(stats.successRate, 100)}
                trend="up"
                icon={FiCheckCircle}
                color="green"
              />
              <KPICard
                title="등록된 매장"
                value={stats.totalStores}
                unit="개"
                icon={FiTarget}
                color="blue"
              />
              <KPICard
                title="활성 스케줄"
                value={stats.activeSchedules}
                unit="개"
                icon={FiCalendar}
                color="orange"
              />
            </div>

            {/* 성공률 카드 */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                marginBottom: '32px',
              }}
            >
              <StatCard
                label="성공률"
                count={`${stats.successRate}%`}
                color="green"
                icon={FiTrendingUp}
              />
              <StatCard
                label="진행 중"
                count={stats.totalTasks - stats.completedTasks}
                color="blue"
              />
              {isAdmin && (
                <StatCard
                  label="매장 관리"
                  count={stats.totalStores}
                  color="purple"
                  icon={FiUsers}
                />
              )}
            </div>

            {/* 차트 섹션 */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                gap: '20px',
              }}
            >
              <ChartWidget
                title="일일 작업량"
                type="bar"
                data={chartData.daily}
                bars={['count']}
                height={300}
              />
              <ChartWidget
                title="작업 상태"
                type="pie"
                data={chartData.status}
                height={300}
              />
              {chartData.store.length > 0 && (
                <ChartWidget
                  title="매장별 작업량"
                  type="bar"
                  data={chartData.store}
                  bars={['count']}
                  height={300}
                />
              )}
            </div>

            {/* 실시간 활동 로그 */}
            <div
              style={{
                marginTop: '32px',
                background: 'rgba(37, 45, 66, 0.7)',
                backdropFilter: 'blur(10px)',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid rgba(124, 58, 237, 0.2)',
              }}
            >
              <h3 style={{ margin: '0 0 16px 0', color: '#fff', fontSize: '16px', fontWeight: '600' }}>
                📊 빠른 통계
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
                <div>
                  <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#9ca3af' }}>완료율</p>
                  <div
                    style={{
                      width: '100%',
                      height: '8px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '4px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${stats.successRate}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #22c55e, #16a34a)',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                  <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#22c55e', fontWeight: '600' }}>
                    {stats.successRate}%
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MainDashboard;
