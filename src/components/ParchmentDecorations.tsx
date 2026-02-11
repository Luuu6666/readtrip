import React from 'react';

/**
 * 复古羊皮主题下的航海装饰元素（船、指南针、卷角等）
 * 仅装饰用，对屏幕阅读器隐藏
 */
export const ParchmentDecorations: React.FC = () => {
  return (
    <>
      {/* 四角装饰 - 复古卷轴/地图边框角 */}
      <div
        className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
        aria-hidden="true"
      >
        {/* 左上角 - 指南针风格装饰 */}
        <svg
          className="absolute left-4 top-4 w-16 h-16 text-primary/20"
          viewBox="0 0 64 64"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          role="img"
          aria-hidden="true"
        >
          <circle cx="32" cy="32" r="28" />
          <path d="M32 8v8M32 48v8M8 32h8M48 32h8" />
          <path d="M20 20l6 6M38 38l6 6M38 20l-6 6M20 38l-6 6" />
          <path d="M32 14l4 18-4 18-4-18 4-18z" />
          <path d="M14 32l18 4 18-4-18-4-18 4z" />
        </svg>

        {/* 右上角 - 船锚风格装饰 */}
        <svg
          className="absolute right-4 top-4 w-14 h-14 text-primary/20"
          viewBox="0 0 56 56"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          role="img"
          aria-hidden="true"
        >
          <path d="M28 8v24M20 32h16" />
          <path d="M28 32c-6 0-10 4-10 10 0 4 4 8 10 8s10-4 10-8c0-6-4-10-10-10z" />
          <path d="M24 20l4-4 4 4M24 36l4 4 4-4" />
        </svg>

        {/* 左下角 - 海鸟/帆船简化装饰 */}
        <svg
          className="absolute left-4 bottom-4 w-14 h-14 text-primary/20"
          viewBox="0 0 56 56"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          role="img"
          aria-hidden="true"
        >
          <path d="M8 40l12-16 8 8 12-20" />
          <path d="M28 24l8 8 12-8" />
          <circle cx="44" cy="32" r="3" />
        </svg>

        {/* 右下角 - 卷轴卷角 */}
        <svg
          className="absolute right-4 bottom-4 w-16 h-16 text-primary/20"
          viewBox="0 0 64 64"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          role="img"
          aria-hidden="true"
        >
          <path d="M48 48c0-8-8-16-16-16S16 40 16 48" />
          <path d="M48 48c0-6-6-12-12-12" />
          <path d="M32 32l16 16M32 32v16" />
        </svg>

        {/* 地图边框 - 四边浅色描边 */}
        <div
          className="absolute inset-4 border-2 border-primary/10 rounded-lg pointer-events-none"
          style={{ borderStyle: 'double' }}
          aria-hidden="true"
        />
      </div>
    </>
  );
};
