# Email-Manager 测试指南

## 启动应用

双击运行 `workspace/backend/dist/EmailManager.exe`

> 后端服务将在 `http://127.0.0.1:8000` 启动并自动打开桌面窗口

---

## Gmail 配置

1. 登录 Gmail → 设置 → 转发和 POP/IMAP
2. 启用 IMAP
3. 生成应用密码（需开启2FA）:
   - 访问 [Google 应用密码](https://myaccount.google.com/apppasswords)
   - 创建新密码
4. 在 Email-Manager 设置中填入:
   - 服务器: `imap.gmail.com`
   - 邮箱: 你的Gmail地址
   - 密码: 应用密码（16位）

---

## Outlook/Office365 配置

1. 在 Email-Manager 设置中填入:
   - 服务器: `outlook.office365.com`
   - 邮箱: 你的Outlook地址
   - 密码: 账户密码或应用密码

---

## 验证步骤

1. 配置完成后点击「测试连接」
2. 点击「同步」拉取邮件
3. 检查邮件列表是否更新

## AI 处理验证

1. 打开设置 → AI模式选择
2. 配置本地Ollama或API密钥
3. 同步新邮件后查看AI摘要是否生成
