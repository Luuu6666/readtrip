import { useState, useEffect, useCallback, useRef } from 'react';
import { ReadingRecord, CountryData } from '@/types/reading';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

const STORAGE_KEY = 'readtrip_records';
const SYNC_KEY = 'readtrip_synced';

/** 阅读记录表名：本地默认 reading_records，线上可设 VITE_READING_TABLE=reading_records_online 区分 */
const READING_TABLE: 'reading_records' | 'reading_records_online' =
  (import.meta.env.VITE_READING_TABLE as 'reading_records' | 'reading_records_online') || 'reading_records';

// 将ReadingRecord转换为数据库格式
function recordToDb(record: ReadingRecord, userId: string) {
  return {
    id: record.id,
    user_id: userId,
    book_title: record.book.title,
    book_author: record.book.author,
    book_cover_url: record.book.coverUrl || null,
    book_genre: record.book.genre || null,
    book_country: record.book.country,
    book_country_code: record.book.countryCode,
    start_date: record.startDate || null,
    end_date: record.endDate || null,
    review: record.review || null,
    created_at: record.createdAt,
  };
}

// 将数据库格式转换为ReadingRecord
function dbToRecord(row: any): ReadingRecord {
  return {
    id: row.id,
    book: {
      id: row.id,
      title: row.book_title,
      author: row.book_author,
      coverUrl: row.book_cover_url || undefined,
      genre: row.book_genre || undefined,
      country: row.book_country,
      countryCode: row.book_country_code,
    },
    startDate: row.start_date || undefined,
    endDate: row.end_date || undefined,
    review: row.review || undefined,
    createdAt: row.created_at,
  };
}

export function useReadingRecords() {
  const { user } = useAuth();
  const [records, setRecords] = useState<ReadingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncInProgressRef = useRef(false);

  // 从localStorage加载数据
  const loadFromLocalStorage = useCallback((): ReadingRecord[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
    }
    return [];
  }, []);

  // 保存到localStorage
  const saveToLocalStorage = useCallback((newRecords: ReadingRecord[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newRecords));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }, []);

  // 从Supabase加载数据
  const loadFromSupabase = useCallback(async (): Promise<ReadingRecord[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from(READING_TABLE)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to load from Supabase:', error);
        const msg = error.message?.includes('does not exist') || error.code === '42P01'
          ? '加载云端数据失败：未检测到阅读记录表，请在当前 Supabase 项目的 SQL Editor 中执行建表脚本（见项目根目录 www.readtrip.club-云端保存失败排查.md）'
          : '加载云端数据失败';
        toast.error(msg);
        return [];
      }

      return (data || []).map(dbToRecord);
    } catch (error) {
      console.error('Failed to load from Supabase:', error);
      return [];
    }
  }, [user]);

  // 将localStorage数据同步到云端
  const syncLocalToCloud = useCallback(async () => {
    if (!user || syncInProgressRef.current) return;

    const hasSynced = localStorage.getItem(SYNC_KEY);
    if (hasSynced === 'true') {
      // 已经同步过，不需要再次同步
      return;
    }

    syncInProgressRef.current = true;
    setIsSyncing(true);

    try {
      const localRecords = loadFromLocalStorage();
      if (localRecords.length === 0) {
        localStorage.setItem(SYNC_KEY, 'true');
        syncInProgressRef.current = false;
        setIsSyncing(false);
        return;
      }

      // 检查云端是否已有数据
      const cloudRecords = await loadFromSupabase();
      if (cloudRecords.length > 0) {
        // 云端已有数据，不覆盖，标记为已同步
        localStorage.setItem(SYNC_KEY, 'true');
        syncInProgressRef.current = false;
        setIsSyncing(false);
        return;
      }

      // 将本地数据上传到云端
      const recordsToInsert = localRecords.map(record => recordToDb(record, user.id));
      
      const { error } = await supabase
        .from(READING_TABLE)
        .insert(recordsToInsert);

      if (error) {
        console.error('Failed to sync to cloud:', error);
        toast.error('同步数据到云端失败');
      } else {
        localStorage.setItem(SYNC_KEY, 'true');
        toast.success(`成功同步 ${localRecords.length} 条记录到云端`);
      }
    } catch (error) {
      console.error('Failed to sync to cloud:', error);
      toast.error('同步数据时发生错误');
    } finally {
      syncInProgressRef.current = false;
      setIsSyncing(false);
    }
  }, [user, loadFromLocalStorage, loadFromSupabase]);

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        if (user) {
          // 用户已登录，从云端加载
          const cloudRecords = await loadFromSupabase();
          setRecords(cloudRecords);
          // 同时保存到localStorage作为备份
          saveToLocalStorage(cloudRecords);
          // 尝试同步本地数据到云端（如果还未同步）
          await syncLocalToCloud();
        } else {
          // 用户未登录，从localStorage加载
          const localRecords = loadFromLocalStorage();
          setRecords(localRecords);
        }
      } catch (error) {
        console.error('Failed to load records:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user, loadFromSupabase, loadFromLocalStorage, saveToLocalStorage, syncLocalToCloud]);

  // 多设备实时同步：订阅 reading_records 表变更
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('reading_records_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reading_records',
          filter: `user_id=eq.${user.id}`,
        },
        async () => {
          const cloudRecords = await loadFromSupabase();
          setRecords(cloudRecords);
          saveToLocalStorage(cloudRecords);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadFromSupabase, saveToLocalStorage]);

  // 添加记录
  const addRecord = useCallback(async (record: Omit<ReadingRecord, 'id' | 'createdAt'>) => {
    const newRecord: ReadingRecord = {
      ...record,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };

    // 更新本地状态
    setRecords(prevRecords => {
      const updated = [...prevRecords, newRecord];
      saveToLocalStorage(updated);
      return updated;
    });

    // 如果用户已登录，同步到云端
    if (user) {
      try {
        const { error } = await supabase
          .from(READING_TABLE)
          .insert([recordToDb(newRecord, user.id)]);

        if (error) {
          console.error('Failed to save to cloud:', error);
          const hint = error.message?.includes('does not exist') || error.code === '42P01'
            ? '（当前 Supabase 项目可能未建表，请执行建表脚本）'
            : '';
          toast.error(`保存到云端失败，已保存到本地${hint}`);
        }
      } catch (error) {
        console.error('Failed to save to cloud:', error);
      }
    }

    return newRecord;
  }, [user, saveToLocalStorage]);

  // 批量添加记录
  const addRecords = useCallback(async (newRecords: Array<Omit<ReadingRecord, 'id' | 'createdAt'>>) => {
    const recordsWithIds: ReadingRecord[] = newRecords.map(record => ({
      ...record,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }));

    // 更新本地状态
    setRecords(prevRecords => {
      const updated = [...prevRecords, ...recordsWithIds];
      saveToLocalStorage(updated);
      return updated;
    });

    // 如果用户已登录，同步到云端
    if (user) {
      try {
        const recordsToInsert = recordsWithIds.map(record => recordToDb(record, user.id));
        const { error } = await supabase
          .from(READING_TABLE)
          .insert(recordsToInsert);

        if (error) {
          console.error('Failed to save to cloud:', error);
          const hint = error.message?.includes('does not exist') || error.code === '42P01'
            ? '（当前 Supabase 项目可能未建表，请执行建表脚本）'
            : '';
          toast.error(`保存到云端失败，已保存到本地${hint}`);
        } else {
          toast.success(`成功添加 ${recordsWithIds.length} 条记录`);
        }
      } catch (error) {
        console.error('Failed to save to cloud:', error);
      }
    }

    return recordsWithIds;
  }, [user, saveToLocalStorage]);

  // 删除记录
  const deleteRecord = useCallback(async (id: string) => {
    // 更新本地状态
    setRecords(prevRecords => {
      const updated = prevRecords.filter(r => r.id !== id);
      saveToLocalStorage(updated);
      return updated;
    });

    // 如果用户已登录，从云端删除
    if (user) {
      try {
        const { error } = await supabase
          .from(READING_TABLE)
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) {
          console.error('Failed to delete from cloud:', error);
          toast.error('从云端删除失败');
        }
      } catch (error) {
        console.error('Failed to delete from cloud:', error);
      }
    }
  }, [user, saveToLocalStorage]);

  // 更新记录
  const updateRecord = useCallback(async (id: string, updates: Partial<ReadingRecord>) => {
    // 更新本地状态
    setRecords(prevRecords => {
      const updated = prevRecords.map(record =>
        record.id === id ? { ...record, ...updates } : record
      );
      saveToLocalStorage(updated);
      return updated;
    });

    // 如果用户已登录，同步到云端
    if (user) {
      try {
        const record = records.find(r => r.id === id);
        if (!record) return;

        const updatedRecord = { ...record, ...updates };
        const dbRecord = recordToDb(updatedRecord, user.id);
        // 移除id和created_at，这些字段不应该更新
        const { id: _, created_at, ...updateData } = dbRecord;

        const { error } = await supabase
          .from(READING_TABLE)
          .update(updateData)
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) {
          console.error('Failed to update in cloud:', error);
          toast.error('更新云端数据失败');
        }
      } catch (error) {
        console.error('Failed to update in cloud:', error);
      }
    }
  }, [user, records, saveToLocalStorage]);

  // 清除所有记录
  const clearAllRecords = useCallback(async () => {
    // 清除本地状态
    setRecords([]);
    saveToLocalStorage([]);

    // 如果用户已登录，从云端删除
    if (user) {
      try {
        const { error } = await supabase
          .from(READING_TABLE)
          .delete()
          .eq('user_id', user.id);

        if (error) {
          console.error('Failed to clear cloud records:', error);
          toast.error('清除云端数据失败');
        } else {
          toast.success('已清除所有记录');
        }
      } catch (error) {
        console.error('Failed to clear cloud records:', error);
      }
    }
  }, [user, saveToLocalStorage]);

  // 获取按国家分组的数据
  const getCountryData = useCallback((): CountryData[] => {
    const countryMap = new Map<string, CountryData>();

    records.forEach(record => {
      const code = record.book.countryCode.toUpperCase();
      if (!countryMap.has(code)) {
        countryMap.set(code, {
          code,
          name: record.book.country,
          nameCn: record.book.country,
          books: [],
        });
      }
      countryMap.get(code)!.books.push(record);
    });

    return Array.from(countryMap.values());
  }, [records]);

  // 获取已访问的国家代码列表
  const getVisitedCountries = useCallback((): string[] => {
    return [...new Set(records.map(r => r.book.countryCode.toUpperCase()))];
  }, [records]);

  // 获取统计数据
  const getStats = useCallback(() => {
    const countries = getVisitedCountries();
    return {
      totalBooks: records.length,
      totalCountries: countries.length,
      countries,
    };
  }, [records, getVisitedCountries]);

  return {
    records,
    isLoading,
    isSyncing,
    addRecord,
    addRecords,
    deleteRecord,
    updateRecord,
    clearAllRecords,
    getCountryData,
    getVisitedCountries,
    getStats,
  };
}
