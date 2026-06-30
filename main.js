const { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const ping = require('ping');
const appIcon = nativeImage.createFromPath(path.join(__dirname, 'src', 'icons', 'app_ico.png'));

const regions = [
    { region: 'US-E', host: 'pingtest-atl.brawlhalla.com' },
    { region: 'US-W', host: 'pingtest-cal.brawlhalla.com' },
    { region: 'EU', host: 'pingtest-ams.brawlhalla.com' },
    { region: 'SEA', host: 'pingtest-sgp.brawlhalla.com' },
    { region: 'AUS', host: 'pingtest-aus.brawlhalla.com' },
    { region: 'BRAZIL', host: 'pingtest-brs.brawlhalla.com' },
    { region: 'JAPAN', host: 'pingtest-jpn.brawlhalla.com' },
    { region: 'MIDDLE EAST', host: 'pingtest-mde.brawlhalla.com' },
    { region: 'SOUTHERN AFRICA', host: 'pingtest-saf.brawlhalla.com' },
];

const user_cfg = path.join(
    app.getPath ? app.getPath('userData') : __dirname,
    'config.json'
);

let pingOverlay = null;
let regionsWindow = null;
let dropdownWindow = null;
let updPing = null;
let trayIcon = null;
let movebho = false;
let overlayPos = null;
let selectedRegion = regions[0].host;

function laodCfg() {
    try {
        if (!fs.existsSync(user_cfg)) return;
        const obj = JSON.parse(fs.readFileSync(user_cfg, 'utf8'));
        if (obj.selectedRegion) selectedRegion = obj.selectedRegion;
        if (obj.overlayPos) overlayPos = obj.overlayPos;
    } catch (_) {}
}

function saveCfg() {
    try {
        fs.writeFileSync(user_cfg, JSON.stringify({ selectedRegion, overlayPos }), 'utf8');
    } catch (_) {}
}

function buildOverlay() {
    pingOverlay = new BrowserWindow({
        x: overlayPos?.x,
        y: overlayPos?.y,
        width: 220,
        height: 85,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        focusable: true,
        resizable: false,
        icon: appIcon,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    pingOverlay.once('ready-to-show', () => {
        if (!overlayPos) {
            const [x, y] = pingOverlay.getPosition();
            pingOverlay.setPosition(x + 3, y + 40);
            overlayPos = { x: x + 3, y: y + 40 };
        }
    });

    pingOverlay.setIgnoreMouseEvents(true);
    try {
        pingOverlay.setAlwaysOnTop(true, 'pop-up-menu');
        pingOverlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
        pingOverlay.setFullScreenable(false);
    } catch (_) {}
    pingOverlay.loadFile('public/index.html');
    pingOverlay.on('move', () => {
        const [x, y] = pingOverlay.getPosition();
        overlayPos = { x, y };
        saveCfg();
    });

    pingOverlay.on('close', (event) => {
        event.preventDefault();
        pingOverlay.setOpacity(0);
    });
    pingOverlay.on('closed', () => { pingOverlay = null; });
}

function buildRegion() {
    if (regionsWindow) { regionsWindow.focus(); return; }

    regionsWindow = new BrowserWindow({
        width: 350,
        height: 250,
        alwaysOnTop: true,
        frame: false,
        resizable: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });
    regionsWindow.loadFile('public/region.html');
    regionsWindow.on('closed', () => { regionsWindow = null; });
}

function buildDDM(pos) {
    if (dropdownWindow) dropdownWindow.close();
    const x = Math.round(pos.left + (pos.containerWidth - 181) / 2);
    const y = Math.round(pos.top + 5);
    dropdownWindow = new BrowserWindow({
        width: 181,
        height: 320,
        x, y,
        alwaysOnTop: true,
        frame: false,
        resizable: false,
        transparent: true,
        backgroundColor: '#00000000',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });
    dropdownWindow.loadFile('public/dropdown.html');
    dropdownWindow.on('blur',   () => dropdownWindow?.close());
    dropdownWindow.on('closed', () => { dropdownWindow = null; });
}

function trayLogic() {
    trayIcon = new Tray(appIcon);
    trayIcon.setToolTip('Brawlhalla Ping Overlay');
    trayIcon.setContextMenu(
        Menu.buildFromTemplate([
            { label: 'Show / Hide Overlay', click: toggleOverlay },
            { label: 'Open Region Menu', click: buildRegion },
            { type: 'separator' },
            { label: 'Quit', click: () => {
                if (updPing) clearInterval(updPing);
                globalShortcut.unregisterAll();
                app.exit(0);
            }},
        ])
    );
    trayIcon.on('click', toggleOverlay);
}

function toggleOverlay() {
    if (!pingOverlay) buildOverlay();
    if (pingOverlay.getOpacity() > 0) {
        pingOverlay.setOpacity(0);
    } else {
        pingOverlay.setOpacity(1);
    }
}

function toggleMovable() {
    movebho = !movebho;
    pingOverlay?.setIgnoreMouseEvents(!movebho);
}

async function updatePing(host) {
    try {
        const times = [];
        for (let i = 0; i < 5; i++) {
            const res = await ping.promise.probe(host, { timeout: 2 });
            if (!isNaN(res.time)) times.push(res.time);
        }
        const avg = times.length
            ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
            : 0;
        pingOverlay?.webContents.send('ping:update', avg);
    } catch (_) {}
}

function startPinging() {
    if (updPing) clearInterval(updPing);
    updPing = setInterval(() => updatePing(selectedRegion), 2000);
}

function setupIPC() {
    ipcMain.handle('regions:get', () => regions);
    ipcMain.handle('config:get',  () => selectedRegion);

    ipcMain.handle('region:select', (_e, host) => {
        if (host) selectedRegion = host;
        saveCfg();
        if (!pingOverlay) buildOverlay();
        startPinging();
        if (regionsWindow) regionsWindow.close();
        return true;
    });

    ipcMain.on('dropdown:select', (_e, host) => {
        selectedRegion = host;
        regionsWindow?.webContents.send('dropdown:selected', host);
        dropdownWindow?.close();
    });

    ipcMain.on('dropdown:show', (_e, pos) => {
        buildDDM(pos);
    });
}

app.on('ready', () => {
    laodCfg();
    setupIPC();
    trayLogic();
    buildRegion();
    globalShortcut.register('CommandOrControl+Shift+P', buildRegion);
    globalShortcut.register('CommandOrControl+Shift+M', toggleMovable);
});

app.on('window-all-closed', () => {});

app.on('activate', () => {
    if (!pingOverlay) buildOverlay();
    pingOverlay.setOpacity(1);
});