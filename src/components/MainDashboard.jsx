import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { taskApi, storeApi, scheduleApi } from '../utils/api';
import { subscribeToTable } from '../utils/realtimeApi';
import { PageLayout, PageCard, Alert, Loading } from './common';
import KPICard from './widgets/KPICard';
import ChartWidget from './widgets/ChartWidget';
import StatCard from './widgets/StatCard';
import { FiActivity, FiCheckCircle, FiCalendar, FiTarget, FiTrendingUp, FiUsers } from 'react-icons/fi';
import { spacing, colors } from '../styles/theme';

/**
 * 메인 대시보드
 * 실시간 KPI, 차트, 분석을 표시
 */
const MainDashboard = () => {
  const { token, isAdmin } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [stores, setStores] = useState([]);
  const [schedules, setSchedules] = useState([]);
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
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. 작업 데이터
      const tasksResponse = await taskApi.getAll(token);
      const tasksData = tasksResponse || [];
      setTasks(tasksData);

      // 2. 매장 데이터
      const storesResponse = await storeApi.getAll(token);
      const storesData = storesResponse || [];
      setStores(storesData);

      // 3. 스케줄 데이터
      const schedulesResponse = await scheduleApi.getAll(token);
      const schedulesData = schedulesResponse || [];
      setSchedules(schedulesData);

      setError('');
    } catch (err) {
      setError('데이터 로드 실패');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // 통계 계산
  const calculateStats = useCallback((tasksData, storesData, schedulesData) => {
    const completed = tasksData.filter((t) => t.status === 'completed').length;
    const successRate = tasksData.length > 0 ? Math.round((completed / tasksData.length) * 100) : 0;
    const active = schedulesData.filter((s) => s.status === 'active').length;

    setStats({
      totalTasks: tasksData.length,
      completedTasks: completed,
      totalStores: storesData.length,
      activeSchedules: active,
      reviewsCompleted: completed,
      successRate,
    });

    generateChartData(tasksData, storesData, schedulesData);
  }, []);

  // 초기 로드 및 실시간 구독
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData, token]);

  // 상태 데이터가 변경되면 통계 계산
  useEffect(() => {
    calculateStats(tasks, stores, schedules);
  }, [tasks, stores, schedules, calculateStats]);

  // 실시간 구독
  useEffect(() => {
    const unsubscribers = [];

    // Tasks 테이블 구독
    unsubscribers.push(
      subscribeToTable('tasks', {
        onInsert: (newTask) => {
          console.log('📍 New task:', newTask);
          setTasks(prev => [...prev, newTask]);
        },
        onUpdate: (updatedTask) => {
          console.log('✏️ Task updated:', updatedTask);
          setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
        },
        onDelete: (deletedTask) => {
          console.log('🗑️ Task deleted:', deletedTask);
          setTasks(prev => prev.filter(t => t.id !== deletedTask.id));
        },
      })
    );

    // Stores 테이블 구독
    unsubscribers.push(
      subscribeToTable('stores', {
        onInsert: (newStore) => {
          console.log('📍 New store:', newStore);
          setStores(prev => [...prev, newStore]);
        },
        onUpdate: (updatedStore) => {
          console.log('✏️ Store updated:', updatedStore);
          setStores(prev => prev.map(s => s.id === updatedStore.id ? updatedStore : s));
        },
        onDelete: (deletedStore) => {
          console.log('🗑️ Store deleted:', deletedStore);
          setStores(prev => prev.filter(s => s.id !== deletedStore.id));
        },
      })
    );

    // Schedules 테이블 구독
    unsubscribers.push(
      subscribeToTable('schedules', {
        onInsert: (newSchedule) => {
          console.log('📍 New schedule:', newSchedule);
          setSchedules(prev => [...prev, newSchedule]);
        },
        onUpdate: (updatedSchedule) => {
          console.log('✏️ Schedule updated:', updatedSchedule);
          setSchedules(prev => prev.map(s => s.id === updatedSchedule.id ? updatedSchedule : s));
        },
        onDelete: (deletedSchedule) => {
          console.log('🗑️ Schedule deleted:', deletedSchedule);
          setSchedules(prev => prev.filter(s => s.id !== deletedSchedule.id));
        },
      })
    );

    // Cleanup: 언마운트될 때 모든 구독 해제
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, []);

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
    <PageLayout
      title="🎯 대시보드"
      description="실시간 리뷰 배포 현황 및 상세 분석"
    >
      {error && (
        <Alert
          type="error"
          message={error}
          onClose={() => setError('')}
        />
      )}

      {loading ? (
        <Loading message="데이터 로드 중..." />
      ) : (
        <>
          {/* KPI 카드 섹션 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: spacing.md,
              marginBottom: spacing.xl,
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
              gap: spacing.md,
              marginBottom: spacing.xl,
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
              gap: spacing.lg,
              marginBottom: spacing.xl,
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

          {/* 빠른 통계 */}
          <PageCard
            title="📊 빠른 통계"
            subtitle="주요 지표"
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: spacing.md }}>
              <div>
                <p style={{ margin: `0 0 ${spacing.md} 0`, fontSize: '12px', color: colors.text.muted }}>
                  완료율
                </p>
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
                <p
                  style={{
                    margin: `${spacing.md} 0 0 0`,
                    fontSize: '13px',
                    color: '#22c55e',
                    fontWeight: '600',
                  }}
                >
                  {stats.successRate}%
                </p>
              </div>
            </div>
          </PageCard>
        </>
      )}
    </PageLayout>
  );
};

export default MainDashboard;
