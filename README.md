# Email-Manager (学生邮箱智能助手)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.9+-blue.svg)
![React](https://img.shields.io/badge/react-18+-blue.svg)

专为学生设计的智能邮件管理客户端，结合本地 AI (Ollama) 和云端大模型，提供隐私优先的邮件分类、摘要和 DDL 提取功能。

## ✨ 核心特性

- **🔒 隐私优先**: 支持纯本地模型 (Ollama/Llama 3)，敏感邮件绝不上传云端。
- **🧠 智能混合模式**: 简单任务本地处理，复杂任务云端处理，平衡隐私与性能。
- **📅 DDL 提取**: 自动识别邮件中的截止日期，生成日历视图和倒计时提醒。
- **📝 智能摘要**: 一键生成中/英文邮件摘要，告别长文阅读焦虑。
- **🎨 东方美学 UI**:精心设计的"新中式"界面，支持深色模式。
- **⚡ 一键部署**: 提供 Windows 单文件执行程序，开箱即用。

## 🚀 快速开始

### 下载运行

1. 下载最新发布的 `EmailManager.exe`。
2. 双击运行，程序会自动启动本地服务并打开界面。
3. 在设置面板中配置您的学生邮箱 (IMAP) 和 AI 偏好。

### 开发环境搭建

**前置要求**:
- Python 3.9+
- Node.js 16+
- Ollama (可选，用于本地 AI)

1. **克隆仓库**
   ```bash
   git clone https://github.com/Start-Spark/Email-Manager-for-student.git
   cd Email-Manager-for-student/workspace
   ```

2. **后端设置**
   ```bash
   cd backend
   pip install -r requirements.txt
   python run.py
   ```

3. **前端设置**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## ⚙️ 配置说明

### 邮箱配置 (IMAP)
- **Gmail**: 需要在 Google 账户设置中开启 IMAP 并生成[应用专用密码](https://support.google.com/accounts/answer/185833)。
- **Outlook/Office365**: 使用 `outlook.office365.com`，通常直接支持登录。

### AI 模型配置
- **本地模式**: 安装 [Ollama](https://ollama.com/) 并拉取模型 (e.g., `ollama pull llama3`)。
- **API 模式**: 支持 OpenAI, Anthropic, DeepSeek, 智谱 GLM 等主流服务商。

## 📦 构建发行版

项目包含一键打包脚本，可生成独立的 `.exe` 文件。

```bash
# 确保已安装 PyInstaller
pip install pyinstaller

# 在 workspace 目录下运行
python build.py
```

构建产物位于 `workspace/backend/dist/EmailManager.exe`。

## 🛠️ 技术栈

- **Frontend**: React, TypeScript, Vite, TailwindCSS, Shadcn UI
- **Backend**: FastAPI, SQLite, Pydantic
- **Desktop**: PyWebView
- **AI**: Ollama (Local), OpenAI SDK (Cloud)

## 📄 许可证

MIT License