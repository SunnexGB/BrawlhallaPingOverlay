const { ipcRenderer } = require('electron');

document.querySelectorAll('.ddm-region-name').forEach(item => {
    item.addEventListener('click', () => {
        ipcRenderer.send('dropdown:select', item.getAttribute('host-data'));
        window.close();
    });
});