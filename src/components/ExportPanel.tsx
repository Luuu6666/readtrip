import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Loader2, Image, Check } from 'lucide-react';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';

interface ExportPanelProps {
  isOpen: boolean;
  onClose: () => void;
  mapRef: React.RefObject<HTMLDivElement>;
  stats: {
    totalBooks: number;
    totalCountries: number;
  };
}

export const ExportPanel: React.FC<ExportPanelProps> = ({
  isOpen,
  onClose,
  mapRef,
  stats,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleExport = async () => {
    if (!mapRef.current) {
      toast.error('无法获取地图元素');
      return;
    }

    setIsExporting(true);
    setExportSuccess(false);

    try {
      // 创建导出容器
      const exportContainer = document.createElement('div');
      exportContainer.style.cssText = `
        position: fixed;
        top: -9999px;
        left: -9999px;
        width: 1200px;
        height: 800px;
        background: linear-gradient(180deg, hsl(42 35% 96%) 0%, hsl(38 30% 92%) 50%, hsl(35 25% 88%) 100%);
        padding: 40px;
        display: flex;
        flex-direction: column;
      `;
      document.body.appendChild(exportContainer);

      // 头部
      const header = document.createElement('div');
      header.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
      `;
      header.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="font-family: 'Playfair Display', Georgia, serif; font-size: 28px; font-weight: 600; color: hsl(28 35% 18%);">
            阅迹 ReadTrip
          </div>
        </div>
        <div style="display: flex; gap: 24px; color: hsl(28 15% 45%); font-size: 14px;">
          <span>📚 ${stats.totalBooks} 本书</span>
          <span>🌍 ${stats.totalCountries} 个国家</span>
        </div>
      `;
      exportContainer.appendChild(header);

      // 地图区域 - 找到实际的SVG元素
      const mapContainer = mapRef.current;
      if (!mapContainer) {
        throw new Error('地图容器不存在');
      }

      // 查找SVG元素（react-simple-maps生成的SVG）
      const svgElement = mapContainer.querySelector('svg');
      if (!svgElement) {
        throw new Error('找不到地图SVG元素');
      }

      // 创建一个包装容器来导出SVG
      const svgWrapper = document.createElement('div');
      svgWrapper.style.cssText = `
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent;
      `;
      
      // 克隆SVG并设置样式
      const svgClone = svgElement.cloneNode(true) as SVGElement;
      svgClone.style.width = '100%';
      svgClone.style.height = '100%';
      svgWrapper.appendChild(svgClone);
      exportContainer.appendChild(svgWrapper);

      // 等待SVG渲染和图片加载
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 确保所有图片都已加载
      const images = exportContainer.querySelectorAll('img');
      await Promise.all(
        Array.from(images).map(
          (img) =>
            new Promise((resolve) => {
              if (img.complete) {
                resolve(void 0);
              } else {
                img.onload = () => resolve(void 0);
                img.onerror = () => resolve(void 0); // 即使失败也继续
              }
            })
        )
      );

      // 底部
      const footer = document.createElement('div');
      footer.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 20px;
        color: hsl(28 15% 45%);
        font-size: 12px;
      `;
      footer.innerHTML = `
        <div>记录于 ${new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span>readtrip.lovable.app</span>
        </div>
      `;
      exportContainer.appendChild(footer);

      // 等待渲染
      await new Promise(resolve => setTimeout(resolve, 500));

      // 导出图片
      const dataUrl = await toPng(exportContainer, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#f5f0e8',
        cacheBust: true,
        useCORS: true,
      });

      // 清理
      document.body.removeChild(exportContainer);

      // 下载
      const link = document.createElement('a');
      link.download = `阅迹ReadTrip-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();

      setExportSuccess(true);
      toast.success('地图导出成功！');

      // 3秒后重置状态
      setTimeout(() => {
        setExportSuccess(false);
      }, 3000);

    } catch (error) {
      console.error('Export error:', error);
      toast.error('导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
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
            onClick={onClose}
          />
          
          {/* 面板 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            <div className="w-full max-w-sm bg-card rounded-2xl border border-border shadow-elevated overflow-hidden pointer-events-auto">
            {/* 头部 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Image className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-serif text-lg font-medium text-foreground">导出地图</h2>
                  <p className="text-sm text-muted-foreground">生成高清足迹图片</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="btn-icon"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 内容 */}
            <div className="px-6 py-6">
              {/* 预览信息 */}
              <div className="warm-card p-4 mb-6">
                <div className="text-sm text-muted-foreground mb-3">导出内容预览</div>
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-serif text-lg font-medium text-foreground">阅迹 ReadTrip</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {new Date().toLocaleDateString('zh-CN')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-serif font-medium text-primary">{stats.totalBooks}</div>
                    <div className="text-xs text-muted-foreground">本书 · {stats.totalCountries} 国</div>
                  </div>
                </div>
              </div>

              {/* 导出说明 */}
              <div className="space-y-2 mb-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-forest" />
                  <span>高清PNG格式 (1200 × 800)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-forest" />
                  <span>包含产品logo和网址</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-forest" />
                  <span>自动标注阅读统计</span>
                </div>
              </div>

              {/* 导出按钮 */}
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="btn-primary w-full disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>正在生成...</span>
                  </>
                ) : exportSuccess ? (
                  <>
                    <Check className="w-5 h-5" />
                    <span>导出成功！</span>
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    <span>导出图片</span>
                  </>
                )}
              </button>
            </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ExportPanel;
