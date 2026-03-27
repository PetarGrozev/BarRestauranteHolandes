import { useEffect, useMemo, useState } from 'react';

type UseHoldTimerOptions = {
    startedAt: string;
    isCompleted?: boolean;
    limitInSeconds?: number;
};

function getRemainingSeconds(startedAt: string, limitInSeconds: number) {
    const start = new Date(startedAt).getTime();
    const now = Date.now();
    const deadline = start + limitInSeconds * 1000;
    return Math.max(0, Math.ceil((deadline - now) / 1000));
}

function formatTime(seconds: number) {
    const safeSeconds = Math.max(0, seconds);
    const minutes = Math.floor(safeSeconds / 60);
    const remainingSeconds = safeSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

const useHoldTimer = ({ startedAt, isCompleted = false, limitInSeconds = 600 }: UseHoldTimerOptions) => {
    const [timeLeft, setTimeLeft] = useState(() => (isCompleted ? 0 : getRemainingSeconds(startedAt, limitInSeconds)));

    useEffect(() => {
        if (isCompleted) {
            setTimeLeft(0);
            return;
        }

        setTimeLeft(getRemainingSeconds(startedAt, limitInSeconds));

        const timer = window.setInterval(() => {
            setTimeLeft(getRemainingSeconds(startedAt, limitInSeconds));
        }, 1000);

        return () => window.clearInterval(timer);
    }, [isCompleted, limitInSeconds, startedAt]);

    const isExpired = !isCompleted && timeLeft === 0;
    const formattedTime = useMemo(() => formatTime(timeLeft), [timeLeft]);

    return {
        timeLeft,
        isExpired,
        formattedTime,
    };
};

export default useHoldTimer;