# 让 www.readtrip.club 用户也能用 AI 书籍匹配 — 修复步骤

## 两种 AI 密钥方式（二选一即可）

| 方式 | 密钥名 | 说明 |
|------|--------|------|
| **推荐** | **GEMINI_API_KEY** | 使用你自己的 [Google Gemini API Key](https://aistudio.google.com/apikey)，不依赖 Lovable，适合线上让所有用户使用。 |
| 原有 | LOVABLE_API_KEY | Lovable 提供的密钥；若在 Lovable 上找不到 API Key，可改用上面的 Gemini 方式。 |

**优先使用 GEMINI_API_KEY**：若在 Supabase 的 Edge Function Secrets 里配置了 `GEMINI_API_KEY`，会优先用 Google 官方 Gemini API；未配置时再使用 `LOVABLE_API_KEY`。本地若已配 LOVABLE_API_KEY 可继续用；线上建议配置 GEMINI_API_KEY。

本地能用的原因：本地调用的是**同一个** Supabase 项目（`sadwpheednlwlhegsqbp`），且该项目的 Edge Function `match-book` 里已配置了 LOVABLE_API_KEY 或 GEMINI_API_KEY。  
线上其他用户不能用，通常是**线上环境没有指向这个 Supabase**，或**该 Supabase 里没部署/没配密钥**。按下面步骤逐项检查即可。

---

## 第一步：让线上和本地用「同一个」Supabase 项目

你本地 `.env` 里是：

- `VITE_SUPABASE_URL=https://sadwpheednlwlhegsqbp.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGci...`（一长串）

**在 Vercel（www.readtrip.club 的部署）里：**

1. 打开 [Vercel Dashboard](https://vercel.com) → 找到 **readtrip** 项目（或对应 www.readtrip.club 的项目）。
2. 进入 **Settings** → **Environment Variables**。
3. 确认存在且与本地**完全一致**（包括 Production / Preview / Development 看你要生效的环境）：
   - **VITE_SUPABASE_URL** = `https://sadwpheednlwlhegsqbp.supabase.co`
   - **VITE_SUPABASE_PUBLISHABLE_KEY** = 与本地 `.env` 里 `VITE_SUPABASE_PUBLISHABLE_KEY` 相同

若不一致或缺失，请添加/修改为与本地相同，保存后**重新部署**一次（Deployments → 最新部署右侧 ⋮ → Redeploy）。

---

## 第二步：确认 Supabase 里已部署 match-book 并配有密钥

你当前用的是 Supabase 项目 **sadwpheednlwlhegsqbp**。

1. 打开 [Supabase Dashboard](https://app.supabase.com) → 选择项目 **sadwpheednlwlhegsqbp**。
2. 左侧 **Edge Functions**：
   - 列表中是否有 **match-book**？
   - **若没有**：在项目根目录执行：
     ```bash
     npx supabase link --project-ref sadwpheednlwlhegsqbp
     npx supabase functions deploy match-book
     ```
   - 若已存在，可跳过部署。
3. 在同一项目的 **Edge Functions** 里找到 **Secrets**（或 **match-book** 的 Settings → Secrets）：
   - **推荐**：新增 **GEMINI_API_KEY**（你提供的 Gemini API Key）  
     - 获取方式：打开 [Google AI Studio](https://aistudio.google.com/apikey) → 创建 API Key，复制后粘贴到 Supabase Secrets，名称为 `GEMINI_API_KEY`。  
     - 配置后线上会优先用 Google Gemini API，所有用户均可使用 AI 匹配，且不依赖 Lovable。
   - 或保留/配置 **LOVABLE_API_KEY**：若在 Lovable 能拿到密钥可继续使用；若找不到，用上面的 GEMINI_API_KEY 即可。
   - 配置或修改 Secrets 后需重新部署 **match-book**（见第四步）。

---

## 第三步：用 Gemini API Key（推荐，无需 Lovable）

- 在 [Google AI Studio](https://aistudio.google.com/apikey) 创建 API Key（Gemini API Key）。
- 在 Supabase 项目 **Edge Functions → Secrets** 里新增一条：
  - **Name**：`GEMINI_API_KEY`
  - **Value**：粘贴你的 Gemini API Key
- 保存后重新部署 **match-book**（见第四步）。
- 可选：若想换模型，可再增加 Secret **GEMINI_MODEL**，例如 `gemini-1.5-flash` 或 `gemini-2.0-flash`（默认已使用 `gemini-2.0-flash`）。

这样 www.readtrip.club 上的所有用户都会通过你的 Gemini 配额使用 AI 书籍匹配，无需 Lovable 密钥。

---

## 第四步：重新部署并验证

1. **Supabase**：若新增或修改了 **GEMINI_API_KEY**（或其它 Secrets），需重新部署 Edge Function。在项目根目录执行：
   ```bash
   npx supabase functions deploy match-book
   ```
2. **Vercel**：若修改了前端环境变量，保存后在 **Deployments** 里对最新部署做 **Redeploy**（或推一次代码触发部署）。
3. 打开 https://www.readtrip.club，用「添加书籍」→ 输入书名 → 点「AI 匹配」，看是否正常返回书籍信息。
4. 若仍失败：
   - 浏览器 F12 → Network，找到对 `functions/v1/match-book` 的请求，看响应状态码和 body 里的错误信息。
   - Supabase Dashboard → Edge Functions → **match-book** → **Logs**，看是否有 500/429/402 或 "AI服务未配置" 等报错。

---

## 小结检查清单

| 检查项 | 说明 |
|--------|------|
| Vercel 的 VITE_SUPABASE_URL | 与本地 .env 完全一致：`https://sadwpheednlwlhegsqbp.supabase.co` |
| Vercel 的 VITE_SUPABASE_PUBLISHABLE_KEY | 与本地 .env 完全一致 |
| Supabase 中已部署 match-book | Edge Functions 列表里有 match-book |
| Supabase 中已设 **GEMINI_API_KEY**（或 LOVABLE_API_KEY） | Edge Functions → Secrets 里至少配置其一 |
| 修改后已重新部署 | 改过 Secrets 或代码后需 Redeploy match-book；Vercel 改过变量需 Redeploy 前端 |

按上述步骤做完后，www.readtrip.club 上的用户应能正常使用 AI 书籍匹配。**推荐在 Supabase 中配置 GEMINI_API_KEY**（[在此申请](https://aistudio.google.com/apikey)），无需 Lovable。若仍有问题，把浏览器 Network 里 match-book 的响应和 Supabase 里 match-book 的 Logs 贴出来即可进一步排查。
