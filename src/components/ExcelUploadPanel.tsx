import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, FileSpreadsheet, Loader2, Check, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { BookInfo, COUNTRY_NAMES } from '@/types/reading';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getLocalCoverUrl } from '@/lib/bookCovers';

// 根据国家名称（中文或英文）查找国家代码
function findCountryCode(countryName: string): string | null {
  if (!countryName) return null;
  
  const normalizedName = countryName.trim();
  
  // 遍历所有国家，查找匹配的中文名或英文名
  for (const [code, names] of Object.entries(COUNTRY_NAMES)) {
    if (names.cn === normalizedName || names.en === normalizedName) {
      return code;
    }
  }
  
  // 如果找不到，尝试直接使用（可能是国家代码）
  if (normalizedName.length === 2) {
    return normalizedName.toUpperCase();
  }
  
  return null;
}

interface ExcelUploadPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (books: Array<{ book: BookInfo; startDate?: string; endDate?: string; review?: string }>) => void;
}

interface ExcelRow {
  书名?: string;
  作者?: string;
  作者国籍?: string; // 用户Excel中的字段
  类型?: string;
  国家?: string;
  国家代码?: string;
  开始日期?: string;
  结束日期?: string;
  读完日期?: string; // 用户Excel中的字段
  短评?: string;
  一句话总结?: string; // 用户Excel中的字段
  封面?: string;
  // 英文列名支持
  title?: string;
  author?: string;
  genre?: string;
  country?: string;
  countryCode?: string;
  startDate?: string;
  endDate?: string;
  review?: string;
  coverUrl?: string;
  // 其他字段
  译者?: string;
  出版社?: string;
  出品方?: string;
  豆瓣评分?: string;
  个人评分?: string;
  读书人?: string;
}

export const ExcelUploadPanel: React.FC<ExcelUploadPanelProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewData, setPreviewData] = useState<ExcelRow[]>([]);
  const [importedCount, setImportedCount] = useState(0);
  const [totalBooks, setTotalBooks] = useState(0);
  const [currentBookIndex, setCurrentBookIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('请上传Excel文件（.xlsx 或 .xls格式）');
      return;
    }

    setIsProcessing(true);
    setPreviewData([]);
    setImportedCount(0);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      // 读取第一个工作表
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // 转换为JSON
      const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(worksheet);
      
      if (jsonData.length === 0) {
        toast.error('Excel文件中没有数据');
        setIsProcessing(false);
        return;
      }

      const totalRecords = jsonData.length;
      setTotalBooks(totalRecords);
      setPreviewData(jsonData.slice(0, 10)); // 预览前10条
      toast.success(`成功读取 ${totalRecords} 条记录`);
    } catch (error) {
      console.error('Excel解析错误:', error);
      toast.error('Excel文件解析失败，请检查文件格式');
    } finally {
      setIsProcessing(false);
    }
  };

  const normalizeValue = (value: any): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number') return String(value);
    return String(value).trim();
  };

  const parseDate = (dateStr: string): string | undefined => {
    if (!dateStr) return undefined;
    
    // 尝试解析Excel日期格式
    try {
      // Excel日期可能是数字（从1900-01-01开始的天数）
      if (typeof dateStr === 'number') {
        const excelEpoch = new Date(1899, 11, 30);
        const date = new Date(excelEpoch.getTime() + dateStr * 24 * 60 * 60 * 1000);
        return date.toISOString().split('T')[0];
      }
      
      // 尝试解析常见日期格式
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
      
      // 尝试解析中文日期格式 YYYY-MM-DD 或 YYYY/MM/DD
      const match = dateStr.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
      if (match) {
        const [, year, month, day] = match;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    } catch (e) {
      console.warn('日期解析失败:', dateStr);
    }
    
    return undefined;
  };

  const handleImport = async () => {
    if (previewData.length === 0) {
      toast.error('请先选择Excel文件');
      return;
    }

    setIsProcessing(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      // 重新读取完整数据
      const file = fileInputRef.current?.files?.[0];
      if (!file) {
        toast.error('文件不存在');
        return;
      }

      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(worksheet);

      const booksToImport: Array<{ book: BookInfo; startDate?: string; endDate?: string; review?: string }> = [];

      // 批量处理，每10本使用AI匹配一次
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        
        // 获取书名（支持中英文列名）
        const title = normalizeValue(row.书名 || row.title);
        if (!title) {
          errorCount++;
          continue;
        }

        // 更新进度
        setCurrentBookIndex(i + 1);
        
        // 获取作者（支持中英文列名）
        const author = normalizeValue(row.作者 || row.author);
        
        // 获取国家信息 - 优先使用"作者国籍"字段
        let country = normalizeValue(row.作者国籍 || row.国家 || row.country);
        let countryCode = normalizeValue(row.国家代码 || row.countryCode);
        
        // 如果只有国家名称，尝试查找国家代码
        if (country && !countryCode) {
          const foundCode = findCountryCode(country);
          if (foundCode) {
            countryCode = foundCode;
          }
        }
        
        // 获取其他字段
        const genre = normalizeValue(row.类型 || row.genre);
        const startDate = parseDate(row.开始日期 || row.startDate || '');
        // 支持"读完日期"作为结束日期
        const endDate = parseDate(row.读完日期 || row.结束日期 || row.endDate || '');
        // 支持"一句话总结"作为短评
        const review = normalizeValue(row.一句话总结 || row.短评 || row.review);
        const coverUrl = normalizeValue(row.封面 || row.coverUrl);

        // 处理逻辑：优先使用Excel中的信息
        let finalCountry = country;
        let finalCountryCode = countryCode;
        
        // 如果只有国家名称，尝试查找国家代码
        if (finalCountry && !finalCountryCode) {
          const foundCode = findCountryCode(finalCountry);
          if (foundCode) {
            finalCountryCode = foundCode;
          }
        }
        
        // 如果已有书名和国家信息（包括通过查找得到的代码），直接使用
        if (title && finalCountry && finalCountryCode) {
          // 尝试匹配本地封面
          let finalCoverUrl = coverUrl;
          if (!finalCoverUrl) {
            const localCover = getLocalCoverUrl(title);
            if (localCover) {
              finalCoverUrl = localCover;
            }
          }
          
          const bookInfo: BookInfo = {
            id: crypto.randomUUID(),
            title,
            author: author || '未知作者',
            genre: genre || undefined,
            country: finalCountry,
            countryCode: finalCountryCode.toUpperCase(),
            coverUrl: finalCoverUrl || undefined,
          };
          booksToImport.push({ book: bookInfo, startDate, endDate, review });
          successCount++;
        } else if (title) {
          // 如果信息不完整（缺少国家或国家代码），使用AI匹配
          // 使用AI匹配书籍信息
          try {
            const { data, error } = await supabase.functions.invoke('match-book', {
              body: { bookTitle: title },
            });

            if (error || data?.error) {
              console.warn(`AI匹配失败: ${title}`, error || data?.error);
              errorCount++;
              continue;
            }

            if (data?.book) {
              // 优先使用Excel中的国家信息（作者国籍）
              let finalCountry = country || data.book.country;
              let finalCountryCode = countryCode || data.book.countryCode;
              
              // 如果Excel中有国家名称但没有代码，尝试查找
              if (finalCountry && !finalCountryCode) {
                const foundCode = findCountryCode(finalCountry);
                if (foundCode) {
                  finalCountryCode = foundCode;
                } else {
                  finalCountryCode = data.book.countryCode;
                }
              }
              
              // 尝试匹配本地封面
              let finalCoverUrl = coverUrl || data.book.coverUrl;
              if (!finalCoverUrl) {
                const localCover = getLocalCoverUrl(data.book.title);
                if (localCover) {
                  finalCoverUrl = localCover;
                }
              }
              
              const bookInfo: BookInfo = {
                id: crypto.randomUUID(),
                title: data.book.title,
                author: author || data.book.author,
                genre: genre || data.book.genre || undefined,
                country: finalCountry,
                countryCode: finalCountryCode.toUpperCase(),
                coverUrl: finalCoverUrl || undefined,
              };
              booksToImport.push({ book: bookInfo, startDate, endDate, review });
              successCount++;
            } else {
              errorCount++;
            }
          } catch (err) {
            console.error(`处理书籍 ${title} 时出错:`, err);
            errorCount++;
          }

          // 每10本暂停一下，避免API限流
          if ((i + 1) % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }

      if (booksToImport.length > 0) {
        console.log('准备导入的书籍:', booksToImport);
        console.log('书籍数量:', booksToImport.length);
        
        // 验证数据格式
        booksToImport.forEach((item, index) => {
          if (!item.book.title) {
            console.error(`第 ${index + 1} 本书缺少书名:`, item);
          }
          if (!item.book.countryCode) {
            console.error(`第 ${index + 1} 本书缺少国家代码:`, item);
          }
        });
        
        onImport(booksToImport);
        setImportedCount(successCount);
        setCurrentBookIndex(totalBooks); // 设置为总数，显示100%
        toast.success(`成功导入 ${successCount} 本书${errorCount > 0 ? `，${errorCount} 本失败` : ''}`);
        
        // 重置
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        toast.error('没有成功导入任何书籍');
        setCurrentBookIndex(0);
      }
    } catch (error) {
      console.error('导入错误:', error);
      toast.error('导入失败，请重试');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setPreviewData([]);
    setImportedCount(0);
    setTotalBooks(0);
    setCurrentBookIndex(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40"
            onClick={handleClose}
          />
          
          {/* 面板 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            <div className="w-full max-w-2xl bg-card rounded-2xl border border-border shadow-elevated overflow-hidden pointer-events-auto max-h-[90vh] flex flex-col">
              {/* 头部 */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-serif text-lg font-medium text-foreground">批量导入书籍</h2>
                    <p className="text-sm text-muted-foreground">上传Excel文件批量添加阅读记录</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="btn-icon"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 内容 */}
              <div className="flex-1 overflow-y-auto scrollbar-elegant px-6 py-6">
                {/* 文件上传区域 */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-foreground mb-3">
                    Excel文件格式说明
                  </label>
                  <div className="warm-card p-4 mb-4 text-sm text-muted-foreground space-y-2">
                    <p>支持的列名（中英文均可）：</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li><strong>书名/title</strong> - 必填</li>
                      <li><strong>作者/author</strong> - 可选（如缺失将使用AI匹配）</li>
                      <li><strong>作者国籍</strong> - 可选（将映射到国家，如缺失将使用AI匹配）</li>
                      <li><strong>类型/genre</strong> - 可选</li>
                      <li><strong>国家/country</strong> - 可选（如缺失将使用AI匹配）</li>
                      <li><strong>国家代码/countryCode</strong> - 可选（如缺失将自动查找）</li>
                      <li><strong>开始日期/startDate</strong> - 可选（格式：YYYY-MM-DD）</li>
                      <li><strong>结束日期/endDate 或 读完日期</strong> - 可选（格式：YYYY-MM-DD）</li>
                      <li><strong>短评/review 或 一句话总结</strong> - 可选</li>
                      <li><strong>封面/coverUrl</strong> - 可选（图片URL）</li>
                    </ul>
                  </div>

                  <div className="relative">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="excel-upload"
                    />
                    <label
                      htmlFor="excel-upload"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors bg-muted/30"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
                          <span className="text-sm text-muted-foreground">正在解析文件...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                          <span className="text-sm font-medium text-foreground">点击选择Excel文件</span>
                          <span className="text-xs text-muted-foreground mt-1">支持 .xlsx 和 .xls 格式</span>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                {/* 预览数据 */}
                {previewData.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium text-foreground">
                        数据预览（前10条）
                      </label>
                      <span className="text-xs text-muted-foreground">
                        共 {totalBooks} 条记录（预览前10条）
                      </span>
                    </div>
                    <div className="warm-card p-4 max-h-64 overflow-y-auto scrollbar-elegant">
                      <div className="space-y-2">
                        {previewData.map((row, index) => {
                          const title = normalizeValue(row.书名 || row.title);
                          const author = normalizeValue(row.作者 || row.author);
                          const country = normalizeValue(row.作者国籍 || row.国家 || row.country);
                          return (
                            <div key={index} className="text-sm border-b border-border/50 pb-2 last:border-0">
                              <div className="font-medium text-foreground">
                                {title || '(无书名)'}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                作者: {author || '待匹配'} | 
                                国家: {country || '待匹配'}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* 导入进度 */}
                {isProcessing && totalBooks > 0 && (
                  <div className="mb-6">
                    <div className="warm-card p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">
                          正在导入第 {currentBookIndex} 本 / 总共 {totalBooks} 本
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {Math.round((currentBookIndex / totalBooks) * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <motion.div
                          className="h-full bg-primary rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${(currentBookIndex / totalBooks) * 100}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 导入结果 */}
                {importedCount > 0 && !isProcessing && (
                  <div className="mb-6">
                    <div className="warm-card p-4 bg-forest/10 border-forest/30">
                      <div className="flex items-center gap-2 text-forest">
                        <Check className="w-5 h-5" />
                        <span className="font-medium">成功导入 {importedCount} 本书</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 底部按钮 */}
              <div className="px-6 py-4 border-t border-border bg-card flex-shrink-0">
                <div className="flex gap-3">
                  <button
                    onClick={handleClose}
                    className="btn-secondary flex-1"
                    disabled={isProcessing}
                  >
                    取消
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={isProcessing || previewData.length === 0}
                    className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>正在导入...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        <span>开始导入</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ExcelUploadPanel;
