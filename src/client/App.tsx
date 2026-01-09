import {useState, useRef, useCallback, useEffect} from 'react';
import CodeInput from './components/CodeInput';
import UserIdList from './components/UserIdList';
import LiveFeed, {FeedEntry} from './components/LiveFeed';
import ProgressBar from './components/ProgressBar';

interface LoginData {
    fid: number;
    nickname: string;
    kid: number;
    stove_lv: number;
    stove_lv_content: number;
    avatar_image: string;
    total_recharge_amount: number;
}

interface RedeemData {
    tips?: number;
}

interface KSApiResponse {
    code: number;
    msg: string;
    err_code: number | string;
    data: LoginData | RedeemData | [];
}

interface ApiResponse {
    success: boolean;
    data?: KSApiResponse;
    error?: string;
}

// Human-readable error messages for redeem errors
const REDEEM_ERROR_MESSAGES: Record<number, string> = {
    20000: 'Success',
    40005: 'Code already used by this account',
    40006: 'Stove level too low',
    40008: 'Code already claimed',
    40001: 'Invalid gift code',
    40002: 'Gift code expired',
    40003: 'Gift code not found',
    40004: 'Redemption limit reached',
    40007: 'Gift code expired',
    40009: 'Account not eligible',
};

// Errors that mean the code itself is bad - no point trying other users
const CODE_LEVEL_ERRORS = [40001, 40002, 40003, 40007];

function getRedeemErrorMessage(response: KSApiResponse): string {
    const errCode = typeof response.err_code === 'number' ? response.err_code : parseInt(response.err_code) || 0;

    // Special handling for stove level error
    if (errCode === 40006 && response.data && 'tips' in response.data) {
        return `Stove level too low (requires level ${response.data.tips})`;
    }

    // Check our known error messages
    if (REDEEM_ERROR_MESSAGES[errCode]) {
        return REDEEM_ERROR_MESSAGES[errCode];
    }

    // Fallback to API message or generic error
    return response.msg || 'Unknown error';
}

function isLoginData(data: LoginData | RedeemData | []): data is LoginData {
    return data !== null && typeof data === 'object' && 'nickname' in data;
}

async function loginUser(userId: string): Promise<ApiResponse> {
    const response = await fetch('/api/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({userId}),
    });
    return response.json();
}

async function redeemCode(userId: string, code: string): Promise<ApiResponse> {
    const response = await fetch('/api/redeem', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({userId, code}),
    });
    return response.json();
}

export default function App() {
    const [giftCode, setGiftCode] = useState('');
    const [userIds, setUserIds] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [feed, setFeed] = useState<FeedEntry[]>([]);
    const [progress, setProgress] = useState({
        current: 0,
        total: 0,
        success: 0,
        failed: 0,
    });
    const [versionInfo, setVersionInfo] = useState<{
        current: string;
        latest: string | null;
        repo: string;
        updateAvailable: boolean;
    }>({current: '', latest: null, repo: '', updateAvailable: false});

    const shouldStopRef = useRef(false);

    // Check version and updates on mount
    useEffect(() => {
        async function checkVersion() {
            try {
                // Get current version from server
                const versionRes = await fetch('/api/version');
                const {version, repo} = await versionRes.json();

                // Get latest release from GitHub
                let latest: string | null = null;
                let updateAvailable = false;
                try {
                    const githubRes = await fetch(
                        `https://api.github.com/repos/${repo}/releases/latest`
                    );
                    if (githubRes.ok) {
                        const release = await githubRes.json();
                        latest = release.tag_name?.replace(/^v/, '') || null;
                        if (latest && version !== latest) {
                            updateAvailable = true;
                        }
                    }
                } catch {
                    // GitHub API failed, ignore
                }

                setVersionInfo({
                    current: version,
                    latest,
                    repo,
                    updateAvailable
                });
            } catch {
                // Version endpoint failed, ignore
            }
        }

        checkVersion();
    }, []);

    const addFeedEntry = useCallback(
        (message: string, type: FeedEntry['type'] = 'info') => {
            const entry: FeedEntry = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                message,
                type,
                timestamp: new Date(),
            };
            setFeed((prev) => [entry, ...prev].slice(0, 100));
        },
        []
    );

    const processUsers = useCallback(
        async (userIdList: string[], code: string) => {
            let consecutiveFailures = 0;
            const maxConsecutiveFailures = 5;
            let successCount = 0;
            let failCount = 0;

            setProgress({
                current: 0,
                total: userIdList.length,
                success: 0,
                failed: 0
            });

            for (let i = 0; i < userIdList.length; i++) {
                if (shouldStopRef.current) {
                    addFeedEntry('Process stopped by user', 'warning');
                    break;
                }

                if (consecutiveFailures >= maxConsecutiveFailures) {
                    addFeedEntry(
                        `Stopping: ${maxConsecutiveFailures} consecutive failures reached`,
                        'error'
                    );
                    break;
                }

                const userId = userIdList[i].trim();
                if (!userId) continue;

                // Login
                addFeedEntry(`[${userId}] Logging in...`, 'info');
                let loginSuccess = false;
                let userDisplayName = userId;

                try {
                    const loginResult = await loginUser(userId);
                    console.log("LOGIN RESULT", loginResult)

                    // Check for network/server error
                    if (!loginResult.success) {
                        addFeedEntry(`[${userId}] Login failed: ${loginResult.error || 'Server error'}`, 'error');
                        consecutiveFailures++;
                        failCount++;
                    } else if (!loginResult.data || loginResult.data.code !== 0) {
                        // API returned an error
                        const errorMsg = loginResult.data?.msg || 'Invalid user ID';
                        addFeedEntry(`[${userId}] Login failed: ${errorMsg}`, 'error');
                        consecutiveFailures++;
                        failCount++;
                    } else {
                        // Success - extract user info
                        const userData = loginResult.data.data;
                        if (isLoginData(userData)) {
                            userDisplayName = userData.nickname;
                            addFeedEntry(
                                `[${userId}] Found: ${userData.nickname} (Kingdom ${userData.kid}, Stove Lv.${userData.stove_lv})`,
                                'success'
                            );
                        } else {
                            addFeedEntry(`[${userId}] Logged in successfully`, 'success');
                        }
                        loginSuccess = true;
                        consecutiveFailures = 0;
                    }
                } catch (error) {
                    addFeedEntry(
                        `[${userId}] Connection error: ${error instanceof Error ? error.message : 'Network failed'}`,
                        'error'
                    );
                    consecutiveFailures++;
                    failCount++;
                }

                // Redeem (only if login succeeded)
                if (loginSuccess) {
                    addFeedEntry(`[${userDisplayName}] Redeeming code...`, 'info');

                    try {
                        const redeemResult = await redeemCode(userId, code);

                        // Check for network/server error
                        if (!redeemResult.success) {
                            addFeedEntry(`[${userDisplayName}] Redeem failed: ${redeemResult.error || 'Server error'}`, 'error');
                            consecutiveFailures++;
                            failCount++;
                        } else if (!redeemResult.data) {
                            addFeedEntry(`[${userDisplayName}] Redeem failed: No response from server`, 'error');
                            consecutiveFailures++;
                            failCount++;
                        } else if (redeemResult.data.code !== 0) {
                            // API returned an error - get human-readable message
                            const errorMsg = getRedeemErrorMessage(redeemResult.data);
                            const errCode = typeof redeemResult.data.err_code === 'number'
                                ? redeemResult.data.err_code
                                : parseInt(redeemResult.data.err_code) || 0;

                            addFeedEntry(`[${userDisplayName}] ${errorMsg}`, 'error');

                            // Stop entirely if the code itself is bad
                            if (CODE_LEVEL_ERRORS.includes(errCode)) {
                                addFeedEntry('Stopping: Gift code is invalid or expired', 'error');
                                return;
                            }

                            consecutiveFailures++;
                            failCount++;
                        } else {
                            // Success!
                            addFeedEntry(`[${userDisplayName}] Code redeemed successfully!`, 'success');
                            successCount++;
                            consecutiveFailures = 0;
                        }
                    } catch (error) {
                        addFeedEntry(
                            `[${userDisplayName}] Connection error: ${error instanceof Error ? error.message : 'Network failed'}`,
                            'error'
                        );
                        consecutiveFailures++;
                        failCount++;
                    }
                }

                setProgress({
                    current: i + 1,
                    total: userIdList.length,
                    success: successCount,
                    failed: failCount,
                });

                if (consecutiveFailures > 0 && consecutiveFailures < maxConsecutiveFailures) {
                    addFeedEntry(
                        `Consecutive failures: ${consecutiveFailures}/${maxConsecutiveFailures}`,
                        'warning'
                    );
                }

                // Delay between requests
                if (i < userIdList.length - 1 && !shouldStopRef.current) {
                    await new Promise((resolve) => setTimeout(resolve, 500));
                }
            }

            addFeedEntry(
                `Completed: ${successCount} success, ${failCount} failed out of ${progress.current} processed`,
                successCount > 0 && failCount === 0 ? 'success' : 'info'
            );
        },
        [addFeedEntry]
    );

    const handleStart = useCallback(async () => {
        const code = giftCode.trim();
        const userIdList = userIds
            .split('\n')
            .map((id) => id.trim())
            .filter((id) => id.length > 0);

        if (!code) {
            addFeedEntry('Please enter a gift code', 'error');
            return;
        }

        if (userIdList.length === 0) {
            addFeedEntry('Please enter at least one user ID', 'error');
            return;
        }

        setIsRunning(true);
        shouldStopRef.current = false;
        setFeed([]);

        addFeedEntry(`Starting redemption for ${userIdList.length} users...`, 'info');

        try {
            await processUsers(userIdList, code);
        } catch (error) {
            addFeedEntry(
                `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                'error'
            );
        } finally {
            setIsRunning(false);
        }
    }, [giftCode, userIds, processUsers, addFeedEntry]);

    const handleStop = useCallback(() => {
        shouldStopRef.current = true;
        addFeedEntry('Stop requested, finishing current user...', 'warning');
    }, [addFeedEntry]);

    return (
        <div
            className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 lg:p-12">
            <div className="max-w-5xl mx-auto space-y-8">
                <header className="text-center">
                    <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                        KingShot Bulk Gift Code Redeemer
                    </h1>
                </header>

                {/* Row 1: Form - inputs with buttons below */}
                <div className="space-y-4">
                    <CodeInput
                        value={giftCode}
                        onChange={setGiftCode}
                        disabled={isRunning}
                    />
                    <UserIdList
                        value={userIds}
                        onChange={setUserIds}
                        disabled={isRunning}
                    />
                    <div className="flex gap-4">
                        <button
                            onClick={handleStart}
                            disabled={isRunning}
                            className="flex-1 px-8 py-4 text-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-xl shadow-lg hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                        >
                            {isRunning ? 'Running...' : 'Start'}
                        </button>
                        <button
                            onClick={handleStop}
                            disabled={!isRunning}
                            className="flex-1 px-8 py-4 text-lg bg-red-500 text-white font-semibold rounded-xl shadow-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                        >
                            Stop
                        </button>
                    </div>
                </div>

                {/* Row 2: Progress & Feed */}
                <div className="space-y-4">
                    <ProgressBar
                        current={progress.current}
                        total={progress.total}
                        success={progress.success}
                        failed={progress.failed}
                    />
                    <LiveFeed entries={feed}/>
                </div>
            </div>

            {/* Footer */}
            {versionInfo.current && (
                <footer className="mt-8 border-t border-slate-700 py-4 px-4">
                    <div
                        className="max-w-5xl mx-auto flex items-center justify-center gap-4 text-sm">

                        <span
                            className="text-slate-500">v{versionInfo.current}</span>
                        {versionInfo.updateAvailable && versionInfo.latest && (
                            <>
                                <span className="text-slate-600">•</span>
                                <a
                                    href={`https://github.com/${versionInfo.repo}/releases/latest`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded text-xs hover:bg-cyan-500/30 transition-colors"
                                >
                                    Update available: v{versionInfo.latest}
                                </a>
                            </>
                        )}
                        <span className="text-slate-600">•</span>
                        <p
                            className="text-center text-slate-400"
                        > Have an issue? Report it on {' '}
                            <a
                                href={`https://github.com/${versionInfo.repo}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-300 hover:text-cyan-400 transition-colors"
                            >
                                GitHub
                            </a>
                        </p>
                    </div>
                </footer>
            )}
        </div>
    );
}