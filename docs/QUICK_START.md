# Email-Manager 快速开始指南

## 1. 启动应用

双击运行 `workspace/backend/dist/EmailManager.exe`

## 2. 配置邮箱

打开设置面板，填入IMAP配置：

| 邮箱服务 | 服务器 | 端口 |
|---------|--------|------|
| Gmail | imap.gmail.com | 993 |
| Outlook | outlook.office365.com | 993 |
| QQ邮箱 | imap.qq.com | 993 |

> ⚠️ Gmail需使用应用密码（非登录密码）

## 3. 选择AI模式

应用内置智能调度模块，支持三种模式：

- **本地模式**: 使用Ollama本地处理，零网络请求
- **API模式**: 使用云端API，高准确率
- **混合模式**: 简单任务本地，复杂任务API（推荐）

### 2. 本地AI模型配置 (Ollama)
**✨ 隐私保护推荐**
1. 下载并安装 [Ollama](https://ollama.com/)
2. 在终端运行模型：`ollama pull llama3.1:8b`
3. 在应用设置中选择「本地」模式

### API模式配置

1. 在设置中选择「API」模式
2. 选择服务商（OpenAI/DeepSeek/智谱等）
3. 填入API Key
4. 点击「测试连接」

## 4. 同步邮件

点击顶部「同步」按钮拉取邮件
