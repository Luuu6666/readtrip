-- 创建「线上」阅读记录表（与 reading_records 结构相同，用于区分本地/线上环境）
CREATE TABLE IF NOT EXISTS reading_records_online (
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

CREATE INDEX IF NOT EXISTS idx_reading_records_online_user_id ON reading_records_online(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_records_online_country_code ON reading_records_online(book_country_code);
CREATE INDEX IF NOT EXISTS idx_reading_records_online_created_at ON reading_records_online(created_at DESC);

-- 若本项目未执行过 001，需先有该函数（已存在则跳过）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_reading_records_online_updated_at ON reading_records_online;
CREATE TRIGGER update_reading_records_online_updated_at
  BEFORE UPDATE ON reading_records_online
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

ALTER TABLE reading_records_online ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own records (online)" ON reading_records_online;
CREATE POLICY "Users can view their own records (online)"
  ON reading_records_online FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own records (online)" ON reading_records_online;
CREATE POLICY "Users can insert their own records (online)"
  ON reading_records_online FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own records (online)" ON reading_records_online;
CREATE POLICY "Users can update their own records (online)"
  ON reading_records_online FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own records (online)" ON reading_records_online;
CREATE POLICY "Users can delete their own records (online)"
  ON reading_records_online FOR DELETE USING (auth.uid() = user_id);
