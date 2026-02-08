# 邮件同步优化规则

## 问题背景

在邮件同步过程中,可能会遇到 `[OVERQUOTA] Account exceeded command or bandwidth limits` 错误。这是因为邮件服务器(如 Gmail、Outlook 等)对 IMAP 客户端的请求频率和带宽进行了限制。

## 优化策略

### 1. 首次同步策略 (First Sync)

**适用场景**: 第一次使用该应用,或从未成功同步过邮件时。

**配置参数**:
```yaml
sync:
  first_sync:
    days: 7                          # 只获取最近 7 天的邮件
    batch_size: 10                    # 每批次获取 10 封邮件
    delay_between_batches_ms: 500     # 批次之间延迟 500 毫秒
```

**设计理念**:
- **保守策略**: 首次同步采用更保守的参数,避免触发服务器限制
- **小批量**: 每批次只获取 10 封邮件,降低单次请求的数据量
- **慢节奏**: 批次之间有 500ms 延迟,给服务器喘息时间
- **时间限制**: 只获取最近 7 天的邮件,避免历史邮件过多

### 2. 增量同步策略 (Incremental Sync)

**适用场景**: 已经成功同步过至少一次后的后续同步。

**配置参数**:
```yaml
sync:
  incremental_sync:
    days: 3                           # 只检查最近 3 天的邮件
    batch_size: 20                    # 每批次获取 20 封邮件
    delay_between_batches_ms: 200     # 批次之间延迟 200 毫秒
```

**设计理念**:
- **高效策略**: 增量同步可以使用更激进的参数
- **中批量**: 每批次 20 封邮件,提高同步效率
- **快节奏**: 批次延迟减少到 200ms
- **短时间窗口**: 只检查最近 3 天,因为旧邮件已经同步过

### 3. 通用限制

```yaml
sync:
  max_emails_per_sync: 200  # 单次同步最多处理 200 封邮件
```

即使有更多新邮件,也会限制在 200 封以内,避免单次同步时间过长。

## 技术实现

### 1. UID 预检机制

在实际下载邮件内容之前,先获取所有邮件的 UID (唯一标识):
```python
all_uids = imap.fetch_uids(days=days)           # 快速获取所有 UID
new_uids = [uid for uid in all_uids if not db.email_exists(uid)]  # 过滤已存在
```

**优势**:
- UID 请求极快,不消耗带宽
- 避免重复下载已存在的邮件
- 可以准确知道新邮件数量

### 2. 批次处理

将邮件分批获取和处理:
```python
for i in range(0, total, batch_size):
    batch_uids = new_uids[i:i + batch_size]
    batch_emails = imap.fetch_by_uids(batch_uids)
    # 处理这批邮件...
    await asyncio.sleep(delay_ms / 1000.0)  # 批次间延迟
```

**优势**:
- 避免单次请求过大
- 分散请求压力
- 批次间延迟防止触发限流

### 3. 同步会话跟踪

使用数据库记录每次同步的详细信息:
```python
session_id = db.create_sync_session(sync_type, days)
# ... 同步过程 ...
db.complete_sync_session(session_id, synced_count, processed_count)
```

**优势**:
- 自动判断是首次还是增量同步
- 记录同步历史供分析
- 错误时可以追溯问题

### 4. Headers-Only 模式

在某些场景下使用 `headers_only=True`:
```python
imap.fetch(criteria, headers_only=True)
```

只获取邮件头部信息,不下载正文,大幅降低带宽消耗。

## 同步流程图

```
开始同步
    ↓
检查是否首次同步?
    ↓               ↓
  是(首次)        否(增量)
    ↓               ↓
7天/批10封       3天/批20封
    ↓               ↓
获取所有 UID
    ↓
过滤已存在的邮件
    ↓
应用 max_emails 限制
    ↓
    ┌─────────批次循环─────────┐
    │ 1. 获取这批邮件          │
    │ 2. AI 处理              │
    │ 3. 保存到数据库          │
    │ 4. 更新进度             │
    │ 5. 批次间延迟           │
    └─────────────────────────┘
    ↓
完成,记录到同步历史
```

## 配置修改

配置文件位于: `~/.email-manager/config.yaml`

可以根据实际情况调整参数:

```yaml
sync:
  first_sync:
    days: 7                          # 可调整为 3-30
    batch_size: 10                    # 可调整为 5-20
    delay_between_batches_ms: 500     # 可调整为 200-1000
  incremental_sync:
    days: 3                           # 可调整为 1-7
    batch_size: 20                    # 可调整为 10-50
    delay_between_batches_ms: 200     # 可调整为 0-500
  max_emails_per_sync: 200            # 可调整为 50-500
```

**调整建议**:
- 如果经常遇到 OVERQUOTA 错误: 减小 batch_size, 增加 delay
- 如果同步速度太慢: 增大 batch_size, 减小 delay
- 如果邮件量大: 增加 days 和 max_emails_per_sync

## 故障排查

### 1. 仍然出现 OVERQUOTA 错误

**解决方案**:
1. 等待 15-60 分钟后重试 (服务器限额会自动恢复)
2. 减小 `batch_size` 到 5
3. 增加 `delay_between_batches_ms` 到 1000
4. 减小 `days` 到 3 或更少

### 2. 同步速度太慢

**解决方案**:
1. 增大 `batch_size` 到 30-50
2. 减小 `delay_between_batches_ms` 到 100 或 0
3. 注意不要过于激进,以免触发限制

### 3. 邮件未全部同步

**检查**:
- `max_emails_per_sync` 限制是否太小
- `days` 设置是否覆盖了所需的时间范围
- 查看日志中被跳过的邮件

## 监控和日志

后端日志会记录详细的同步过程:

```
SSE: 150 total emails, 45 new emails to process (sync_type=incremental_sync)
Found 150 total emails, 45 are new
Sync complete: 45 new emails, 42 AI processed
```

数据库 `sync_history` 表记录所有同步会话:
- `sync_type`: 同步类型 (first_sync / incremental_sync)
- `days_range`: 时间范围
- `emails_synced`: 实际同步的邮件数
- `status`: 状态 (in_progress / completed / failed)
- `error_message`: 错误信息(如有)

可以通过查询该表分析同步性能和问题。
