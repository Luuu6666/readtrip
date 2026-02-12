# 让 www.readtrip.club 使用 AI 书籍匹配（豆瓣 + 火山引擎）

本地已可用的 AI 匹配逻辑（豆瓣优先 + 火山引擎补全国籍）部署在 **Supabase 项目 kmvxcrjvhvkylypkirew** 的 Edge Function `match-book` 上。只要线上站点也连到这个项目，就会自动使用同一套 API，**无需改代码**。

---

## 操作步骤（在 Vercel 或你部署 readtrip 的平台）

1. **打开部署 readtrip.club 的项目**  
   - Vercel：https://vercel.com → 你的 readtrip 项目  
   - 其他平台：到该项目的「环境变量 / Environment Variables」页面  

2. **配置与本地一致的 Supabase 环境变量（Production 与 Preview 建议都配）**

   | 变量名 | 值（与本地 .env 一致） |
   |--------|------------------------|
   | `VITE_SUPABASE_URL` | `https://kmvxcrjvhvkylypkirew.supabase.co` |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | 本地 `.env` 里的 `VITE_SUPABASE_PUBLISHABLE_KEY` 整串复制过来 |

   - 本地 `.env` 中这两项已指向项目 **kmvxcrjvhvkylypkirew**，线上必须与之一致，前端才会调用到已配置 VOLC_API_KEY 的 `match-book`。  

3. **保存后重新部署**  
   - Vercel：保存环境变量后，在 Deployments 里对最新部署点 **Redeploy**，或推一次代码触发部署。  
   - 其他平台：按该平台方式触发一次新部署，使新环境变量生效。

---

## 检查是否生效

- 打开 https://www.readtrip.club  
- 使用「添加书籍」→ 输入书名 → 点「AI 匹配」  
- 若能在几秒内返回书名、作者、国家、封面，说明线上已在使用同一套 API（豆瓣 + 火山引擎）。

若失败，可在浏览器 F12 → Network 里看对 `functions/v1/match-book` 的请求状态码和响应内容，或在 Supabase Dashboard → Edge Functions → match-book → Logs 查看报错。
