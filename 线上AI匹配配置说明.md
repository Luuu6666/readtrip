# 线上 www.readtrip.club 使用 AI 匹配的配置说明

## 为什么本地能用、线上其他用户不能用？

- **AI 匹配**走的是 **Supabase Edge Function**（`match-book`），密钥 **LOVABLE_API_KEY** 只存在 **Supabase 项目**的「Edge Function 密钥」里，**不会**也不应写在项目代码或前端的 .env 里。
- 本地能用的原因：本地 `.env` 里的 `VITE_SUPABASE_URL` 指向的 Supabase 项目（当前是 **sadwpheednlwlhegsqbp**），在 Lovable 创建/关联时已经配置过 **LOVABLE_API_KEY**，所以本地访问时调用的是「已带密钥」的同一个 Edge Function。
- 线上其他用户不能用的常见原因：
  1. **Vercel 用了不同的 Supabase**：线上环境变量和本地不一致，指向了另一个没配密钥的 Supabase 项目。
  2. **Edge Function 没部署到当前 Supabase**：例如换过项目，但 `match-book` 只部署在旧项目。
  3. **当前 Supabase 项目里没有 LOVABLE_API_KEY**：新项目或从未配置过该密钥。

按下面步骤检查/修复即可。

---

## 第一步：确认线上和本地用「同一个」Supabase 项目

1. 打开本地项目根目录的 **.env**，确认：
   - `VITE_SUPABASE_URL=https://sadwpheednlwlhegsqbp.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...`（一长串）
2. 打开 **Vercel** → 你的 readtrip 项目 → **Settings** → **Environment Variables**。
3. 确认有且与本地 **完全一致**：
   - **VITE_SUPABASE_URL** = 与 .env 相同
   - **VITE_SUPABASE_PUBLISHABLE_KEY** = 与 .env 相同  

若不一致，改成和本地一样，保存后重新部署一次。这样线上和本地都会调用**同一个** Supabase 项目，包括同一个 `match-book` 和同一份密钥。

---

## 第二步：在「这个」Supabase 项目里确认 Edge Function 和密钥

你当前用的是项目 **sadwpheednlwlhegsqbp**（见 .env 和 supabase/config.toml）。

1. 打开 [Supabase Dashboard](https://app.supabase.com) → 选择项目 **sadwpheednlwlhegsqbp**（若你改过 .env，就选 .env 里 URL 对应的那个项目）。
2. 左侧 **Edge Functions**：
   - 看是否有 **match-book**。若没有，需要在项目根目录执行：
     ```bash
     npx supabase link --project-ref sadwpheednlwlhegsqbp
     npx supabase functions deploy match-book
     ```
3. 左侧 **Edge Functions** → **Secrets**（或 **match-book** 的 Settings 里找 **Secrets**）：
   - 看是否有 **LOVABLE_API_KEY**。
   - 若**没有**：需要你从 Lovable 拿到密钥并在这里新增一条 Secret，名称为 `LOVABLE_API_KEY`，值为 Lovable 给的 API Key。
   - 若**有**：说明密钥已配好，只要第一步（Vercel 用同一 Supabase）正确，线上就会用这份密钥。

注意：Supabase 里 Secret 的值通常**不能再次查看**，只能覆盖或新增。若你从没自己配过、但本地又能用，说明是 Lovable 当初关联时配的；若你后来新建了别的 Supabase 项目给线上用，就需要在那个新项目里也部署 `match-book` 并配置 **LOVABLE_API_KEY**。

---

## 第三步：Lovable 密钥从哪里来（若当前项目没有 LOVABLE_API_KEY）

- 项目若来自 **Lovable**，密钥一般由 Lovable 在「其关联的 Supabase 项目」里配置好，**不会**出现在你下载下来的代码或 .env 里。
- 若你需要在**另一个** Supabase 项目里配置（例如自己新建的 readtrip 项目）：
  1. 登录 [Lovable](https://lovable.dev)，打开当时生成 readtrip 的项目（或账号设置）。
  2. 在 **Settings / Developer tools / API / Integrations** 等位置查找 **API Key**、**AI gateway key**、**Lovable API** 等，复制密钥。
  3. 在目标 Supabase 项目的 **Edge Functions → Secrets** 里新增 **LOVABLE_API_KEY**，粘贴该值并保存。
  4. 确保该 Supabase 项目已部署 **match-book**（同上 `supabase functions deploy match-book`）。

若 Lovable 界面里找不到密钥，需要联系 Lovable 支持或查看其文档说明「如何在自建/导出项目中继续使用 AI 能力」。

---

## 小结检查清单

| 检查项 | 说明 |
|--------|------|
| Vercel 的 VITE_SUPABASE_URL | 与本地 .env 完全一致（同一 Supabase 项目） |
| Vercel 的 VITE_SUPABASE_PUBLISHABLE_KEY | 与本地 .env 完全一致 |
| Supabase 中已部署 match-book | Edge Functions 列表里有 match-book |
| Supabase 中已设 LOVABLE_API_KEY | Edge Functions → Secrets 里有该键 |

**结论**：项目里**没有**也**不应**保存 Lovable 的 API 密钥；密钥只在 Supabase 的 Edge Function Secrets 里。让线上和本地使用**同一个** Supabase 项目（通过 Vercel 环境变量与 .env 一致），并在该项目中确认 **match-book** 已部署且 **LOVABLE_API_KEY** 已配置，线上用户即可正常使用 AI 匹配。
