# 小本本 · 跨设备同步配置 (Supabase)

## 第一步：注册 Supabase

1. 打开 https://supabase.com ，点击「Start your project」
2. 用 GitHub 账号登录（你已经有 GitHub 账号）
3. 创建新项目：
   - 项目名称填 `xiaobenben`
   - 设置数据库密码（记下来）
   - Region 选择靠近中国的区域（如 Singapore 或 Tokyo）
   - 点击「Create new project」
4. 等待 1-2 分钟项目创建完成

## 第二步：获取 Project URL 和 anon key

1. 项目创建完成后，进入 Settings → API
2. 复制 **Project URL**（格式如 `https://xxx.supabase.co`）
3. 复制 **anon public key**（在 Project API keys 一栏）

## 第三步：创建数据表

1. 在左侧菜单点击 **SQL Editor**
2. 点击「New Query」
3. 粘贴以下 SQL 并运行：

```sql
CREATE TABLE sync_rooms (
  token TEXT PRIMARY KEY,
  data JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE sync_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY anon_access ON sync_rooms
  FOR ALL TO anon USING (true) WITH CHECK (true);
```

4. 运行成功后，表就创建好了

## 第四步：上传文件到 GitHub Pages

把 `outputs/notes/` 文件夹下的所有文件上传到你的 GitHub Pages 仓库：

- `index.html`
- `app.js`
- `sync.js`
- `style.css`
- `qrcode.html`
- `qrcode.png`

## 第五步：手机和电脑同步

1. 在手机浏览器打开你的小本本网站
2. 点击底部 **⚡ 同步** 标签
3. 填入 Supabase 的 Project URL 和 anon key
4. 同步令牌输入一个你自己定的口令（比如 `my123`）
5. 点击「连接」，状态变为 🟢 已连接
6. **在电脑上重复步骤 1-5，令牌填同一个**
7. 两边都连接后，任意一端保存数据，另一端会在 3 秒内自动同步

## 注意事项

- Supabase 免费版包含 500MB 数据库空间，个人使用完全足够
- 令牌相当于房间号，只有相同令牌的设备才能互相同步
- 数据通过轮询同步（每 3 秒检查一次），非实时推送但体验流畅
- 免费版每天 50,000 次请求，个人使用绰绰有余
