"use client";

import React, { useEffect, useState } from 'react';

const HoldTimer: React.FC<{ onHoldComplete: () => void }> = ({ onHoldComplete }) => {
    const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        let timer: NodeJS.Timeout;

        if (isActive && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            onHoldComplete();
            setIsActive(false);
        }

        return () => clearInterval(timer);
    }, [isActive, timeLeft, onHoldComplete]);

    const startHold = () => {
        setIsActive(true);
        setTimeLeft(600); // Reset to 10 minutes
    };

    const resetHold = () => {
        setIsActive(false);
        setTimeLeft(600);
    };

    return (
        <div>
            <h2>Hold Timer</h2>
            <div>{isActive ? `Time left: ${timeLeft}s` : 'Timer is not active'}</div>
            <button onClick={startHold} disabled={isActive}>
                Hold Order
            </button>
            <button onClick={resetHold} disabled={!isActive}>
                Reset Timer
            </button>
        </div>
    );
};

export default HoldTimer;