const getTimestamp = () => new Date().toISOString();

const shouldLog = (level) => {
    const isProd = import.meta.env.PROD === true;
    if (isProd) {
        return level === 'WARN' || level === 'ERROR';
    }
    return true;
};

const logMsg = (level, ...args) => {
    if (!shouldLog(level)) return;
    let moduleName = 'App';
    let message = '';
    let extra = [];
    
    if (args.length >= 2 && typeof args[0] === 'string' && typeof args[1] === 'string') {
        moduleName = args[0];
        message = args[1];
        extra = args.slice(2);
    } else if (args.length >= 1) {
        message = args[0];
        extra = args.slice(1);
        const match = message.match(/^\[([^\]]+)\]/);
        if (match) {
            moduleName = match[1];
            message = message.substring(match[0].length).trim();
        }
    }
    
    const timestamp = getTimestamp();
    const prefix = `[${level}] [${timestamp}] [${moduleName}]`;
    
    if (level === 'ERROR') {
        console.error(`${prefix} ${message}`, ...extra);
    } else if (level === 'WARN') {
        console.warn(`${prefix} ${message}`, ...extra);
    } else if (level === 'INFO') {
        console.info(`${prefix} ${message}`, ...extra);
    } else {
        console.debug(`${prefix} ${message}`, ...extra);
    }
};

export const log = {
    debug: (...args) => logMsg('DEBUG', ...args),
    info: (...args) => logMsg('INFO', ...args),
    warn: (...args) => logMsg('WARN', ...args),
    error: (...args) => logMsg('ERROR', ...args),
};

export const showToast = (message, type = 'error') => {
    const toastId = 'pace-toast-container';
    let container = document.getElementById(toastId);
    if (!container) {
        container = document.createElement('div');
        container.id = toastId;
        container.style.position = 'fixed';
        container.style.bottom = '20px';
        container.style.right = '20px';
        container.style.zIndex = '99999';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '10px';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.style.background = type === 'error' ? 'rgba(239, 68, 68, 0.95)' : 'rgba(34, 197, 94, 0.95)';
    toast.style.color = '#fff';
    toast.style.padding = '12px 24px';
    toast.style.borderRadius = '8px';
    toast.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';
    toast.style.fontFamily = 'sans-serif';
    toast.style.fontSize = '14px';
    toast.style.fontWeight = 'bold';
    toast.style.minWidth = '250px';
    toast.style.transition = 'all 0.3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    toast.style.backdropFilter = 'blur(8px)';
    toast.style.border = '1px solid rgba(255,255,255,0.1)';
    toast.innerText = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 10);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            toast.remove();
            if (container.children.length === 0) {
                container.remove();
            }
        }, 300);
    }, 4000);
};
