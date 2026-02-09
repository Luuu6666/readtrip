import React, { useRef, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Download, Plus, List, MapPin, BookMarked, Palette } from 'lucide-react';
import { WorldMap } from '@/components/WorldMap';
import { BookInputPanel } from '@/components/BookInputPanel';
import { RecordsList } from '@/components/RecordsList';
import { ExportPanel } from '@/components/ExportPanel';
import { useReadingRecords } from '@/hooks/useReadingRecords';
import { useThemeStyle } from '@/hooks/useThemeStyle';
import { BookInfo, ReadingRecord } from '@/types/reading';

const Index = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isInputOpen, setIsInputOpen] = useState(false);
  const [isListOpen, setIsListOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | undefined>(undefined);
  
  const { theme, toggleTheme, isWarm, isDarkGold } = useThemeStyle();

  const {
    records,
    isLoading,
    addRecord,
    deleteRecord,
    getVisitedCountries,
    getStats,
  } = useReadingRecords();

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
    </div>
  );
};

export default Index;
