import { min, max, mean, std, dot, subtract, norm } from 'mathjs';

export default class DataAnalyzer {
    // Checks if the required points exist for our dataset
    validate(connectionIds, validPoints) {
        return validPoints.every(point => connectionIds.includes(point));
    }

    getPositionVector(x, y, width, height) {
        const origin = { x: width / 2, y: height / 2 };
        const current = { x: x, y: y };
        // Vector subtraction
        return { x: current.x - origin.x, y: current.y - origin.y };
    }

    getAngle(targetJoint, adjJoint1, adjJoint2) {
        // Convert objects {x, y, z} to arrays for vector math
        const t = [targetJoint.x, targetJoint.y, targetJoint.z || 0];
        const a1 = [adjJoint1.x, adjJoint1.y, adjJoint1.z || 0];
        const a2 = [adjJoint2.x, adjJoint2.y, adjJoint2.z || 0];

        // Vectors t1 = a1 - t, t2 = a2 - t
        const t1 = subtract(a1, t);
        const t2 = subtract(a2, t);

        // Dot product and magnitude
        const dotProd = dot(t1, t2);
        const mag1 = norm(t1);
        const mag2 = norm(t2);

        // Avoid division by zero
        if (mag1 === 0 || mag2 === 0) return 0;

        // Clamp value for acos to avoid NaN due to floating point errors
        const cosTheta = Math.max(-1, Math.min(1, dotProd / (mag1 * mag2)));
        return Math.acos(cosTheta);
    }

    magnitude(vector) {
        return Math.sqrt(vector.reduce((sum, val) => sum + Math.pow(val, 2), 0));
    }

    // Fit Sine Wave
    fitSin(tt, yy) {
        const ttArr = Array.from(tt);
        const yyArr = Array.from(yy);

        // Safety check: Need at least 2 points for std dev and frequency calculation
        if (ttArr.length < 2 || yyArr.length < 2) {
            const avg = yyArr.length > 0 ? mean(yyArr) : 0;
            return {
                amp: 0,
                omega: 0,
                phase: 0,
                offset: avg,
                freq: 0,
                period: 0,
                fitfunc: () => avg,
                maxcov: 0,
                rawres: []
            };
        }

        // 1. Guess Offset
        const guessOffset = mean(yyArr);

        // 2. Guess Amplitude (RMS * sqrt(2))
        const guessAmp = std(yyArr) * Math.sqrt(2);

        // 3. Guess Frequency (Simplified zero-crossing)
        let crossings = 0;
        for(let i=0; i<yyArr.length-1; i++) {
            if ((yyArr[i] - guessOffset) * (yyArr[i+1] - guessOffset) < 0) {
                crossings++;
            }
        }
        const duration = ttArr[ttArr.length - 1] - ttArr[0];
        const guessFreq = duration !== 0 ? (crossings / 2) / duration : 0;

        // 4. Guess Phase (Simplified)
        const guessPhase = 0;

        // The fit function based on guesses
        const fitFunc = (t) => guessAmp * Math.sin(2 * Math.PI * guessFreq * t + guessPhase) + guessOffset;

        return {
            amp: guessAmp,
            omega: 2 * Math.PI * guessFreq,
            phase: guessPhase,
            offset: guessOffset,
            freq: guessFreq,
            period: 1 / guessFreq,
            fitfunc: fitFunc,
            maxcov: 0, 
            rawres: [guessAmp, guessFreq, guessPhase, guessOffset]
        };
    }

    getSlope(landmark1, landmark2, mInfThreshold) {
        if (landmark2.x - landmark1.x === 0) {
            return 'inf';
        }

        const m = (landmark2.y - landmark1.y) / (landmark2.x - landmark1.x);
        if (Math.abs(m) >= mInfThreshold) {
            return 'inf';
        }
        return m;
    }

    getPercentDiff(actualValue, desiredValue, mInfThreshold = 100) {
        // If the target value is 0, the % diff formula always gives 200%, so multiply actual value by 100
        if (desiredValue === 0) {
            return Math.abs(actualValue * 100);
        }

        // Infinity case
        if (actualValue === 'inf' && desiredValue === 'inf') {
            return 0;
        } else if (actualValue === 'inf' && desiredValue !== 'inf') {
            return Infinity;
        } else if (actualValue !== 'inf' && desiredValue === 'inf') {
            if (actualValue === 0) {
                return Infinity;
            }
            return Math.abs((1 / actualValue) * 100);
        }

        // Normal case
        return (Math.abs(desiredValue - actualValue) / ((desiredValue + actualValue) / 2)) * 100;
    }
}
