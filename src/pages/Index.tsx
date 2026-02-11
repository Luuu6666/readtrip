import React, { useRef, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Download, Plus, List, MapPin, BookMarked, Palette, Upload, RefreshCw, Trash2 } from 'lucide-react';
import { WorldMap } from '@/components/WorldMap';
import { BookInputPanel } from '@/components/BookInputPanel';
import { RecordsList } from '@/components/RecordsList';
import { ExportPanel } from '@/components/ExportPanel';
import { ExcelUploadPanel } from '@/components/ExcelUploadPanel';
import { BookDetailCard } from '@/components/BookDetailCard';
import { useReadingRecords } from '@/hooks/useReadingRecords';
import { useThemeStyle } from '@/hooks/useThemeStyle';
import { BookInfo, ReadingRecord } from '@/types/reading';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getLocalCoverUrl } from '@/lib/bookCovers';

const Index = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isInputOpen, setIsInputOpen] = useState(false);
  const [isListOpen, setIsListOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isExcelUploadOpen, setIsExcelUploadOpen] = useState(false);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | undefined>(undefined);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  
  const { theme, toggleTheme, isWarm, isDarkGold } = useThemeStyle();

  const {
    records,
    isLoading,
    addRecord,
    addRecords,
    deleteRecord,
    updateRecord,
    clearAllRecords,
    getVisitedCountries,
    getStats,
  } = useReadingRecords();
  
  const [isUpdatingCovers, setIsUpdatingCovers] = useState(false);

  const visitedCountries = useMemo(() => getVisitedCountries(), [records, getVisitedCountries]);
  const stats = useMemo(() => getStats(), [records, getStats]);

  // 按国家分组的书籍数据
  const countryBooks = useMemo(() => {
    const map = new Map<string, ReadingRecord[]>();
    records.forEach(record => {
      const code = record.book.countryCode.toUpperCase();
      if (!map.has(code)) {
        map.set(code, []);
      }
      map.get(code)!.push(record);
    });
    return map;
  }, [records]);

  const handleSaveBook = (book: BookInfo, startDate?: string, endDate?: string, review?: string) => {
    addRecord({
      book,
      startDate,
      endDate,
      review,
    });
  };

  const handleCountryClick = (countryCode: string) => {
    // 如果该国家有书籍，打开列表面板并设置选中的国家
    if (countryBooks.has(countryCode)) {
      setSelectedCountryCode(countryCode);
      setIsListOpen(true);
    }
  };

  const handleCloseList = () => {
    setIsListOpen(false);
    setSelectedCountryCode(undefined);
  };

  const handleBookClick = (bookId: string) => {
    setSelectedBookId(bookId);
  };

  const handleCloseBookDetail = () => {
    setSelectedBookId(null);
  };

  const selectedBook = useMemo(() => {
    if (!selectedBookId) return null;
    return records.find(r => r.id === selectedBookId) || null;
  }, [selectedBookId, records]);

  const handleExcelImport = (books: Array<{ book: BookInfo; startDate?: string; endDate?: string; review?: string }>) => {
    console.log('handleExcelImport 收到书籍:', books);
    console.log('书籍数量:', books.length);
    
    // 验证数据
    const validBooks = books.filter(item => {
      const isValid = item.book && item.book.title && item.book.countryCode;
      if (!isValid) {
        console.warn('无效的书籍数据:', item);
      }
      return isValid;
    });
    
    console.log('有效书籍数量:', validBooks.length);
    
    if (validBooks.length === 0) {
      toast.error('没有有效的书籍数据');
      return;
    }
    
    // 使用批量添加方法
    addRecords(validBooks);
    console.log('批量添加完成，当前记录数:', records.length + validBooks.length);
    toast.success(`成功导入 ${validBooks.length} 本书`);
  };

  // 更新所有书籍的封面
  const handleUpdateCovers = async () => {
    if (records.length === 0) {
      toast.error('没有书籍需要更新封面');
      return;
    }

    setIsUpdatingCovers(true);
    let successCount = 0;
    let failCount = 0;

    try {
      // 逐个更新封面
      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const bookTitle = record.book.title;

        try {
          // 调用AI匹配API重新获取封面
          const { data, error } = await supabase.functions.invoke('match-book', {
            body: { bookTitle },
          });

          if (error) {
            console.error(`更新 "${bookTitle}" 封面失败:`, error);
            failCount++;
            continue;
          }

          if (data && data.bookInfo) {
            // 优先使用API返回的封面URL
            let newCoverUrl = data.bookInfo.coverUrl;

            // 如果API没有返回封面，尝试从本地图片库匹配
            if (!newCoverUrl) {
              newCoverUrl = getLocalCoverUrl(bookTitle) || undefined;
            }

            // 更新记录的封面URL
            if (newCoverUrl) {
              updateRecord(record.id, {
                book: {
                  ...record.book,
                  coverUrl: newCoverUrl,
                },
              });
              successCount++;
            } else {
              // 如果仍然没有找到封面，使用默认logo
              updateRecord(record.id, {
                book: {
                  ...record.book,
                  coverUrl: '/book-covers/logo.png',
                },
              });
              successCount++;
            }
          } else {
            // 尝试从本地图片库匹配
            const localCover = getLocalCoverUrl(bookTitle);
            if (localCover) {
              updateRecord(record.id, {
                book: {
                  ...record.book,
                  coverUrl: localCover,
                },
              });
              successCount++;
            } else {
              failCount++;
            }
          }

          // 避免API限流，每10本书暂停一下
          if ((i + 1) % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (err) {
          console.error(`更新 "${bookTitle}" 封面时出错:`, err);
          failCount++;
        }
      }

      toast.success(
        `封面更新完成！成功: ${successCount} 本，失败: ${failCount} 本`
      );
    } catch (error) {
      console.error('批量更新封面时出错:', error);
      toast.error('更新封面时出错，请稍后重试');
    } finally {
      setIsUpdatingCovers(false);
    }
  };

  // 清除所有书籍
  const handleClearAll = () => {
    if (records.length === 0) {
      toast.info('没有书籍需要清除');
      return;
    }

    if (confirm(`确定要清除所有 ${records.length} 本书的阅读记录吗？此操作不可恢复！`)) {
      clearAllRecords();
      toast.success('已清除所有阅读记录');
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden paper-texture">
      {/* 头部导航 */}
      <header className="absolute top-0 left-0 right-0 z-30 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Logo */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-soft">
              <BookMarked className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-serif text-xl font-semibold text-foreground tracking-tight">
                阅迹
              </h1>
              <p className="text-xs text-muted-foreground -mt-0.5">ReadTrip</p>
            </div>
          </motion.div>

          {/* 统计信息 */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="hidden sm:flex items-center gap-6"
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <BookOpen className="w-4 h-4" />
              <span className="text-sm">
                <span className="font-medium text-foreground">{stats.totalBooks}</span> 本书
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">
                <span className="font-medium text-foreground">{stats.totalCountries}</span> 个国家
              </span>
            </div>
          </motion.div>

          {/* 操作按钮 */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2"
          >
            {/* 主题切换按钮 */}
            <button
              onClick={toggleTheme}
              className="btn-ghost hidden sm:flex"
              title={isDarkGold ? '切换到温暖风格' : '切换到黑金风格'}
            >
              <Palette className="w-4 h-4" />
              <span>{isDarkGold ? '温暖' : '黑金'}</span>
            </button>
            <button
              onClick={() => setIsExcelUploadOpen(true)}
              className="btn-ghost hidden sm:flex"
            >
              <Upload className="w-4 h-4" />
              <span>批量导入</span>
            </button>
            <button
              onClick={handleUpdateCovers}
              className="btn-ghost hidden sm:flex"
              disabled={isUpdatingCovers || records.length === 0}
              title="重新匹配所有书籍的封面"
            >
              <RefreshCw className={`w-4 h-4 ${isUpdatingCovers ? 'animate-spin' : ''}`} />
              <span>{isUpdatingCovers ? '更新中...' : '更新封面'}</span>
            </button>
            <button
              onClick={() => setIsListOpen(true)}
              className="btn-ghost hidden sm:flex"
            >
              <List className="w-4 h-4" />
              <span>我的足迹</span>
            </button>
            <button
              onClick={() => setIsExportOpen(true)}
              className="btn-secondary hidden sm:flex"
              disabled={records.length === 0}
            >
              <Download className="w-4 h-4" />
              <span>导出</span>
            </button>
            <button
              onClick={handleClearAll}
              className="btn-ghost hidden sm:flex text-destructive hover:bg-destructive/10"
              disabled={records.length === 0}
              title="清除所有阅读记录"
            >
              <Trash2 className="w-4 h-4" />
              <span>清除全部</span>
            </button>
          </motion.div>
        </div>
      </header>

      {/* 地图容器 */}
      <div 
        ref={mapRef}
        className="absolute inset-0 map-container"
      >
        {!isLoading && (
          <WorldMap
            visitedCountries={visitedCountries}
            countryBooks={countryBooks}
            onCountryClick={handleCountryClick}
            onBookClick={handleBookClick}
          />
        )}
      </div>

      {/* 空状态引导 */}
      {!isLoading && records.length === 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="fixed inset-0 flex items-center justify-center text-center z-20 pointer-events-none"
        >
          <div className="pointer-events-auto">
          <div className="glass-panel rounded-2xl px-8 py-10 max-w-sm">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <h2 className="font-serif text-2xl font-medium text-foreground mb-2">
              开始你的阅读之旅
            </h2>
            <p className="text-muted-foreground mb-6">
              记录每一本书，点亮你走过的世界
            </p>
            <button
              onClick={() => setIsInputOpen(true)}
              className="btn-primary"
            >
              <Plus className="w-5 h-5" />
              <span>记录第一本书</span>
            </button>
          </div>
          </div>
        </motion.div>
      )}

      {/* 底部中间 - 记录足迹按钮 */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30">
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsInputOpen(true)}
          className="btn-primary rounded-full px-6 py-3.5 shadow-elevated"
        >
          <Plus className="w-5 h-5" />
          <span>记录足迹</span>
        </motion.button>
      </div>

      {/* 移动端统计信息 */}
      {records.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="fixed bottom-6 left-6 z-20 sm:hidden"
        >
          <div className="glass-panel rounded-lg px-4 py-2 flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-primary" />
              <span className="font-medium">{stats.totalBooks}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="font-medium">{stats.totalCountries}</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* 书籍录入面板 */}
      <BookInputPanel
        isOpen={isInputOpen}
        onClose={() => setIsInputOpen(false)}
        onSave={handleSaveBook}
      />

      {/* 阅读记录列表 */}
      <RecordsList
        isOpen={isListOpen}
        onClose={handleCloseList}
        records={records}
        onDelete={deleteRecord}
        filterCountryCode={selectedCountryCode}
      />

      {/* 导出面板 */}
      <ExportPanel
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        mapRef={mapRef}
        stats={stats}
      />

      {/* Excel上传面板 */}
      <ExcelUploadPanel
        isOpen={isExcelUploadOpen}
        onClose={() => setIsExcelUploadOpen(false)}
        onImport={handleExcelImport}
      />

      {/* 书籍详情卡片 */}
      <BookDetailCard
        isOpen={selectedBookId !== null}
        onClose={handleCloseBookDetail}
        record={selectedBook}
        onDelete={deleteRecord}
      />
    </div>
  );
};

export default Index;
