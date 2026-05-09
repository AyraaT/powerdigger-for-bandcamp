// POWERDIGGER Library UI
'use strict';

let lib = {folderOrder: [], folders: {}};
let activeFolderId = null;
let sortKey = 'added';
let searchQuery = '';
let dragSrcFolderId = null; // for folder reorder drag

// ── Init ──────────────────────────────────────────────────────────────────
function init() {
        loadLibrary();
        document.getElementById('search-input').addEventListener('input', e => {
                searchQuery = e.target.value.toLowerCase();
                renderTracks();
        });
        document.getElementById('btn-new-folder').addEventListener('click', () => {
                const name = prompt('Folder name:');
                if (!name) return;
                chrome.runtime.sendMessage({type: 'libraryCreateFolder', name, color: '#4a90d9'}, () => loadLibrary());
        });
        document.getElementById('btn-rename-folder').addEventListener('click', () => {
                if (!activeFolderId) return;
                const cur = lib.folders[activeFolderId].name;
                const name = prompt('Rename folder:', cur);
                if (!name || name === cur) return;
                chrome.runtime.sendMessage({type: 'libraryRenameFolder', folderId: activeFolderId, name}, () => loadLibrary());
        });
        document.getElementById('btn-delete-folder').addEventListener('click', () => {
                if (!activeFolderId) return;
                const name = lib.folders[activeFolderId].name;
                const count = lib.folders[activeFolderId].tracks.length;
                const msg = count > 0
                        ? `Delete "${name}" and its ${count} track${count !== 1 ? 's' : ''}?`
                        : `Delete folder "${name}"?`;
                if (!confirm(msg)) return;
                chrome.runtime.sendMessage({type: 'libraryDeleteFolder', folderId: activeFolderId}, () => {
                        activeFolderId = null;
                        loadLibrary();
                });
        });
        // Colour picker
        const colorInput = document.getElementById('color-picker-input');
        document.getElementById('btn-color-folder').addEventListener('click', () => {
                if (!activeFolderId) return;
                colorInput.value = lib.folders[activeFolderId].color || '#4a90d9';
                colorInput.click();
        });
        colorInput.addEventListener('input', e => {
                if (!activeFolderId) return;
                chrome.runtime.sendMessage({type: 'librarySetFolderColor', folderId: activeFolderId, color: e.target.value}, () => loadLibrary());
        });
        // Sort buttons
        document.querySelectorAll('.sort-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                        document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');
                        sortKey = btn.dataset.sort;
                        renderTracks();
                });
        });
}

// ── Data ──────────────────────────────────────────────────────────────────
function loadLibrary() {
        chrome.runtime.sendMessage({type: 'libraryGet'}, result => {
                lib = result || {folderOrder: [], folders: {}};
                renderFolders();
                renderTracks();
        });
}

// ── Folders ───────────────────────────────────────────────────────────────
function renderFolders() {
        const list = document.getElementById('folder-list');
        list.innerHTML = '';

        (lib.folderOrder || []).forEach(id => {
                const f = lib.folders[id];
                if (!f) return;

                const item = document.createElement('div');
                item.className = 'folder-item' + (id === activeFolderId ? ' active' : '');
                item.dataset.id = id;
                item.draggable = true;

                const handle = document.createElement('span');
                handle.className = 'folder-drag-handle';
                handle.textContent = '⠿';
                handle.title = 'Drag to reorder';

                const dot = document.createElement('span');
                dot.className = 'folder-dot';
                dot.style.background = f.color || '#4a90d9';

                const name = document.createElement('span');
                name.className = 'folder-name';
                name.textContent = f.name;

                const count = document.createElement('span');
                count.className = 'folder-count';
                count.textContent = f.tracks.length;

                item.appendChild(handle);
                item.appendChild(dot);
                item.appendChild(name);
                item.appendChild(count);

                // Select
                item.addEventListener('click', e => {
                        if (e.target === handle) return;
                        activeFolderId = id;
                        renderFolders();
                        renderTracks();
                });

                // Drag-to-reorder folders
                item.addEventListener('dragstart', e => {
                        dragSrcFolderId = id;
                        e.dataTransfer.effectAllowed = 'move';
                        setTimeout(() => item.style.opacity = '0.4', 0);
                });
                item.addEventListener('dragend', () => { item.style.opacity = ''; });
                item.addEventListener('dragover', e => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        document.querySelectorAll('.folder-item').forEach(el => el.classList.remove('drag-over'));
                        item.classList.add('drag-over');
                });
                item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
                item.addEventListener('drop', e => {
                        e.preventDefault();
                        item.classList.remove('drag-over');
                        if (!dragSrcFolderId || dragSrcFolderId === id) return;
                        const order = [...lib.folderOrder];
                        const srcIdx = order.indexOf(dragSrcFolderId);
                        const dstIdx = order.indexOf(id);
                        order.splice(srcIdx, 1);
                        order.splice(dstIdx, 0, dragSrcFolderId);
                        chrome.runtime.sendMessage({type: 'libraryReorderFolders', order}, () => loadLibrary());
                });

                // Drop tracks onto folder in sidebar
                item.addEventListener('dragenter', e => {
                        if (e.dataTransfer.types.includes('text/trackid')) {
                                item.classList.add('drag-over');
                        }
                });

                list.appendChild(item);
        });

        // Update panel header if a folder is selected
        if (activeFolderId && lib.folders[activeFolderId]) {
                const f = lib.folders[activeFolderId];
                document.getElementById('panel-folder-name').textContent = f.name;
                document.getElementById('folder-color-dot').style.background = f.color || '#4a90d9';
                document.getElementById('no-selection').style.display = 'none';
                document.getElementById('folder-view').style.display = 'flex';
        } else {
                document.getElementById('no-selection').style.display = 'flex';
                document.getElementById('folder-view').style.display = 'none';
        }
}

// ── Tracks ────────────────────────────────────────────────────────────────
function renderTracks() {
        if (!activeFolderId || !lib.folders[activeFolderId]) return;

        const folder = lib.folders[activeFolderId];
        let tracks = [...folder.tracks];

        // Filter by search
        if (searchQuery) {
                tracks = tracks.filter(t =>
                        (t.title || '').toLowerCase().includes(searchQuery) ||
                        (t.artist || '').toLowerCase().includes(searchQuery) ||
                        (t.album || '').toLowerCase().includes(searchQuery)
                );
        }

        // Sort
        tracks.sort((a, b) => {
                if (sortKey === 'added') return (b.addedAt || 0) - (a.addedAt || 0);
                if (sortKey === 'title') return (a.title || '').localeCompare(b.title || '');
                if (sortKey === 'artist') return (a.artist || '').localeCompare(b.artist || '');
                return 0;
        });

        const container = document.getElementById('track-list');
        container.innerHTML = '';

        if (tracks.length === 0) {
                container.innerHTML = `<div class="empty-state">
                        <div class="big">🎵</div>
                        <div>${searchQuery ? 'No tracks match your search.' : 'No tracks in this folder yet.<br>Browse Bandcamp and use the <b>Library</b> button to save tracks.'}</div>
                </div>`;
                return;
        }

        tracks.forEach(track => {
                const card = document.createElement('div');
                card.className = 'track-card';
                card.draggable = true;
                card.dataset.trackId = track.id;

                // Drag out of folder (to move into another)
                card.addEventListener('dragstart', e => {
                        e.dataTransfer.setData('text/trackid', track.id);
                        e.dataTransfer.effectAllowed = 'move';
                        setTimeout(() => card.classList.add('drag-ghost'), 0);
                });
                card.addEventListener('dragend', () => card.classList.remove('drag-ghost'));

                const info = document.createElement('div');
                info.className = 'track-info';

                const title = document.createElement('div');
                title.className = 'track-title';
                title.textContent = track.title || 'Unknown';

                const sub = document.createElement('div');
                sub.className = 'track-sub';
                sub.textContent = [track.artist, track.album].filter(Boolean).join(' · ');

                info.appendChild(title);
                info.appendChild(sub);

                const date = document.createElement('div');
                date.className = 'track-date';
                if (track.addedAt) {
                        const d = new Date(track.addedAt);
                        date.textContent = d.toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: '2-digit'});
                        date.title = d.toLocaleString();
                }

                const actions = document.createElement('div');
                actions.className = 'track-actions';

                // Visit button
                const visitBtn = document.createElement('a');
                visitBtn.className = 'btn-visit';
                visitBtn.textContent = '↗';
                visitBtn.title = 'Open on Bandcamp';
                visitBtn.href = track.url;
                visitBtn.target = '_blank';
                visitBtn.rel = 'noopener';
                actions.appendChild(visitBtn);

                // Move to folder button
                const moveBtn = document.createElement('div');
                moveBtn.style.position = 'relative';
                const moveTrigger = document.createElement('button');
                moveTrigger.className = 'btn-move';
                moveTrigger.textContent = '↪ Move';
                moveTrigger.title = 'Move to another folder';
                moveBtn.appendChild(moveTrigger);

                moveTrigger.addEventListener('click', e => {
                        e.stopPropagation();
                        // Remove any open menus
                        document.querySelectorAll('.move-menu').forEach(m => m.remove());
                        const menu = document.createElement('div');
                        menu.className = 'move-menu';
                        (lib.folderOrder || []).forEach(fid => {
                                if (fid === activeFolderId) return;
                                const f = lib.folders[fid];
                                if (!f) return;
                                const mi = document.createElement('div');
                                mi.className = 'move-menu-item';
                                const dot = document.createElement('span');
                                dot.style.cssText = `display:inline-block;width:8px;height:8px;border-radius:50%;background:${f.color || '#4a90d9'};flex-shrink:0;`;
                                mi.appendChild(dot);
                                mi.appendChild(document.createTextNode(f.name));
                                mi.addEventListener('click', () => {
                                        chrome.runtime.sendMessage({type: 'libraryMoveTrack', fromFolder: activeFolderId, toFolder: fid, trackId: track.id}, () => {
                                                menu.remove();
                                                loadLibrary();
                                        });
                                });
                                menu.appendChild(mi);
                        });
                        if (menu.childElementCount === 0) {
                                const mi = document.createElement('div');
                                mi.className = 'move-menu-item';
                                mi.style.color = 'var(--text-dim)';
                                mi.textContent = 'No other folders';
                                menu.appendChild(mi);
                        }
                        moveBtn.appendChild(menu);
                        const closeMenu = (ev) => { if (!menu.contains(ev.target)) { menu.remove(); document.removeEventListener('click', closeMenu); } };
                        setTimeout(() => document.addEventListener('click', closeMenu), 0);
                });
                actions.appendChild(moveBtn);

                // Remove button
                const removeBtn = document.createElement('button');
                removeBtn.className = 'btn-remove';
                removeBtn.textContent = '✕';
                removeBtn.title = 'Remove from folder';
                removeBtn.addEventListener('click', () => {
                        chrome.runtime.sendMessage({type: 'libraryRemoveTrack', folderId: activeFolderId, trackId: track.id}, () => loadLibrary());
                });
                actions.appendChild(removeBtn);

                card.appendChild(info);
                card.appendChild(date);
                card.appendChild(actions);
                container.appendChild(card);
        });

        // Accept drops onto the track list to handle folder-sidebar drops
        setupTrackListDropTarget();
}

function setupTrackListDropTarget() {
        const wrap = document.getElementById('track-list-wrap');
        wrap.addEventListener('dragover', e => {
                if (e.dataTransfer.types.includes('text/trackid')) {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                }
        });
        wrap.addEventListener('drop', e => {
                const trackId = e.dataTransfer.getData('text/trackid');
                if (!trackId || !activeFolderId) return;
                // If the track came from this folder already, no-op
        });
}

// Also handle drops onto sidebar folder items for move-by-drag
document.addEventListener('dragover', e => {
        const item = e.target.closest('.folder-item');
        if (!item || !e.dataTransfer.types.includes('text/trackid')) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
});
document.addEventListener('drop', e => {
        const item = e.target.closest('.folder-item');
        if (!item) return;
        const trackId = e.dataTransfer.getData('text/trackid');
        if (!trackId) return;
        const toFolder = item.dataset.id;
        if (!toFolder || toFolder === activeFolderId) return;
        e.preventDefault();
        chrome.runtime.sendMessage({type: 'libraryMoveTrack', fromFolder: activeFolderId, toFolder, trackId}, () => loadLibrary());
});

// ── Boot ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
