// frontend/src/utils/realtimeApi.js
// Supabase Realtime을 사용한 실시간 데이터 구독

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase configuration missing:', {
    url: supabaseUrl ? '✅' : '❌',
    key: supabaseAnonKey ? '✅' : '❌'
  });
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * 테이블의 변경사항을 실시간으로 구독
 * @param {string} tableName - 구독할 테이블명
 * @param {function} onInsert - 데이터 삽입 시 콜백
 * @param {function} onUpdate - 데이터 업데이트 시 콜백
 * @param {function} onDelete - 데이터 삭제 시 콜백
 * @returns {function} 구독 해제 함수
 */
export const subscribeToTable = (tableName, { onInsert, onUpdate, onDelete }) => {
  const channel = supabase
    .channel(`public:${tableName}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: tableName,
      },
      (payload) => {
        console.log(`✅ [INSERT] ${tableName}:`, payload);
        if (onInsert) onInsert(payload.new);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: tableName,
      },
      (payload) => {
        console.log(`✅ [UPDATE] ${tableName}:`, payload);
        if (onUpdate) onUpdate(payload.new, payload.old);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: tableName,
      },
      (payload) => {
        console.log(`✅ [DELETE] ${tableName}:`, payload);
        if (onDelete) onDelete(payload.old);
      }
    )
    .subscribe((status) => {
      console.log(`📡 Subscription status for ${tableName}:`, status);
    });

  // 구독 해제 함수 반환
  return () => {
    supabase.removeChannel(channel);
  };
};

/**
 * 여러 테이블을 동시에 구독
 * @param {array} tables - [{ name, onInsert, onUpdate, onDelete }, ...]
 * @returns {function} 모든 구독 해제 함수
 */
export const subscribeToMultipleTables = (tables) => {
  const unsubscribers = tables.map(table => 
    subscribeToTable(table.name, {
      onInsert: table.onInsert,
      onUpdate: table.onUpdate,
      onDelete: table.onDelete,
    })
  );

  // 모든 구독을 해제하는 함수 반환
  return () => {
    unsubscribers.forEach(unsubscribe => unsubscribe());
  };
};

/**
 * 현재 사용자의 데이터만 구독 (user_id 필터)
 */
export const subscribeToUserData = (tableName, userId, { onInsert, onUpdate, onDelete }) => {
  const channel = supabase
    .channel(`user:${userId}:${tableName}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: tableName,
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        console.log(`✅ [${payload.eventType}] ${tableName} for user ${userId}:`, payload);
        if (payload.eventType === 'INSERT' && onInsert) onInsert(payload.new);
        if (payload.eventType === 'UPDATE' && onUpdate) onUpdate(payload.new, payload.old);
        if (payload.eventType === 'DELETE' && onDelete) onDelete(payload.old);
      }
    )
    .subscribe((status) => {
      console.log(`📡 User subscription status for ${tableName}:`, status);
    });

  return () => {
    supabase.removeChannel(channel);
  };
};
