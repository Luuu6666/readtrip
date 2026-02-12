-- 创建阅读记录表
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

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_reading_records_user_id ON reading_records(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_records_country_code ON reading_records(book_country_code);
CREATE INDEX IF NOT EXISTS idx_reading_records_created_at ON reading_records(created_at DESC);

-- 创建更新时间触发器
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

-- 启用 RLS
ALTER TABLE reading_records ENABLE ROW LEVEL SECURITY;

-- 策略1：用户只能查看自己的记录
DROP POLICY IF EXISTS "Users can view their own records" ON reading_records;
CREATE POLICY "Users can view their own records"
  ON reading_records
  FOR SELECT
  USING (auth.uid() = user_id);

-- 策略2：用户只能插入自己的记录
DROP POLICY IF EXISTS "Users can insert their own records" ON reading_records;
CREATE POLICY "Users can insert their own records"
  ON reading_records
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 策略3：用户只能更新自己的记录
DROP POLICY IF EXISTS "Users can update their own records" ON reading_records;
CREATE POLICY "Users can update their own records"
  ON reading_records
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 策略4：用户只能删除自己的记录
DROP POLICY IF EXISTS "Users can delete their own records" ON reading_records;
CREATE POLICY "Users can delete their own records"
  ON reading_records
  FOR DELETE
  USING (auth.uid() = user_id);
