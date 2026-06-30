const {ipcRenderer} = require('electron');
const container = document.getElementById('regions-menu');
const select = document.getElementById('region-select');
const applyBtn = document.getElementById('apply-btn');
const helpOpen = document.getElementById('help-open');
const helpModal = document.getElementById('help-shortcuts-menu');
const helpClose = document.getElementById('help-close');
container.addEventListener('click', () => {
    const rect = container.getBoundingClientRect();
    const left = Math.round(window.screenX + rect.left);
    const top = Math.round(window.screenY + rect.bottom);
    ipcRenderer.send('dropdown:show', { left, top, containerWidth: rect.width });
});

ipcRenderer.invoke('regions:get').then(async regions => {
    regions.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r.host;
        opt.textContent = r.region;
        select.appendChild(opt);
    });

    try {
        const current = await ipcRenderer.invoke('config:get');
        if (current) select.value = current;
    } catch (e) {}
});

ipcRenderer.on('dropdown:selected', (e, host) => {
    if (host) select.value = host;
});

applyBtn.addEventListener('click', async () => {
    try {
        await ipcRenderer.invoke('region:select', select.value);
    } catch (e) {}
    window.close();
});

helpOpen.addEventListener('click', () => { helpModal.style.display = 'block'; });
helpClose.addEventListener('click', () => { helpModal.style.display = 'none'; });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') helpModal.style.display = 'none'; });
