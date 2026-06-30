(function () {
    const pingColor = ms =>
        (ms === 0 || ms === null || typeof ms === 'undefined')
            ? '#BBBBBB'
            : ms <= 100  ? '#21e221'
            : ms <= 150  ? '#ffe944'
            :               '#ff3535';

    const num = document.querySelector('.connection-delay h2');
    const ms = document.getElementById('ms');
    const overlay = document.querySelector('.overlay');
    const svgs = document.querySelector('.connection-svgs');
    const iconsC = document.querySelector('.connection-ico');
    let bars = [];
    let prevVal = null;
    let prevColor = '#BBBBBB';
    let connected = false;

    async function loadSvg(url) {
        try {
            const r = await fetch(url);
            return await r.text();
        } catch (e) {
            return '';
        }
    }

    async function initBars() {
        const svgText = await loadSvg('../src/svg/bar.svg');
        svgs.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const wrap = document.createElement('div');
            wrap.className = 'bar-wrap';
            wrap.innerHTML = svgText;
            svgs.appendChild(wrap);
        }
        bars = Array.from(svgs.querySelectorAll('rect'));
    }

    async function renderIcon(type) {
        const svg = await loadSvg(`../src/svg/wifi-${type}.svg`);
        iconsC.innerHTML = svg;
    }

    function setOverlayColor(c) {
        num.style.color = c;
        overlay.style.borderColor = c;
        iconsC.querySelectorAll('path, rect').forEach(p => {
            if (p.getAttribute('stroke') && p.getAttribute('stroke') !== 'none')
                p.setAttribute('stroke', c);
            if (p.getAttribute('fill') && p.getAttribute('fill') !== 'none')
                p.setAttribute('fill', c);
        });
        bars.forEach(b => b.setAttribute('fill', c));
    }

    async function setDisconnected() {
        if (connected) {
            await renderIcon('disconnected');
            connected = false;
        }
        num.textContent   = '--';
        ms.textContent = '';
        setOverlayColor('#BBBBBB');
        prevVal   = null;
        prevColor = '#BBBBBB';
    }

    async function onPing(val) {
        if (!val || val === 0) {
            await setDisconnected();
            return;
        }
        const color = pingColor(val);
        if (!connected) {
            await renderIcon('connected');
            connected = true;
        }
        num.textContent = val;
        ms.textContent = 'ms';
        setOverlayColor(color);
        if (color !== prevColor) {
            prevColor = color;
        }
        prevVal = val;
    }

    (async () => {
        await initBars();
        await setDisconnected();
        if (typeof bhl !== 'undefined' && bhl && typeof bhl.onPing === 'function') {
            bhl.onPing(onPing);
        } else if (window.electron && typeof window.electron.onPing === 'function') {
            window.electron.onPing(onPing);
        } else if (window.api && typeof window.api.onPing === 'function') {
            window.api.onPing(onPing);
        } else {
            window.addEventListener('message', e => {
                if (e && e.data && (e.data.channel === 'ping:update' || e.data.type === 'ping:update'))
                    onPing(e.data.value | 0);
            });
        }
    })();
})();
