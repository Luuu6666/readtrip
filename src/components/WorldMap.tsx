import React, { useState, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
  Annotation,
} from 'react-simple-maps';
import { ReadingRecord, getCountryName } from '@/types/reading';
import { BookOpen, Grid3x3, List } from 'lucide-react';
import { getLocalCoverUrl, getAllLocalCovers, getRandomLocalCover } from '@/lib/bookCovers';
import { useThemeStyle } from '@/hooks/useThemeStyle';

// 使用 Natural Earth 的世界地图数据
const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// 国家中心坐标（经度, 纬度）
const COUNTRY_CENTERS: Record<string, [number, number]> = {
  CN: [104, 35], US: [-95, 38], GB: [-2, 54], FR: [2, 46], DE: [10, 51],
  JP: [138, 36], KR: [127, 36], IN: [78, 22], BR: [-52, -10], RU: [100, 60],
  AU: [134, -25], CA: [-106, 56], IT: [12, 42], ES: [-4, 40], MX: [-102, 23],
  ID: [120, -2], TR: [35, 39], SA: [45, 24], AR: [-64, -34], ZA: [25, -29],
  TH: [101, 15], EG: [30, 27], PL: [19, 52], NL: [5, 52], BE: [4, 50],
  SE: [15, 62], NO: [10, 62], DK: [10, 56], FI: [26, 64], CH: [8, 47],
  AT: [14, 47], PT: [- 8, 39], GR: [22, 39], CZ: [15, 50], IE: [-8, 53],
  NZ: [172, -41], SG: [104, 1], MY: [102, 4], PH: [122, 12], VN: [106, 16],
  PK: [69, 30], BD: [90, 24], IR: [53, 32], IQ: [44, 33], AF: [66, 34],
  UA: [32, 49], RO: [25, 46], HU: [20, 47], CL: [-71, -33], CO: [-72, 4],
  PE: [-76, -10], VE: [-66, 8], NG: [8, 10], KE: [38, 1], ET: [39, 9],
  MA: [-6, 32], DZ: [3, 28], TN: [9, 34], LY: [17, 27], SD: [30, 16],
  IS: [-19, 65], NP: [84, 28], LK: [81, 7], MM: [96, 20], KH: [105, 12],
  LA: [103, 18], MN: [104, 46], KZ: [67, 48], UZ: [64, 41], TM: [59, 39],
  AZ: [48, 40], GE: [43, 42], AM: [45, 40], BY: [28, 53], LT: [24, 55],
  LV: [25, 57], EE: [26, 59], SK: [20, 49], SI: [15, 46], HR: [16, 45],
  BA: [18, 44], RS: [21, 44], BG: [25, 43], MK: [22, 41], AL: [20, 41],
  CU: [-79, 22], DO: [-70, 19], JM: [-77, 18], HT: [- 72, 19], PR: [-66, 18],
};

interface WorldMapProps {
  visitedCountries: string[];
  countryBooks: Map<string, ReadingRecord[]>;
  onCountryClick?: (countryCode: string) => void;
}

// ISO 3166-1 numeric to alpha-2 code mapping
const NUMERIC_TO_ALPHA2: Record<string, string> = {
  "004": "AF", "008": "AL", "012": "DZ", "020": "AD", "024": "AO",
  "028": "AG", "032": "AR", "051": "AM", "036": "AU", "040": "AT",
  "031": "AZ", "044": "BS", "048": "BH", "050": "BD", "052": "BB",
  "112": "BY", "056": "BE", "084": "BZ", "204": "BJ", "064": "BT",
  "068": "BO", "070": "BA", "072": "BW", "076": "BR", "096": "BN",
  "100": "BG", "854": "BF", "108": "BI", "116": "KH", "120": "CM",
  "124": "CA", "140": "CF", "148": "TD", "152": "CL", "156": "CN",
  "170": "CO", "178": "CG", "180": "CD", "188": "CR", "191": "HR",
  "192": "CU", "196": "CY", "203": "CZ", "208": "DK", "262": "DJ",
  "214": "DO", "218": "EC", "818": "EG", "222": "SV", "226": "GQ",
  "232": "ER", "233": "EE", "231": "ET", "242": "FJ", "246": "FI",
  "250": "FR", "266": "GA", "270": "GM", "268": "GE", "276": "DE",
  "288": "GH", "300": "GR", "320": "GT", "324": "GN", "328": "GY",
  "332": "HT", "340": "HN", "348": "HU", "352": "IS", "356": "IN",
  "360": "ID", "364": "IR", "368": "IQ", "372": "IE", "376": "IL",
  "380": "IT", "384": "CI", "388": "JM", "392": "JP", "400": "JO",
  "398": "KZ", "404": "KE", "408": "KP", "410": "KR", "414": "KW",
  "417": "KG", "418": "LA", "428": "LV", "422": "LB", "426": "LS",
  "430": "LR", "434": "LY", "440": "LT", "442": "LU", "807": "MK",
  "450": "MG", "454": "MW", "458": "MY", "466": "ML", "478": "MR",
  "480": "MU", "484": "MX", "498": "MD", "496": "MN", "499": "ME",
  "504": "MA", "508": "MZ", "104": "MM", "516": "NA", "524": "NP",
  "528": "NL", "554": "NZ", "558": "NI", "562": "NE", "566": "NG",
  "578": "NO", "512": "OM", "586": "PK", "591": "PA", "598": "PG",
  "600": "PY", "604": "PE", "608": "PH", "616": "PL", "620": "PT",
  "634": "QA", "642": "RO", "643": "RU", "646": "RW", "682": "SA",
  "686": "SN", "688": "RS", "694": "SL", "702": "SG", "703": "SK",
  "705": "SI", "706": "SO", "710": "ZA", "724": "ES", "144": "LK",
  "736": "SD", "740": "SR", "748": "SZ", "752": "SE", "756": "CH",
  "760": "SY", "158": "CN", "762": "TJ", "834": "TZ", "764": "TH",  // 158 是台湾，属于中国
  "768": "TG", "780": "TT", "788": "TN", "792": "TR", "795": "TM",
  "800": "UG", "804": "UA", "784": "AE", "826": "GB", "840": "US",
  "858": "UY", "860": "UZ", "862": "VE", "704": "VN", "887": "YE",
  "894": "ZM", "716": "ZW", "729": "SS", "728": "SS",
};

// 获取国家的alpha-2代码
function getAlpha2Code(geo: any): string {
  // 尝试从properties中获取ISO代码
  const props = geo.properties;
  
  // 检查常见的属性名
  if (props.ISO_A2 && props.ISO_A2 !== '-99') return props.ISO_A2;
  if (props.iso_a2 && props.iso_a2 !== '-99') return props.iso_a2.toUpperCase();
  
  // 使用数字代码转换
  const numericCode = String(geo.id).padStart(3, '0');
  return NUMERIC_TO_ALPHA2[numericCode] || '';
}

// 预设的示例书籍封面图片（优先使用本地图片库）
const DEFAULT_BOOK_COVERS = getAllLocalCovers();

// 生成默认封面图案的SVG Data URL - 优雅的书籍封面设计
function generateDefaultCoverSVG(isDarkGold: boolean = false): string {
  const bgColor = isDarkGold ? '#1a1a1a' : '#f5f0e8';
  const primaryColor = isDarkGold ? '#d4af37' : '#8b6f47';
  const secondaryColor = isDarkGold ? '#b8941f' : '#a08060';
  const accentColor = isDarkGold ? '#b8941f' : '#a08060';
  
  const svg = `
    <svg width="200" height="300" xmlns="http://www.w3.org/2000/svg">
      <!-- 背景 -->
      <rect width="200" height="300" fill="${bgColor}" rx="4"/>
      
      <!-- 顶部装饰带 -->
      <rect x="0" y="0" width="200" height="40" fill="${primaryColor}" opacity="${isDarkGold ? '0.15' : '0.08'}" rx="4"/>
      
      <!-- 优雅的书籍图标 -->
      <g transform="translate(100, 140)">
        <!-- 书籍主体 -->
        <rect x="-35" y="-45" width="70" height="90" fill="none" stroke="${primaryColor}" stroke-width="2.5" rx="3" opacity="0.6"/>
        
        <!-- 书页线条 -->
        <line x1="-25" y1="-35" x2="25" y2="-35" stroke="${secondaryColor}" stroke-width="1.5" opacity="0.5"/>
        <line x1="-25" y1="-20" x2="20" y2="-20" stroke="${secondaryColor}" stroke-width="1.5" opacity="0.5"/>
        <line x1="-25" y1="-5" x2="25" y2="-5" stroke="${secondaryColor}" stroke-width="1.5" opacity="0.5"/>
        <line x1="-25" y1="10" x2="15" y2="10" stroke="${secondaryColor}" stroke-width="1.5" opacity="0.5"/>
        <line x1="-25" y1="25" x2="25" y2="25" stroke="${secondaryColor}" stroke-width="1.5" opacity="0.5"/>
        <line x1="-25" y1="40" x2="10" y2="40" stroke="${secondaryColor}" stroke-width="1.5" opacity="0.5"/>
        
        <!-- 书脊装饰 -->
        <line x1="0" y1="-45" x2="0" y2="45" stroke="${accentColor}" stroke-width="2" opacity="0.3"/>
      </g>
      
      <!-- 底部装饰元素 -->
      <g transform="translate(100, 250)">
        <circle cx="-40" cy="0" r="6" fill="${primaryColor}" opacity="0.15"/>
        <circle cx="0" cy="0" r="4" fill="${primaryColor}" opacity="0.2"/>
        <circle cx="40" cy="0" r="6" fill="${primaryColor}" opacity="0.15"/>
      </g>
      
      <!-- 侧边装饰线条 -->
      <line x1="15" y1="50" x2="15" y2="250" stroke="${primaryColor}" stroke-width="1" opacity="0.1"/>
      <line x1="185" y1="50" x2="185" y2="250" stroke="${primaryColor}" stroke-width="1" opacity="0.1"/>
    </svg>
  `.trim();
  
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

// 获取书籍封面图片，优先使用本地图片库
function getBookCoverUrl(record: ReadingRecord, index: number, isDarkGold: boolean = false): string {
  // 1. 如果记录中已有封面URL，验证后使用
  if (record.book.coverUrl) {
    // 验证URL是否有效（不是空字符串或无效URL）
    try {
      new URL(record.book.coverUrl);
      return record.book.coverUrl;
    } catch {
      // URL无效，继续使用默认封面
    }
  }
  
  // 2. 尝试从本地图片库匹配
  const localCover = getLocalCoverUrl(record.book.title);
  if (localCover) {
    return localCover;
  }
  
  // 3. 使用预设图片，根据索引循环使用本地图片库
  if (DEFAULT_BOOK_COVERS.length > 0) {
    return DEFAULT_BOOK_COVERS[index % DEFAULT_BOOK_COVERS.length];
  }
  
  // 4. 使用默认SVG图案（确保总是有封面）
  return generateDefaultCoverSVG(isDarkGold);
}

export const WorldMap: React.FC<WorldMapProps> = memo(({
  visitedCountries,
  countryBooks,
  onCountryClick,
}) => {
  const { isDarkGold } = useThemeStyle();
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [tooltipData, setTooltipData] = useState<{
    x: number;
    y: number;
    code: string;
    name: string;
  } | null>(null);
  const [position, setPosition] = useState({ coordinates: [0, 20] as [number, number], zoom: 1 });
  const [isExpanded, setIsExpanded] = useState(false);

  const visitedSet = useMemo(
    () => new Set(visitedCountries.map(c => c.toUpperCase())),
    [visitedCountries]
  );

  const handleMoveEnd = useCallback((pos: { coordinates: [number, number]; zoom: number }) => {
    setPosition(pos);
  }, []);

  const handleMouseEnter = useCallback((e: React.MouseEvent, code: string, name: string) => {
    const rect = (e.target as SVGElement).getBoundingClientRect();
    const containerRect = (e.currentTarget as SVGElement).closest('.map-wrapper')?.getBoundingClientRect();
    if (containerRect) {
      setTooltipData({
        x: rect.left + rect.width / 2 - containerRect.left,
        y: rect.top - containerRect.top - 10,
        code,
        name,
      });
    }
    setHoveredCountry(code);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredCountry(null);
    setTooltipData(null);
  }, []);

  const hoveredBooks = hoveredCountry ? countryBooks.get(hoveredCountry) || [] : [];

  return (
    <div className="relative w-full h-full map-wrapper vintage-map-bg">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: 140,
          center: [0, 30],
        }}
        style={{ width: '100%', height: '100%', background: 'transparent' }}
      >
        {/* SVG 裁剪路径定义 */}
        <defs>
          <clipPath id="book-clip">
            <rect x="-12" y="-18" width="24" height="36" rx="2" />
          </clipPath>
        </defs>
        <ZoomableGroup
          center={position.coordinates}
          zoom={position.zoom}
          onMoveEnd={handleMoveEnd}
          minZoom={1}
          maxZoom={8}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const countryCode = getAlpha2Code(geo);
                const isVisited = visitedSet.has(countryCode);
                const isHovered = hoveredCountry === countryCode;
                const bookCount = countryBooks.get(countryCode)?.length || 0;

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onMouseEnter={(e) => handleMouseEnter(e, countryCode, geo.properties.name)}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => countryCode && onCountryClick?.(countryCode)}
                    style={{
                      default: {
                        fill: isVisited ? 'hsl(var(--map-visited))' : 'hsl(var(--map-land))',
                        stroke: 'hsl(var(--map-border))',
                        strokeWidth: 0.5,
                        outline: 'none',
                        cursor: 'pointer',
                        transition: 'fill 0.2s ease',
                      },
                      hover: {
                        fill: 'hsl(var(--map-hover))',
                        stroke: 'hsl(var(--map-border))',
                        strokeWidth: 1,
                        outline: 'none',
                        cursor: 'pointer',
                      },
                      pressed: {
                        fill: 'hsl(var(--primary))',
                        stroke: 'hsl(var(--map-border))',
                        strokeWidth: 1,
                        outline: 'none',
                      },
                    }}
                  />
                );
              })
            }
          </Geographies>

          {/* 已访问国家的标注 */}
          {Array.from(countryBooks.entries()).map(([code, books]) => {
            if (books.length === 0) return null;
            const center = COUNTRY_CENTERS[code];
            if (!center) return null;
            
            const countryName = getCountryName(code);
            if (!countryName) return null;

            // 展开模式：显示书籍封面
            if (isExpanded) {
              return (
                <Annotation
                  key={code}
                  subject={center}
                  dx={0}
                  dy={-25}
                  connectorProps={{
                    stroke: 'hsl(var(--primary) / 0.4)',
                    strokeWidth: 0.5,
                    strokeLinecap: 'round',
                  }}
                >
                  <g
                    className="country-books-group"
                  >
                    {/* 书籍封面容器 - 水平并排排列 */}
                    {books.slice(0, 5).map((book, index) => {
                      const totalBooks = Math.min(books.length, 5);
                      const bookWidth = 24; // 书籍宽度
                      const bookSpacing = 4; // 书籍之间的间距
                      const totalWidth = totalBooks * bookWidth + (totalBooks - 1) * bookSpacing;
                      const startX = -totalWidth / 2 + bookWidth / 2; // 起始X位置（居中）
                      const x = startX + index * (bookWidth + bookSpacing);
                      const y = -28; // 书籍封面在标签上方，距离更近
                      
                      return (
                        <g
                          key={book.id}
                          transform={`translate(${x}, ${y})`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => onCountryClick?.(code)}
                        >
                          {/* 书籍封面阴影 */}
                          <rect
                            x={-12}
                            y={-18}
                            width={24}
                            height={36}
                            rx={2}
                            fill="rgba(0,0,0,0.25)"
                            transform="translate(1.5, 1.5)"
                          />
                          {/* 书籍封面 */}
                          {(() => {
                            const coverUrl = getBookCoverUrl(book, index, isDarkGold);
                            // 如果是默认SVG，直接使用image标签；否则需要处理加载失败的情况
                            const isDefaultSVG = coverUrl.startsWith('data:image/svg+xml');
                            
                            return (
                              <image
                                x={-12}
                                y={-18}
                                width={24}
                                height={36}
                                href={coverUrl}
                                preserveAspectRatio="xMidYMid slice"
                                clipPath="url(#book-clip)"
                                style={{
                                  filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))',
                                }}
                              />
                            );
                          })()}
                          {/* 书籍封面边框 */}
                          <rect
                            x={-12}
                            y={-18}
                            width={24}
                            height={36}
                            rx={2}
                            fill="none"
                            stroke="hsl(var(--border))"
                            strokeWidth={0.5}
                          />
                        </g>
                      );
                    })}
                    {/* 国家名称标签 */}
                    <g
                      onClick={() => onCountryClick?.(code)}
                      style={{ cursor: 'pointer' }}
                    >
                      <rect
                        x={-20}
                        y={14}
                        width={40}
                        height={14}
                        rx={3}
                        fill="hsl(var(--card))"
                        stroke="hsl(var(--border))"
                        strokeWidth={0.5}
                        style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' }}
                      />
                      <text
                        x={0}
                        y={22}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{
                          fontFamily: 'var(--font-serif), serif',
                          fontSize: 7,
                          fill: 'hsl(var(--foreground))',
                          fontWeight: 500,
                        }}
                      >
                        {countryName.length > 6 ? countryName.slice(0, 5) + '…' : countryName}
                      </text>
                    </g>
                    {/* 书籍数量徽章 */}
                    {books.length > 5 && (
                      <circle
                        cx={20}
                        cy={-20}
                        r={8}
                        fill="hsl(var(--primary))"
                        stroke="hsl(var(--background))"
                        strokeWidth={1.5}
                        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
                      />
                    )}
                    {books.length > 5 && (
                      <text
                        x={20}
                        y={-18}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{
                          fontSize: 7,
                          fill: 'hsl(var(--primary-foreground))',
                          fontWeight: 700,
                        }}
                      >
                        +{books.length - 5}
                      </text>
                    )}
                  </g>
                </Annotation>
              );
            }

            // 收起模式：显示数字徽章
            return (
              <Annotation
                key={code}
                subject={center}
                dx={0}
                dy={-25}
                connectorProps={{
                  stroke: 'hsl(var(--primary) / 0.4)',
                  strokeWidth: 0.5,
                  strokeLinecap: 'round',
                }}
              >
                <g
                  onClick={() => onCountryClick?.(code)}
                  style={{ cursor: 'pointer' }}
                  className="country-marker"
                >
                  {/* 圆形徽章 */}
                  <circle
                    cx={0}
                    cy={0}
                    r={12}
                    fill="hsl(var(--primary))"
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                    style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
                  />
                  {/* 数字 */}
                  <text
                    x={0}
                    y={1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{
                      fontSize: 10,
                      fill: 'hsl(var(--primary-foreground))',
                      fontWeight: 700,
                    }}
                  >
                    {books.length}
                  </text>
                  {/* 国家名称标签 */}
                  <rect
                    x={-20}
                    y={14}
                    width={40}
                    height={14}
                    rx={3}
                    fill="hsl(var(--card))"
                    stroke="hsl(var(--border))"
                    strokeWidth={0.5}
                    style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' }}
                  />
                  <text
                    x={0}
                    y={22}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{
                      fontFamily: 'var(--font-serif), serif',
                      fontSize: 7,
                      fill: 'hsl(var(--foreground))',
                      fontWeight: 500,
                    }}
                  >
                    {countryName.length > 6 ? countryName.slice(0, 5) + '…' : countryName}
                  </text>
                </g>
              </Annotation>
            );
          })}
        </ZoomableGroup>
      </ComposableMap>

      {/* 悬停提示框 */}
      <AnimatePresence>
        {tooltipData && hoveredCountry && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.15 }}
            className="absolute pointer-events-none z-50"
            style={{
              left: tooltipData.x,
              top: tooltipData.y,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="glass-panel rounded-lg px-4 py-3 min-w-[160px] max-w-[280px]">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{getCountryFlag(hoveredCountry)}</span>
                <span className="font-serif font-medium text-foreground">
                  {getCountryName(hoveredCountry) || tooltipData.name}
                </span>
              </div>
              {hoveredBooks.length > 0 ? (
                <div className="space-y-1">
                  {hoveredBooks.slice(0, 3).map((record) => (
                    <div key={record.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <BookOpen className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{record.book.title}</span>
                    </div>
                  ))}
                  {hoveredBooks.length > 3 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      还有 {hoveredBooks.length - 3} 本...
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">暂无阅读记录</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 已访问国家的书籍数量标记 - 使用CSS overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from(countryBooks.entries()).map(([code, books]) => {
          if (books.length === 0) return null;
          // 这里我们不渲染标记，因为地图是动态缩放的
          // 可以在未来添加annotation层
          return null;
        })}
      </div>

      {/* 展开/收起切换按钮 */}
      <div className="absolute bottom-4 left-4 z-20">
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsExpanded(!isExpanded)}
          disabled={!Array.from(countryBooks.values()).some(books => books.length > 0)}
          className="w-12 h-12 rounded-lg bg-card/90 backdrop-blur border border-border shadow-soft flex items-center justify-center text-foreground hover:bg-card transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={Array.from(countryBooks.values()).some(books => books.length > 0) 
            ? (isExpanded ? '收起书籍封面' : '展开书籍封面')
            : '暂无阅读记录'}
        >
          {isExpanded ? (
            <List className="w-5 h-5" />
          ) : (
            <Grid3x3 className="w-5 h-5" />
          )}
        </motion.button>
      </div>

      {/* 缩放控制按钮 */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-20">
        <button
          onClick={() => setPosition(prev => ({ ...prev, zoom: Math.min(prev.zoom * 1.5, 8) }))}
          className="w-10 h-10 rounded-lg bg-card/90 backdrop-blur border border-border shadow-soft flex items-center justify-center text-foreground hover:bg-card transition-colors"
        >
          <span className="text-xl font-light">+</span>
        </button>
        <button
          onClick={() => setPosition(prev => ({ ...prev, zoom: Math.max(prev.zoom / 1.5, 1) }))}
          className="w-10 h-10 rounded-lg bg-card/90 backdrop-blur border border-border shadow-soft flex items-center justify-center text-foreground hover:bg-card transition-colors"
        >
          <span className="text-xl font-light">−</span>
        </button>
        <button
          onClick={() => setPosition({ coordinates: [0, 20], zoom: 1 })}
          className="w-10 h-10 rounded-lg bg-card/90 backdrop-blur border border-border shadow-soft flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card transition-colors text-xs"
        >
          重置
        </button>
      </div>
    </div>
  );
});

WorldMap.displayName = 'WorldMap';

// 获取国家旗帜emoji
function getCountryFlag(code: string): string {
  if (!code || code.length !== 2) return '🌍';
  const codePoints = code
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export default WorldMap;
