import { useEffect, useState } from 'react';

const useHoldTimer = (initialTime = 10) => {
    const [timeLeft, setTimeLeft] = useState(initialTime * 60);
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        let timer: NodeJS.Timeout;

        if (isActive && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft((prevTime) => prevTime - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setIsActive(false);
            // Trigger notification or any other action when the timer ends
        }

        return () => clearInterval(timer);
    }, [isActive, timeLeft]);

    const startTimer = () => {
        setIsActive(true);
    };

    const resetTimer = () => {
        setIsActive(false);
        setTimeLeft(initialTime * 60);
    };

    return { timeLeft, isActive, startTimer, resetTimer };
};

export default useHoldTimer;