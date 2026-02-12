# www.readtrip.club「加载云端数据失败」/「保存到云端失败，已保存到本地」排查

## 表名区分本地 / 线上

- **本地**：使用表 `reading_records`（不设环境变量时默认）。
- **线上（www.readtrip.club）**：使用表 `reading_records_online`，需同时满足：
  1. 在**线上所用的 Supabase 项目**里执行 **`supabase/migrations/002_create_reading_records_online.sql`**（建表 `reading_records_online`）。
  2. 在 Vercel（或部署平台）为该站点配置环境变量 **`VITE_READING_TABLE=reading_records_online`**，并重新部署。

这样本地和线上的数据会落在不同表名，便于区分。

## 原因说明

- **加载云端数据失败**：登录后从 Supabase 表 `reading_records` 拉取数据失败（多为表不存在或权限问题）。
- **保存到云端失败，已保存到本地**：向同一张表写入失败。

也就是说：**www.readtrip.club 连的是哪个 Supabase 项目，就必须在「那一个」项目里建好 `reading_records` 表**。  
若你在「别的」项目里执行过建表 SQL，对 readtrip.club 无效。

---

## 第一步：确认 www.readtrip.club 用的是哪个项目

1. 打开你部署 readtrip.club 的平台（如 Vercel）→ 该项目的 **Environment Variables**。
2. 看 **VITE_SUPABASE_URL** 的值：
   - 若是 `https://kmvxcrjvhvkylypkirew.supabase.co` → 项目 **Reference ID** 就是 **kmvxcrjvhvkylypkirew**。
   - 若是 `https://其他一串.supabase.co` → 那「其他一串」才是你要操作的项目。

**务必在下面步骤里选这个项目**，不要选错（例如不要选成名称叫 "readtrip" 但 Reference ID 不同的项目）。

---

## 第二步：在「这个」项目里建表 + RLS

### 1. 打开该项目的 SQL Editor

1. 打开 [Supabase Dashboard](https://app.supabase.com)
2. 在左侧项目列表里选择 **Reference ID = 上面确认的那一串** 的项目（例如 **kmvxcrjvhvkylypkirew**）。  
   - 若不确定：点进项目 → **Project Settings** → **General** → 看 **Reference ID**。
3. 左侧进入 **SQL Editor**

### 2. 执行建表与 RLS 的 SQL

- **推荐：线上用独立表名**  
  在 SQL Editor 中打开并执行项目里的 **`supabase/migrations/002_create_reading_records_online.sql`**（建表 `reading_records_online`）。  
  然后在 Vercel 为该站点添加环境变量 **`VITE_READING_TABLE=reading_records_online`**，保存后重新部署。
- **或：使用默认表名**  
  在 SQL Editor 里**新建查询**，粘贴下面整段 SQL，然后点击 **Run**（表名为 `reading_records`，无需设置 `VITE_READING_TABLE`）：

```sql
-- 创建阅读记录表（默认表名）
CREATE TABLE IF NOT EXISTS reading_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_title TEXT NOT NULL,
  book_author TEXT NOT NULL,
  book_cover_url TEXT,
  book_genre TEXT,
  book_country TEXT NOT NULL,
  book_country_code TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  review TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reading_records_user_id ON reading_records(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_records_country_code ON reading_records(book_country_code);
CREATE INDEX IF NOT EXISTS idx_reading_records_created_at ON reading_records(created_at DESC);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_reading_records_updated_at ON reading_records;
CREATE TRIGGER update_reading_records_updated_at
  BEFORE UPDATE ON reading_records
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

ALTER TABLE reading_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own records" ON reading_records;
CREATE POLICY "Users can view their own records"
  ON reading_records FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own records" ON reading_records;
CREATE POLICY "Users can insert their own records"
  ON reading_records FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own records" ON reading_records;
CREATE POLICY "Users can update their own records"
  ON reading_records FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own records" ON reading_records;
CREATE POLICY "Users can delete their own records"
  ON reading_records FOR DELETE USING (auth.uid() = user_id);
```

执行成功后会提示类似 “Success. No rows returned”。

### 3. 可选：开启多设备实时同步

在 **Database** → **Replication** 里找到表 `reading_records`，打开 **Realtime**。  
不开启也可以正常云端保存，只是多设备要刷新才能看到更新。

### 3. 验证表是否建好

1. 在同一个项目里，左侧打开 **Table Editor**。
2. 在表列表中应能看到 **reading_records**。
3. 若没有，说明 SQL 没在本项目执行成功，或执行在了别的项目，请回到第二步确认项目后再执行一次 SQL。

### 4. 再在 www.readtrip.club 上试一次

- 刷新或重新打开 https://www.readtrip.club ，登录账号。
- 若之前只改了 Supabase、没改 Vercel：无需重新部署，直接试即可。
- 若你刚在 Vercel 改过 **VITE_SUPABASE_URL** / **VITE_SUPABASE_PUBLISHABLE_KEY**：保存后需 **Redeploy** 一次，再访问试。

正常情况：不再出现「加载云端数据失败」「保存到云端失败，已保存到本地」。  
若仍失败：浏览器按 **F12** → **Console**，看 `Failed to load from Supabase:` 或 `Failed to save to cloud:` 后面的具体报错（如 `relation "reading_records" does not exist`、`permission denied` 等），便于进一步排查。

---

## 小结

| 检查项 | 说明 |
|--------|------|
| 项目是否选对 | 必须选 **VITE_SUPABASE_URL 里域名中间那串** 对应的项目（如 kmvxcrjvhvkylypkirew） |
| 必须存在的表 | 在该项目的 **Table Editor** 里能看到 **reading_records** |
| 操作位置 | 该项目的 **SQL Editor** 中执行上述整段 SQL 一次 |

执行完建表 + RLS 并在 Table Editor 中确认有 `reading_records` 后，www.readtrip.club 的加载与保存就会正常。
