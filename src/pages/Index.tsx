import React, { useRef, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Download, Plus, List, MapPin, Palette, Upload, RefreshCw, Trash2, ChevronDown, User, LogOut, LogIn, Cloud, CloudOff } from 'lucide-react';
import { WorldMap } from '@/components/WorldMap';
import { BookInputPanel } from '@/components/BookInputPanel';
import { RecordsList } from '@/components/RecordsList';
import { ExportPanel } from '@/components/ExportPanel';
import { ExcelUploadPanel } from '@/components/ExcelUploadPanel';
import { BookDetailCard } from '@/components/BookDetailCard';
import { WelcomeModal } from '@/components/WelcomeModal';
import { AuthDialog } from '@/components/AuthDialog';
import { useReadingRecords } from '@/hooks/useReadingRecords';
import { useAuth } from '@/hooks/useAuth';
import { useThemeStyle, type ThemeStyle } from '@/hooks/useThemeStyle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
  
  // 开屏弹窗状态 - 首次加载时显示
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(() => {
    // 检查是否已经访问过（使用localStorage）
    const hasVisited = localStorage.getItem('readtrip_has_visited');
    return !hasVisited;
  });
  
  const { theme, setThemeStyle } = useThemeStyle();

  const {
    records,
    isLoading,
    isSyncing,
    addRecord,
    addRecords,
    deleteRecord,
    updateRecord,
    clearAllRecords,
    getVisitedCountries,
    getStats,
  } = useReadingRecords();
  
  const [isUpdatingCovers, setIsUpdatingCovers] = useState(false);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);

  const { user, signOut } = useAuth();

  const visitedCountries = useMemo(() => getVisitedCountries(), [records, getVisitedCountries]);
  const stats = useMemo(() => getStats(), [records, getStats]);

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error('登出失败');
    } else {
      toast.success('已登出');
    }
  };

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

  const handleCloseWelcome = () => {
    setIsWelcomeOpen(false);
    // 标记已访问
    localStorage.setItem('readtrip_has_visited', 'true');
  };

  const handleLogoClick = () => {
    setIsWelcomeOpen(true);
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
      <header className="absolute top-0 left-0 right-0 z-30 py-[var(--page-inset)] px-[var(--page-inset)]">
        <div className="flex items-center justify-between w-full">
          {/* Logo - 可点击 */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={handleLogoClick}
          >
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-soft">
              <svg 
                className="w-5 h-5 text-primary-foreground scale-[1.8]" 
                viewBox="0 0 800 800" 
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g transform="translate(62.948288,766.966564) scale(0.089996,-0.089996)" fill="currentColor" stroke="none">
                  <path d="M5555 6064 c-576 -39 -1007 -170 -1372 -416 -90 -60 -268 -211 -277 -234 -6 -15 -16 -8 -64 37 -221 214 -471 364 -770 462 -223 74 -512 130 -739 144 -97 6 -103 5 -146 -20 -25 -15 -56 -44 -69 -64 l-23 -38 0 -1165 0 -1165 23 -37 c40 -65 74 -78 241 -93 243 -22 447 -68 627 -140 73 -30 167 -76 119 -59 -247 87 -692 145 -982 129 l-123 -7 0 1231 c0 1356 4 1281 -62 1321 -44 27 -97 26 -139 -3 -43 -29 -59 -60 -59 -118 l0 -46 -79 -7 c-125 -10 -192 -42 -229 -109 -16 -30 -17 -121 -20 -1430 -2 -961 1 -1411 8 -1438 15 -53 63 -106 111 -121 43 -12 31 -14 289 40 210 45 368 63 600 69 443 12 850 -56 1275 -214 127 -47 162 -50 212 -18 35 24 63 75 63 118 0 70 -148 323 -279 475 -265 308 -683 507 -1196 570 l-140 17 -3 1033 c-1 567 0 1032 2 1032 28 0 265 -35 346 -51 310 -62 620 -197 819 -359 80 -65 93 -80 68 -80 -50 0 -325 -106 -419 -161 -211 -124 -317 -299 -305 -498 9 -153 75 -279 214 -412 133 -127 273 -209 653 -384 322 -148 366 -170 475 -242 230 -152 315 -315 271 -519 -22 -99 -97 -256 -170 -354 -73 -97 -216 -243 -336 -341 -119 -97 -139 -130 -120 -200 15 -56 63 -89 127 -89 58 0 57 -1 218 141 268 235 417 437 504 682 101 286 46 531 -166 743 -141 141 -279 220 -799 462 -436 202 -614 357 -614 531 0 68 32 141 81 188 36 33 150 106 156 99 3 -2 -6 -24 -19 -48 -19 -36 -23 -58 -23 -138 0 -82 4 -103 26 -150 75 -158 250 -271 557 -358 116 -33 388 -92 543 -117 35 -5 36 -7 42 -55 13 -110 140 -318 287 -472 98 -102 117 -104 197 -20 31 31 92 105 136 164 92 123 70 120 209 26 447 -305 535 -781 266 -1441 -22 -54 -40 -113 -40 -131 0 -109 125 -167 206 -95 51 44 148 295 200 519 69 293 59 572 -28 804 -14 38 -26 69 -26 70 0 0 24 1 54 1 47 0 59 4 86 30 17 16 35 45 41 65 6 23 9 420 7 1181 l-3 1145 -25 37 c-14 21 -43 50 -64 65 -39 27 -41 27 -210 28 -94 1 -193 -1 -221 -2z m264 -1336 l0 -1083 -22 29 c-112 149 -236 262 -403 368 l-111 70 -7 61 c-12 121 -94 245 -197 301 -101 55 -198 68 -304 41 -70 -19 -116 -44 -170 -96 l-41 -39 -186 35 c-344 64 -583 134 -687 199 -115 73 -146 130 -110 203 27 55 62 84 201 162 100 57 131 82 268 216 207 203 313 279 520 379 255 122 544 194 930 230 19 1 99 4 178 4 l142 2 -1 -1082z m-4079 -318 c0 -919 2 -1126 14 -1153 15 -38 76 -95 109 -102 12 -2 164 -6 337 -8 331 -5 451 -17 665 -67 93 -22 279 -80 273 -85 -2 -2 -25 1 -52 6 -84 15 -325 38 -481 45 -267 12 -651 -27 -909 -92 l-26 -6 0 1285 0 1286 28 4 c15 2 30 5 35 6 4 0 7 -503 7 -1119z m3218 -160 c59 -36 79 -126 42 -188 -78 -127 -260 -71 -260 80 0 50 32 101 74 118 39 16 110 11 144 -10z"/>
                </g>
              </svg>
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
                已阅读 <span className="font-medium text-foreground text-[1.05rem]">{stats.totalBooks}</span> 本书
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">
                已点亮 <span className="font-medium text-foreground text-[1.05rem]">{stats.totalCountries}</span> 个国家
              </span>
            </div>
          </motion.div>

          {/* 操作按钮 - 用户账户和我的足迹 */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2"
          >
            {/* 用户账户按钮 */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="btn-ghost hidden sm:flex items-center gap-2"
                    aria-label="用户账户"
                  >
                    {isSyncing ? (
                      <Cloud className="w-4 h-4 animate-pulse" />
                    ) : (
                      <Cloud className="w-4 h-4" />
                    )}
                    <span className="max-w-[120px] truncate">{user.email}</span>
                    <ChevronDown className="w-4 h-4 opacity-70" aria-hidden />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[12rem]">
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span className="truncate">{user.email}</span>
                    </div>
                    {isSyncing && (
                      <div className="flex items-center gap-2 mt-1 text-xs">
                        <Cloud className="w-3 h-3 animate-pulse" />
                        <span>同步中...</span>
                      </div>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    登出
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <button
                  onClick={() => setIsAuthDialogOpen(true)}
                  className="btn-ghost hidden sm:flex items-center gap-2"
                  aria-label="登录"
                >
                  <CloudOff className="w-4 h-4" />
                  <span>登录</span>
                </button>
                {/* 移动端登录入口 */}
                <button
                  onClick={() => setIsAuthDialogOpen(true)}
                  className="btn-ghost flex sm:hidden w-10 h-10 rounded-lg items-center justify-center"
                  aria-label="登录"
                >
                  <CloudOff className="w-5 h-5" />
                </button>
              </>
            )}
            
            {/* 移动端已登录：账户图标 + 下拉 */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="btn-ghost flex sm:hidden w-10 h-10 rounded-lg items-center justify-center"
                    aria-label="用户账户"
                  >
                    {isSyncing ? (
                      <Cloud className="w-5 h-5 animate-pulse" />
                    ) : (
                      <User className="w-5 h-5" />
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[12rem]">
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span className="truncate">{user.email}</span>
                    </div>
                    {isSyncing && (
                      <div className="flex items-center gap-2 mt-1 text-xs">
                        <Cloud className="w-3 h-3 animate-pulse" />
                        <span>同步中...</span>
                      </div>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setIsListOpen(true)}>
                    <List className="w-4 h-4 mr-2" />
                    查看足迹列表
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    登出
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            {/* 我的足迹按钮（桌面端） */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="btn-ghost hidden sm:flex items-center gap-2"
                  aria-label="我的足迹"
                >
                  <List className="w-4 h-4" aria-hidden />
                  <span>我的足迹</span>
                  <ChevronDown className="w-4 h-4 opacity-70" aria-hidden />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[10rem]">
                <DropdownMenuItem onClick={() => setIsListOpen(true)}>
                  <List className="w-4 h-4 mr-2" />
                  查看足迹列表
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleClearAll}
                  disabled={records.length === 0}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  清除全部
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </motion.div>
        </div>
      </header>

      {/* 左下角：风格切换、更新封面、导出（仅图标，悬停显示文字），位于聚合/展开按钮上方 */}
      <div className="fixed bottom-24 left-[var(--page-inset)] z-20 flex flex-col-reverse gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setIsExportOpen(true)}
              disabled={records.length === 0}
              className="w-12 h-12 rounded-lg glass-panel border border-border/50 shadow-soft flex items-center justify-center text-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed relative"
              aria-label="导出阅读记录"
            >
              <Download className="w-5 h-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">导出</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleUpdateCovers}
              disabled={isUpdatingCovers || records.length === 0}
              className="w-12 h-12 rounded-lg glass-panel border border-border/50 shadow-soft flex items-center justify-center text-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed relative"
              aria-label={isUpdatingCovers ? '正在更新封面' : '更新封面'}
            >
              <RefreshCw className={`w-5 h-5 ${isUpdatingCovers ? 'animate-spin' : ''}`} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">{isUpdatingCovers ? '更新中...' : '更新封面'}</TooltipContent>
        </Tooltip>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              title="风格切换"
              className="w-12 h-12 rounded-lg glass-panel border border-border/50 shadow-soft flex items-center justify-center text-foreground hover:opacity-90 transition-opacity relative"
              aria-label="切换系统风格"
            >
              <Palette className="w-5 h-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="right" className="min-w-[10rem]">
            <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setThemeStyle(v as ThemeStyle)}>
              <DropdownMenuRadioItem value="warm">温暖</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark-gold">黑金</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="parchment">复古羊皮</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

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
          <div className="glass-panel rounded-2xl px-8 py-10 max-w-sm relative">
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

      {/* 底部中间 - 记录足迹（含批量导入、清除全部） */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn-primary rounded-full px-6 py-3.5 shadow-elevated"
              aria-label="记录足迹"
            >
              <Plus className="w-5 h-5" />
              <span>记录足迹</span>
              <ChevronDown className="w-4 h-4 ml-1 opacity-80" />
            </motion.button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" side="top" className="min-w-[10rem]">
            <DropdownMenuItem onClick={() => setIsInputOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              记录足迹
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsExcelUploadOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              批量导入
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 移动端统计信息 */}
      {records.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="fixed bottom-[var(--page-inset)] left-[var(--page-inset)] z-20 sm:hidden"
        >
          <div className="glass-panel rounded-lg px-4 py-2 flex items-center gap-4 text-sm relative">
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

      {/* 开屏弹窗 */}
      <WelcomeModal
        isOpen={isWelcomeOpen}
        onClose={handleCloseWelcome}
      />

      {/* 用户认证弹窗 */}
      <AuthDialog
        open={isAuthDialogOpen}
        onOpenChange={setIsAuthDialogOpen}
      />
    </div>
  );
};

export default Index;
