const { createCanvas } = require('@napi-rs/canvas');

function formatTime(ms) {
    if (ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

const canvasPool = [];

async function generateProgressBar(currentMs, totalMs, isStream = false) {
    const width = 800;
    const height = 40;
    
    let canvas = canvasPool.pop();
    if (!canvas) {
        canvas = createCanvas(width, height);
    }
    
    const ctx = canvas.getContext('2d');

    // Transparent background
    ctx.clearRect(0, 0, width, height);

    const trackColor = '#3f3f46';
    const progressColor = '#3b82f6';
    const textColor = '#ffffff';
    
    ctx.font = '22px sans-serif';
    ctx.fillStyle = textColor;
    ctx.textBaseline = 'middle';

    const currentText = formatTime(currentMs);
    const totalText = isStream ? 'LIVE' : formatTime(totalMs);

    // Left text
    ctx.textAlign = 'left';
    ctx.fillText(currentText, 10, height / 2);

    // Right text
    ctx.textAlign = 'right';
    ctx.fillText(totalText, width - 10, height / 2);

    const currentTextWidth = ctx.measureText(currentText).width;
    const totalTextWidth = ctx.measureText(totalText).width;

    const padding = 20;
    const barStartX = 10 + currentTextWidth + padding;
    const barEndX = width - 10 - totalTextWidth - padding;
    const barWidth = barEndX - barStartX;
    
    // Background track
    ctx.lineCap = 'round';
    ctx.lineWidth = 6;
    ctx.strokeStyle = trackColor;
    
    ctx.beginPath();
    ctx.moveTo(barStartX, height / 2);
    ctx.lineTo(barEndX, height / 2);
    ctx.stroke();

    // Progress track
    let percent = (totalMs > 0 && !isStream) ? (currentMs / totalMs) : (isStream ? 1 : 0);
    if (percent > 1) percent = 1;
    if (percent < 0) percent = 0;

    const progressEndX = barStartX + (barWidth * percent);

    if (percent > 0) {
        ctx.strokeStyle = progressColor;
        ctx.beginPath();
        ctx.moveTo(barStartX, height / 2);
        ctx.lineTo(progressEndX, height / 2);
        ctx.stroke();
    }

    // Thumb (circle)
    ctx.fillStyle = progressColor;
    ctx.beginPath();
    ctx.arc(progressEndX, height / 2, 8, 0, Math.PI * 2);
    ctx.fill();

    // White inner dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(progressEndX, height / 2, 3, 0, Math.PI * 2);
    ctx.fill();

    const buffer = await canvas.encode('png');
    
    // Return canvas to pool for reuse
    canvasPool.push(canvas);
    
    return buffer;
}

module.exports = { generateProgressBar };
