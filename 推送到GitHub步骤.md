# 把阅迹项目推送到 GitHub

## 第一步：在 GitHub 上新建仓库

1. 打开 [github.com](https://github.com)，登录你的账号。
2. 右上角点击 **+** → **New repository**。
3. 填写：
   - **Repository name**：例如 `readtrip` 或 `readtrip-journey-maker`
   - **Description**（可选）：阅迹 ReadTrip - 记录阅读足迹，点亮世界地图
   - 选择 **Public**
   - **不要**勾选 "Add a README file"（项目里已有文件）
4. 点击 **Create repository**。
5. 创建完成后，页面上会显示仓库地址，例如：
   - `https://github.com/你的用户名/readtrip.git`
   - 或 SSH：`git@github.com:你的用户名/readtrip.git`
   **先复制这个地址，下面会用到。**

---

## 第二步：在本地提交并推送

在终端里进入项目目录，按顺序执行：

### 1. 添加并提交当前所有改动

```bash
cd /Users/luuuwu/Downloads/readtrip-journey-maker-main

# 添加所有文件（.gitignore 里排除的不会加入，如 node_modules、.env）
git add .

# 提交
git commit -m "feat: 阅迹 - 用户账户、云端同步、多设备访问与发布配置"
```

### 2. 把 GitHub 仓库设为远程并推送

**把下面命令里的 `你的用户名` 和 `readtrip` 换成你刚建的仓库信息：**

```bash
# 添加远程仓库（HTTPS 方式，推荐）
git remote add origin https://github.com/你的用户名/readtrip.git

# 推送到 GitHub（首次推送 main 分支）
git push -u origin main
```

如果 GitHub 仓库名不是 `readtrip`，就把上面的 `readtrip` 改成你的仓库名。

### 3. 输入 GitHub 凭据

- 使用 **HTTPS** 时，可能会提示输入 GitHub 用户名和密码；  
  **密码**要填你在 GitHub 里生成的 **Personal Access Token**，不是登录密码。  
  生成 Token：GitHub → Settings → Developer settings → Personal access tokens → Generate new token，勾选 `repo` 权限。
- 若已配置 **SSH 密钥**，可以用 SSH 地址代替：
  ```bash
  git remote add origin git@github.com:你的用户名/readtrip.git
  git push -u origin main
  ```

---

## 第三步：确认

推送成功后，刷新 GitHub 上的仓库页面，应能看到所有代码。之后每次改完代码可以这样提交并推送：

```bash
git add .
git commit -m "简短描述你的修改"
git push
```

---

## 常见问题

**Q: 提示 "remote origin already exists"**  
说明已经加过远程，先删掉再加：
```bash
git remote remove origin
git remote add origin https://github.com/你的用户名/readtrip.git
```

**Q: 分支名是 master 而不是 main**  
先查看当前分支：`git branch`。若是 master，可以改成本地 main 再推送：
```bash
git branch -M main
git remote add origin https://github.com/你的用户名/readtrip.git
git push -u origin main
```

**Q: 不想把 .env 推上去**  
本项目已在 `.gitignore` 中加入 `.env`，`git add .` 不会包含环境变量文件，密钥不会误推到 GitHub。部署时在 Vercel 等平台后台单独配置环境变量即可。
