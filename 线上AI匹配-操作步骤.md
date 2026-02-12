# 让 www.readtrip.club 能用 AI 匹配 — 一步步操作

按顺序做，做完一步再做下一步。

---

## 第 1 步：看本地的 Supabase 配置

1. 在电脑上打开项目文件夹，找到根目录的 **.env** 文件（用记事本或 VS Code 打开）。
2. 记下或复制这两行的**整段内容**（等会要填到 Vercel）：
   - `VITE_SUPABASE_URL=` 后面的地址（例如 `https://sadwpheednlwlhegsqbp.supabase.co`）
   - `VITE_SUPABASE_PUBLISHABLE_KEY=` 后面的那一长串（以 `eyJ` 开头）

---

## 第 2 步：在 Vercel 里填同样的配置

1. 打开浏览器，登录 [vercel.com](https://vercel.com)。
2. 找到并点进你的 **readtrip** 项目。
3. 点顶部的 **Settings**。
4. 左侧点 **Environment Variables**。
5. 检查是否已有 **VITE_SUPABASE_URL** 和 **VITE_SUPABASE_PUBLISHABLE_KEY**：
   - **若有**：点右侧的 Edit，把 Value 改成和本地 .env 里**完全一致**（从 .env 复制粘贴过来），然后 Save。
   - **若没有**：点 **Add New**：
     - 第一个：Name 填 `VITE_SUPABASE_URL`，Value 填 .env 里的那一整段 URL，选 Environment 勾选 Production（和 Preview 如需），Save。
     - 再 Add New 一个：Name 填 `VITE_SUPABASE_PUBLISHABLE_KEY`，Value 填 .env 里那一长串 key，同样勾选 Production（和 Preview），Save。
6. 保存后，点顶部 **Deployments**，在最新一次部署右侧点 **⋯** → **Redeploy**，确认再点一次 Redeploy。等部署完成（约 1～2 分钟）。

---

## 第 3 步：确认 Supabase 里有 match-book 函数

1. 打开 [app.supabase.com](https://app.supabase.com)，登录。
2. 在项目列表里选 **sadwpheednlwlhegsqbp**（或你 .env 里 URL 对应的那个项目，例如 `https://xxxxx.supabase.co` 里的 xxxxx 就是项目 ID）。
3. 左侧菜单点 **Edge Functions**。
4. 看列表里有没有 **match-book**：
   - **有**：直接做第 4 步。
   - **没有**：在电脑上打开终端，进入项目根目录，执行：
     ```bash
     cd /Users/luuuwu/Downloads/readtrip-journey-maker-main
     npx supabase link --project-ref sadwpheednlwlhegsqbp
     ```
     提示时选 y；若问数据库密码，可先跳过（只部署函数一般不需要）。然后执行：
     ```bash
     npx supabase functions deploy match-book
     ```
     等出现 “Deployed successfully” 后再做第 4 步。

---

## 第 4 步：确认 Supabase 里已配置 LOVABLE_API_KEY

1. 还是在 Supabase 同一个项目里，左侧点 **Edge Functions**。
2. 点 **Secrets**（或 **Manage secrets** / **Environment variables**，不同版本名称可能略有不同），进入“函数密钥/环境变量”页面。
3. 看是否有一条名为 **LOVABLE_API_KEY** 的密钥：
   - **有**：说明密钥已配好，你只需确保第 2 步的 Vercel 变量和 Redeploy 都做了，然后去第 5 步测一下。
   - **没有**：需要新增一条：
     - 点 **Add new secret** 或 **New secret**。
     - Name 填：`LOVABLE_API_KEY`。
     - Value 填：你的 Lovable API 密钥（需要从 Lovable 网站获取，见下方「若没有密钥」）。
     - 保存。

**若没有密钥**：登录 [lovable.dev](https://lovable.dev)，打开你当时做 readtrip 的项目（或账号设置），在 **Settings** / **Developer tools** / **API** / **Integrations** 等位置找 **API Key** 或 **Lovable API key**，复制后贴到上面 Value。若找不到，可查 Lovable 帮助或联系其支持。

---

## 第 5 步：在线上测一次

1. 浏览器打开 **https://www.readtrip.club**（若刚 Redeploy，可先强制刷新或关掉缓存再打开）。
2. 点「记录足迹」或「添加书籍」，在书名框里输入一本书名，点「AI 匹配」或类似按钮。
3. 若几秒内能出现作者、国家等信息，说明线上 AI 匹配已正常；若仍报错，再检查第 2 步的变量是否和 .env 完全一致、第 4 步是否真的保存了 LOVABLE_API_KEY。

---

## 小结（你每一步在做什么）

| 步骤 | 你在做什么 |
|------|------------|
| 1 | 从本地 .env 抄下 Supabase 的 URL 和 key |
| 2 | 在 Vercel 里填同样的 URL 和 key，并 Redeploy，让线上和本地用同一个 Supabase |
| 3 | 在 Supabase 里确认/部署 match-book 函数 |
| 4 | 在 Supabase 里确认/添加 LOVABLE_API_KEY 密钥 |
| 5 | 在 www.readtrip.club 上试一次 AI 匹配 |

做完这 5 步，其他用户访问 www.readtrip.club 时就可以正常使用 AI 匹配了。
