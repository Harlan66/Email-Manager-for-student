/**
 * Sync progress modal component.
 * Shows real-time progress during email sync with progress bar.
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, Mail, X, RefreshCw } from 'lucide-react';
import { URGENCY_COLORS } from '@/types';
import { syncEmailsWithProgress } from '@/services/api';
import type { SyncProgress } from '@/services/api';

interface SyncProgressModalProps {
    isOpen: boolean;
    onComplete: (result: { success: boolean; message: string; synced: number; processed: number }) => void;
    days?: number;
    forceFirst?: boolean;
}

type SyncStatus = 'connecting' | 'fetching' | 'syncing' | 'complete' | 'error';

export function SyncProgressModal({ isOpen, onComplete, days = 90, forceFirst = false }: SyncProgressModalProps) {
    console.log('[SyncProgressModal] render, isOpen:', isOpen);
    const [status, setStatus] = useState<SyncStatus>('connecting');
    const [message, setMessage] = useState('正在连接邮箱...');
    const [progress, setProgress] = useState<SyncProgress | null>(null);
    const [result, setResult] = useState<{ synced: number; processed: number } | null>(null);
    const syncStarted = useRef(false);

    const doSync = useCallback(async () => {
        if (syncStarted.current) return;
        syncStarted.current = true;

        setStatus('connecting');
        setMessage('正在连接邮箱...');
        setProgress(null);
        setResult(null);

        await syncEmailsWithProgress(days, {
            onStatus: (statusStr, msg) => {
                console.log('[SyncProgressModal] status:', statusStr, msg);
                setStatus(statusStr as SyncStatus);
                setMessage(msg);
            },
            onProgress: (prog) => {
                console.log('[SyncProgressModal] progress:', prog);
                setStatus('syncing');
                setProgress(prog);
                setMessage(prog.message);
            },
            onComplete: (res) => {
                console.log('[SyncProgressModal] complete:', res);
                setStatus('complete');
                setMessage(res.message);
                setResult({ synced: res.emails_synced, processed: res.emails_processed });
            },
            onError: (errMsg) => {
                console.log('[SyncProgressModal] error:', errMsg);
                setStatus('error');
                setMessage(errMsg);
            }
        }, forceFirst);
    }, [days, forceFirst]);

    useEffect(() => {
        if (isOpen) {
            syncStarted.current = false;
            doSync();
        }
    }, [isOpen, doSync]);

    const handleClose = () => {
        syncStarted.current = false;  // Reset so next open can sync again
        onComplete({
            success: status === 'complete',
            message,
            synced: result?.synced ?? 0,
            processed: result?.processed ?? 0,
        });
    };

    const handleRetry = () => {
        syncStarted.current = false;
        doSync();
    };

    const getStatusIcon = () => {
        switch (status) {
            case 'connecting':
            case 'fetching':
            case 'syncing':
                return <Loader2 className="w-6 h-6 animate-spin" style={{ color: URGENCY_COLORS.indigo.main }} />;
            case 'complete':
                return <CheckCircle className="w-6 h-6" style={{ color: URGENCY_COLORS.normal.main }} />;
            case 'error':
                return <XCircle className="w-6 h-6" style={{ color: URGENCY_COLORS.urgent.main }} />;
        }
    };

    const getStatusText = () => {
        switch (status) {
            case 'connecting':
                return '正在连接...';
            case 'fetching':
                return '正在获取邮件列表...';
            case 'syncing':
                return '正在同步...';
            case 'complete':
                return '同步完成';
            case 'error':
                return '同步失败';
        }
    };

    // Calculate progress percentage
    const progressPercent = progress ? Math.round((progress.current / progress.total) * 100) : 0;

    return (
        <Dialog open={isOpen}>
            <DialogContent className="sm:max-w-md" style={{ backgroundColor: 'var(--ivory-white)' }}>
                {/* Close button in top-right corner */}
                <button
                    onClick={handleClose}
                    className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
                    aria-label="Close"
                >
                    <X className="h-4 w-4" />
                </button>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: 'rgba(122, 154, 168, 0.12)' }}
                        >
                            <Mail className="w-5 h-5" style={{ color: URGENCY_COLORS.indigo.main }} />
                        </div>
                        邮件同步
                    </DialogTitle>
                    <DialogDescription className="text-xs text-gray-500">
                        正在同步您的邮件，请稍候...
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Status */}
                    <div className="flex items-center gap-3">
                        {getStatusIcon()}
                        <span className="text-sm font-medium">{getStatusText()}</span>
                    </div>

                    {/* Progress bar */}
                    {(status === 'connecting' || status === 'fetching') && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs" style={{ color: 'var(--light-ink)' }}>
                                <span>准备中...</span>
                            </div>
                            <div
                                className="h-2 rounded-full overflow-hidden"
                                style={{ backgroundColor: 'rgba(122, 154, 168, 0.12)' }}
                            >
                                <div
                                    className="h-full rounded-full animate-pulse"
                                    style={{
                                        width: '60%',
                                        backgroundColor: URGENCY_COLORS.indigo.main,
                                        animation: 'indeterminate 1.5s ease-in-out infinite'
                                    }}
                                />
                            </div>
                        </div>
                    )}
                    {progress && status === 'syncing' && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs" style={{ color: 'var(--light-ink)' }}>
                                <span>{progress.current} / {progress.total}</span>
                                <span>{progressPercent}%</span>
                            </div>
                            <div
                                className="h-2 rounded-full overflow-hidden"
                                style={{ backgroundColor: 'rgba(122, 154, 168, 0.12)' }}
                            >
                                <div
                                    className="h-full rounded-full transition-all duration-300 ease-out"
                                    style={{
                                        width: `${progressPercent}%`,
                                        backgroundColor: URGENCY_COLORS.indigo.main
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Message */}
                    <p className="text-sm truncate" style={{ color: 'var(--dry-ink)' }} title={message}>
                        {message}
                    </p>

                    {/* Stats during sync */}
                    {progress && (
                        <div className="flex gap-4 text-xs" style={{ color: 'var(--light-ink)' }}>
                            <span>新增: {progress.synced} 封</span>
                            <span>AI处理: {progress.processed} 封</span>
                        </div>
                    )}

                    {/* Result stats */}
                    {result && status === 'complete' && (
                        <div className="flex gap-4 text-xs" style={{ color: 'var(--light-ink)' }}>
                            <span>新增: {result.synced} 封</span>
                            <span>AI处理: {result.processed} 封</span>
                        </div>
                    )}

                    {/* Close/Retry buttons */}
                    {status === 'complete' && (
                        <Button
                            onClick={handleClose}
                            className="w-full h-10 rounded-xl text-white"
                            style={{ backgroundColor: URGENCY_COLORS.indigo.main }}
                        >
                            确定
                        </Button>
                    )}
                    {status === 'error' && (
                        <div className="flex gap-2">
                            <Button
                                onClick={handleRetry}
                                className="flex-1 h-10 rounded-xl text-white"
                                style={{ backgroundColor: URGENCY_COLORS.indigo.main }}
                            >
                                <RefreshCw className="w-4 h-4 mr-1.5" />
                                重试
                            </Button>
                            <Button
                                onClick={handleClose}
                                variant="outline"
                                className="flex-1 h-10 rounded-xl"
                            >
                                关闭
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
