# 将阅迹发布到 www.readtrip.club

你已在阿里云购买域名 **www.readtrip.club**，可以按下面任一方式把项目发布到线上。

---

## 一、推荐方式：Vercel（免费、支持自定义域名）

### 1. 准备代码仓库

确保项目在 **GitHub / GitLab / Bitbucket** 上：

```bash
# 若尚未初始化 git
git init
git add .
git commit -m "feat: 阅迹 ReadTrip 初版"
# 在 GitHub 新建仓库后
git remote add origin https://github.com/你的用户名/readtrip-journey-maker.git
git push -u origin main
```

### 2. 在 Vercel 部署

1. 打开 [vercel.com](https://vercel.com)，用 GitHub 登录。
2. 点击 **Add New** → **Project**，导入你的 **readtrip** 仓库。
3. **Build and Output Settings** 保持默认即可：
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
4. **Environment Variables** 添加（与本地 `.env` 一致）：
   - `VITE_SUPABASE_URL` = 你的 Supabase 项目 URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = 你的 Supabase anon key
5. 点击 **Deploy**，等待构建完成。  
   完成后会得到一个地址，例如：`https://xxx.vercel.app`。

### 3. 绑定域名 www.readtrip.club

1. 在 Vercel 项目里进入 **Settings** → **Domains**。
2. 在 **Domain** 输入：`www.readtrip.club`，点击 **Add**。
3. Vercel 会提示你要在域名服务商处添加 **CNAME** 记录。按提示操作：
   - 登录 **阿里云** → **域名** → 找到 **readtrip.club** → **解析设置**。
   - 添加记录：
     - **记录类型**：CNAME  
     - **主机记录**：`www`  
     - **记录值**：`cname.vercel-dns.com`（或 Vercel 页面上显示的指定值）  
     - **TTL**：10 分钟或默认
4. 保存解析，等待几分钟。回到 Vercel 的 Domains 页面，可点击 **Refresh** 或等待自动校验，状态变为 **Valid** 即生效。
5. （可选）在 Vercel 再添加根域名 `readtrip.club`，按页面提示做 A 记录或 CNAME，即可用 `https://readtrip.club` 访问。

之后访问 **https://www.readtrip.club** 即为当前项目的最新版本。

---

## 二、使用阿里云 OSS + CDN（域名同在阿里云）

若希望全部在阿里云完成托管，可以用 **对象存储 OSS** 做静态网站 + **CDN** 加速。

### 1. 本地构建

```bash
npm run build
```

产物在项目目录下的 **dist** 里。

### 2. 开通 OSS 并创建 Bucket

1. 阿里云控制台 → **对象存储 OSS** → 创建 **Bucket**。  
   - 名称自定（如 `readtrip-web`）。  
   - 地域选离用户近的。  
   - **读写权限**：公共读。  
   - 若提示可开启「静态页面」，建议开启，并设默认首页为 `index.html`。
2. 在 Bucket 内进入 **基础设置** → **静态页面**（或「静态网站托管」）：  
   - 默认首页：`index.html`  
   - 默认 404 页：可填 `index.html`（便于 SPA 路由刷新不报错）。

### 3. 上传 dist 到 OSS

- 在 OSS 控制台该 Bucket 的 **文件管理** 中，把 **dist 目录里所有文件** 上传到 Bucket 根目录（不要带 `dist` 这一层目录）。  
  或使用 **ossutil** / **ossbrowser** 批量上传。

### 4. 绑定域名 www.readtrip.club

1. 在该 Bucket 的 **传输管理** → **域名管理** 中，添加 **绑定域名**：`www.readtrip.club`。  
2. 按提示在 **阿里云 域名解析** 里为 readtrip.club 添加 **CNAME**：  
   - **主机记录**：`www`  
   - **记录值**：该 Bucket 的 OSS 外网访问域名（如 `xxx.oss-cn-hangzhou.aliyuncs.com`）。  
3. 若使用 **CDN**：先在 CDN 控制台添加加速域名 `www.readtrip.club`，源站选择该 OSS Bucket，再把域名的 CNAME 指到 CDN 提供的 CNAME，可加快访问。

### 5. SPA 路由说明

本项目是单页应用（React Router）。若直接访问或刷新子路径（如 `/xxx`），OSS 需返回 `index.html`。  
在 OSS 的「静态页面」里把 404 指向 `index.html` 即可；若没有该选项，可考虑用 **函数计算 FC** 或 **CDN 回源 404 改写** 为 200 并返回 `index.html`（按阿里云当前产品界面操作）。

---

## 三、部署后必做：Supabase 与 SEO

### 1. Supabase 登录回调域名

部署并绑定 **www.readtrip.club** 后，在 Supabase 项目 **readtrip** 中：

1. 打开 **Authentication** → **URL Configuration**。
2. **Site URL** 可设为：`https://www.readtrip.club`。
3. **Redirect URLs** 中新增：
   - `https://www.readtrip.club`
   - `https://www.readtrip.club/`
   - 若也使用根域：`https://readtrip.club`、`https://readtrip.club/`

这样用户在你线上站注册/登录后，会正确跳回 **https://www.readtrip.club**，看到的是你部署的最新界面。

### 2. 本项目的构建与路由

- **构建**：`npm run build`，输出在 **dist**。  
- **环境变量**：部署平台需配置 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_PUBLISHABLE_KEY`，否则登录和云端同步会失败。  
- **单页应用**：所有路径都应回退到 `index.html`（Vercel 默认支持；阿里云 OSS 需按上面设置 404 → index.html）。

---

## 四、简要对比

| 方式           | 难度 | 费用     | 适合场景           |
|----------------|------|----------|--------------------|
| **Vercel**     | 低   | 免费额度 | 快速上线、自动构建 |
| **阿里云 OSS** | 中   | 按量付费 | 域名已在阿里云、希望同云 |

推荐先用 **Vercel + www.readtrip.club** 上线，之后若要迁回阿里云，只需把 `dist` 再部署到 OSS 并改 DNS 即可。

完成上述任一种方式后，**www.readtrip.club** 就会指向你当前项目的最新版本；其他用户访问并注册时，也会停留在该线上地址，看到最新界面。
