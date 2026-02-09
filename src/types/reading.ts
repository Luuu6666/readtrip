// 阅读足迹数据类型

export interface BookInfo {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  genre?: string;
  country: string;
  countryCode: string;
}

export interface ReadingRecord {
  id: string;
  book: BookInfo;
  startDate?: string;
  endDate?: string;
  review?: string;
  createdAt: string;
}

export interface CountryData {
  code: string;
  name: string;
  nameCn: string;
  books: ReadingRecord[];
}

// AI匹配返回的书籍信息
export interface AIBookMatch {
  title: string;
  author: string;
  genre: string;
  country: string;
  countryCode: string;
  coverUrl?: string;
  description?: string;
}

// 国家代码映射
export const COUNTRY_NAMES: Record<string, { en: string; cn: string }> = {
  CN: { en: "China", cn: "中国" },
  US: { en: "United States", cn: "美国" },
  GB: { en: "United Kingdom", cn: "英国" },
  FR: { en: "France", cn: "法国" },
  DE: { en: "Germany", cn: "德国" },
  JP: { en: "Japan", cn: "日本" },
  RU: { en: "Russia", cn: "俄罗斯" },
  IT: { en: "Italy", cn: "意大利" },
  ES: { en: "Spain", cn: "西班牙" },
  BR: { en: "Brazil", cn: "巴西" },
  IN: { en: "India", cn: "印度" },
  AU: { en: "Australia", cn: "澳大利亚" },
  CA: { en: "Canada", cn: "加拿大" },
  MX: { en: "Mexico", cn: "墨西哥" },
  AR: { en: "Argentina", cn: "阿根廷" },
  EG: { en: "Egypt", cn: "埃及" },
  ZA: { en: "South Africa", cn: "南非" },
  KR: { en: "South Korea", cn: "韩国" },
  TR: { en: "Turkey", cn: "土耳其" },
  SA: { en: "Saudi Arabia", cn: "沙特阿拉伯" },
  IR: { en: "Iran", cn: "伊朗" },
  TH: { en: "Thailand", cn: "泰国" },
  VN: { en: "Vietnam", cn: "越南" },
  ID: { en: "Indonesia", cn: "印度尼西亚" },
  MY: { en: "Malaysia", cn: "马来西亚" },
  PH: { en: "Philippines", cn: "菲律宾" },
  PK: { en: "Pakistan", cn: "巴基斯坦" },
  BD: { en: "Bangladesh", cn: "孟加拉国" },
  NG: { en: "Nigeria", cn: "尼日利亚" },
  KE: { en: "Kenya", cn: "肯尼亚" },
  SE: { en: "Sweden", cn: "瑞典" },
  NO: { en: "Norway", cn: "挪威" },
  DK: { en: "Denmark", cn: "丹麦" },
  FI: { en: "Finland", cn: "芬兰" },
  NL: { en: "Netherlands", cn: "荷兰" },
  BE: { en: "Belgium", cn: "比利时" },
  CH: { en: "Switzerland", cn: "瑞士" },
  AT: { en: "Austria", cn: "奥地利" },
  PL: { en: "Poland", cn: "波兰" },
  CZ: { en: "Czech Republic", cn: "捷克" },
  GR: { en: "Greece", cn: "希腊" },
  PT: { en: "Portugal", cn: "葡萄牙" },
  IE: { en: "Ireland", cn: "爱尔兰" },
  NZ: { en: "New Zealand", cn: "新西兰" },
  CL: { en: "Chile", cn: "智利" },
  CO: { en: "Colombia", cn: "哥伦比亚" },
  PE: { en: "Peru", cn: "秘鲁" },
  UA: { en: "Ukraine", cn: "乌克兰" },
  RO: { en: "Romania", cn: "罗马尼亚" },
  HU: { en: "Hungary", cn: "匈牙利" },
  IL: { en: "Israel", cn: "以色列" },
  AE: { en: "United Arab Emirates", cn: "阿联酋" },
  SG: { en: "Singapore", cn: "新加坡" },
  HK: { en: "Hong Kong, China", cn: "中国香港" },
  AF: { en: "Afghanistan", cn: "阿富汗" },
  AL: { en: "Albania", cn: "阿尔巴尼亚" },
  DZ: { en: "Algeria", cn: "阿尔及利亚" },
  AO: { en: "Angola", cn: "安哥拉" },
  BY: { en: "Belarus", cn: "白俄罗斯" },
  BO: { en: "Bolivia", cn: "玻利维亚" },
  BG: { en: "Bulgaria", cn: "保加利亚" },
  KH: { en: "Cambodia", cn: "柬埔寨" },
  CM: { en: "Cameroon", cn: "喀麦隆" },
  CD: { en: "DR Congo", cn: "刚果民主共和国" },
  CU: { en: "Cuba", cn: "古巴" },
  EC: { en: "Ecuador", cn: "厄瓜多尔" },
  ET: { en: "Ethiopia", cn: "埃塞俄比亚" },
  GH: { en: "Ghana", cn: "加纳" },
  GT: { en: "Guatemala", cn: "危地马拉" },
  IQ: { en: "Iraq", cn: "伊拉克" },
  JO: { en: "Jordan", cn: "约旦" },
  KZ: { en: "Kazakhstan", cn: "哈萨克斯坦" },
  LB: { en: "Lebanon", cn: "黎巴嫩" },
  LY: { en: "Libya", cn: "利比亚" },
  MA: { en: "Morocco", cn: "摩洛哥" },
  MM: { en: "Myanmar", cn: "缅甸" },
  NP: { en: "Nepal", cn: "尼泊尔" },
  KP: { en: "North Korea", cn: "朝鲜" },
  OM: { en: "Oman", cn: "阿曼" },
  PA: { en: "Panama", cn: "巴拿马" },
  PY: { en: "Paraguay", cn: "巴拉圭" },
  QA: { en: "Qatar", cn: "卡塔尔" },
  RS: { en: "Serbia", cn: "塞尔维亚" },
  LK: { en: "Sri Lanka", cn: "斯里兰卡" },
  SD: { en: "Sudan", cn: "苏丹" },
  SY: { en: "Syria", cn: "叙利亚" },
  TZ: { en: "Tanzania", cn: "坦桑尼亚" },
  TN: { en: "Tunisia", cn: "突尼斯" },
  UG: { en: "Uganda", cn: "乌干达" },
  UY: { en: "Uruguay", cn: "乌拉圭" },
  UZ: { en: "Uzbekistan", cn: "乌兹别克斯坦" },
  VE: { en: "Venezuela", cn: "委内瑞拉" },
  YE: { en: "Yemen", cn: "也门" },
  ZM: { en: "Zambia", cn: "赞比亚" },
  ZW: { en: "Zimbabwe", cn: "津巴布韦" },
  MN: { en: "Mongolia", cn: "蒙古" },
  LA: { en: "Laos", cn: "老挝" },
  HR: { en: "Croatia", cn: "克罗地亚" },
  BA: { en: "Bosnia", cn: "波黑" },
  SK: { en: "Slovakia", cn: "斯洛伐克" },
  SI: { en: "Slovenia", cn: "斯洛文尼亚" },
  EE: { en: "Estonia", cn: "爱沙尼亚" },
  LV: { en: "Latvia", cn: "拉脱维亚" },
  LT: { en: "Lithuania", cn: "立陶宛" },
  IS: { en: "Iceland", cn: "冰岛" },
  CY: { en: "Cyprus", cn: "塞浦路斯" },
  LU: { en: "Luxembourg", cn: "卢森堡" },
  MT: { en: "Malta", cn: "马耳他" },
  MC: { en: "Monaco", cn: "摩纳哥" },
};

export function getCountryName(code: string, lang: 'en' | 'cn' = 'cn'): string {
  const country = COUNTRY_NAMES[code.toUpperCase()];
  return country ? (lang === 'cn' ? country.cn : country.en) : code;
}
