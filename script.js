document.addEventListener('DOMContentLoaded', () => {

    // --- State Aplikasi ---
    let isCustomizing = false;
    let hapticsEnabled = false;
    let isPremium = false; // <<< SIMULASI PREMIUM
    let toastTimeout;
    let savedLayouts = [];
    let currentEditingElement = null;

    // --- Referensi Elemen DOM ---
    const loginPage = document.getElementById('login-page');
    const remotePage = document.getElementById('remote-page');
    const customUiOverlay = document.getElementById('custom-ui-overlay');
    const statsOverlay = document.getElementById('stats-overlay');
    const loginForm = document.getElementById('login-form');
    const connectBtn = document.getElementById('connect-btn');
    const loadingSpinner = document.getElementById('loading-spinner');
    const clientIdInput = document.getElementById('client-id');
    const subscribeBtn = document.getElementById('subscribe-btn');
    const toast = document.getElementById('toast-notification');
    const toastMessage = document.getElementById('toast-message');
    const premiumModal = document.getElementById('premium-modal');
    const closePremiumModal = document.getElementById('close-premium-modal');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsModal = document.getElementById('close-settings-modal');
    const enterCustomizeBtn = document.getElementById('enter-customize-btn');
    const disconnectBtn = document.getElementById('disconnect-btn');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const toggleStatsBtn = document.getElementById('toggle-stats-btn');
    const customizeBar = document.getElementById('customize-bar');
    const exitCustomizeBtn = document.getElementById('exit-customize-btn');
    const addKeyBtn = document.getElementById('add-key-btn');
    const addJoystickBtn = document.getElementById('add-joystick-btn');
    const addJoystickModal = document.getElementById('add-joystick-modal');
    const closeAddJoystickModal = document.getElementById('close-add-joystick-modal');
    const joystickStick = document.querySelector('.joystick-stick');
    
    // Referensi Keyboard v19
    const globalKeyboardBtn = document.getElementById('global-keyboard-btn');
    const slidingKeyboard = document.getElementById('sliding-keyboard');
    const closeSlidingKeyboardBtn = document.getElementById('close-sliding-keyboard-btn');
    const slidingKeyboardLayers = document.getElementById('sliding-keyboard-layers');
    const bindingKeyboardModal = document.getElementById('binding-keyboard-modal');
    const closeBindingKeyboardBtn = document.getElementById('close-binding-keyboard-btn');

    // Elemen Edit Modal
    const editKeyModal = document.getElementById('edit-key-modal');
    const closeEditKeyModal = document.getElementById('close-edit-key-modal');
    const editKeyLabel = document.getElementById('edit-key-label');
    const editKeyCommand = document.getElementById('edit-key-command');
    const editKeySize = document.getElementById('edit-key-size');
    const editKeySizeValue = document.getElementById('edit-key-size-value');
    const editKeyStyleWrapper = document.getElementById('edit-key-style-wrapper');
    const editKeyModeWrapper = document.getElementById('edit-key-mode-wrapper');
    const saveEditKeyBtn = document.getElementById('save-edit-key-btn');
    const deleteKeyBtn = document.getElementById('delete-key-btn');
    const editKeyLabelWrapper = document.getElementById('edit-key-label-wrapper');
    const editKeyCommandWrapper = document.getElementById('edit-key-command-wrapper');
    const editKeyStyleWrapperParent = document.getElementById('edit-key-style-wrapper-parent');
    const editKeyModeWrapperParent = document.getElementById('edit-key-mode-wrapper-parent');

    // Elemen Fitur Baru
    const buttonOpacitySlider = document.getElementById('button-opacity-slider');
    const opacityValue = document.getElementById('opacity-value');
    const toggleHapticsBtn = document.getElementById('toggle-haptics-btn');
    const saveLayoutInput = document.getElementById('save-layout-input');
    const saveLayoutBtn = document.getElementById('save-layout-btn');
    const savedLayoutsList = document.getElementById('saved-layouts-list');
    const loadLayoutInput = document.getElementById('load-layout-input');
    const loadLayoutBtn = document.getElementById('load-layout-btn');

    // --- 1. Fungsi Notifikasi ---
    function showToast(message, isError = false) {
        if (!toast || !toastMessage) return; 
        if (toastTimeout) clearTimeout(toastTimeout);
        toastMessage.textContent = message;
        toast.className = 'py-3 px-5 rounded-lg shadow-lg text-white'; 
        toast.classList.add(isError ? 'bg-red-600' : 'bg-indigo-600');
        toast.classList.add('show');
        toastTimeout = setTimeout(() => { toast.classList.remove('show'); }, 3000);
    }

    // --- 2. Logika Modal (Umum) ---
    function openModal(modal) {
        if (!modal) return;
        modal.classList.remove('hidden');
        setTimeout(() => modal.classList.remove('opacity-0', 'scale-95'), 10);
    }
    function closeModal(modal) {
        if (!modal) return;
        modal.classList.add('opacity-0', 'scale-95');
        setTimeout(() => modal.classList.add('hidden'), 200);
    }
    
    // --- 3. Logika Drag-and-Drop (Interact.js) ---
    function dragMoveListener(event) {
        const target = event.target;
        const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
        const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
        target.style.transform = `translate(${x}px, ${y}px) scale(${target.dataset.scale || 1})`;
        target.setAttribute('data-x', x);
        target.setAttribute('data-y', y);
    }

    let dragInteraction;
    if (typeof interact !== 'undefined') {
        dragInteraction = interact('.draggable').draggable({
            listeners: { move: dragMoveListener },
            inertia: true,
            modifiers: [ interact.modifiers.restrictRect({ restriction: 'parent', endOnly: true }) ],
            enabled: false
        });
    } else { console.error("interact.js tidak ter-load"); }
    
    // --- 4. Logika Joystick ---
    if (typeof interact !== 'undefined' && joystickStick) {
        interact(joystickStick).draggable({
            listeners: {
                move(event) {
                    if (isCustomizing) return;
                    const target = event.target, base = target.parentElement;
                    if (!base) return;
                    const baseRect = base.getBoundingClientRect(), stickRadius = target.offsetWidth / 2, baseRadius = base.offsetWidth / 2;
                    let x = event.pageX - (baseRect.left + baseRadius), y = event.pageY - (baseRect.top + baseRadius);
                    const distance = Math.sqrt(x*x + y*y), maxDistance = baseRadius - stickRadius;
                    if (distance > maxDistance) { x = (x / distance) * maxDistance; y = (y / distance) * maxDistance; }
                    target.style.transform = `translate(${x}px, ${y}px)`;
                    performHapticFeedback();
                },
                end(event) { 
                    event.target.style.transform = 'translate(0px, 0px)';
                }
            },
            enabled: true
        });
    }

    // --- 5. Logika Kustomisasi ---
    function toggleCustomizationMode(forceOff = false) {
        isCustomizing = forceOff ? false : !isCustomizing;
        
        if (customUiOverlay) customUiOverlay.classList.toggle('customization-active', isCustomizing);
        if (dragInteraction) dragInteraction.draggable({ enabled: isCustomizing });
        
        if (isCustomizing) {
            if (customizeBar) customizeBar.classList.remove('hidden');
            if (globalKeyboardBtn) globalKeyboardBtn.style.display = 'none';
            closeModal(settingsModal);
            showToast('Mode Kustomisasi AKTIF');
        } else {
            if (customizeBar) customizeBar.classList.add('hidden');
            if (globalKeyboardBtn) globalKeyboardBtn.style.display = 'flex';
            showToast('Tata Letak Disimpan');
        }
    }
    
    function addNewDraggable(type, label = '', command = '') {
        const newEl = document.createElement('div');
        newEl.classList.add('draggable');
        newEl.style.top = '50%';
        newEl.style.left = '50%';
        
        const editSpan = document.createElement('span');
        editSpan.classList.add('edit-btn-overlay');
        editSpan.innerHTML = '<i class="fas fa-cog"></i>';
        newEl.appendChild(editSpan);

        if (type === 'key') {
            newEl.dataset.command = command;
            newEl.dataset.label = label;
            newEl.dataset.scale = "1.0";
            newEl.dataset.style = "circle"; // Default Bulat
            newEl.dataset.mode = "press";
            
            const textSpan = document.createElement('span');
            textSpan.classList.add('font-bold', 'btn-label');
            if (command === 'SPECIAL_PASTE') {
                textSpan.innerHTML = `<i class="fas fa-paste"></i>`;
                newEl.dataset.label = "Paste";
            } else {
                textSpan.innerHTML = label;
            }
            newEl.appendChild(textSpan);
            addResponsiveListener(newEl);
        } else if (type === 'analog') {
            newEl.classList.add('joystick-base');
            newEl.dataset.label = "Joystick Analog";
            newEl.dataset.command = "JOYSTICK";
            newEl.dataset.scale = "1.0";
            newEl.dataset.style = "analog";
            newEl.dataset.mode = "press";
            const stick = document.createElement('div');
            stick.classList.add('joystick-stick');
            newEl.appendChild(stick);
            if (typeof interact !== 'undefined') {
                interact(stick).draggable({
                    listeners: {
                        move(event) {
                            if (isCustomizing) return;
                            const target = event.target, base = target.parentElement;
                            const baseRect = base.getBoundingClientRect(), stickRadius = target.offsetWidth / 2, baseRadius = base.offsetWidth / 2;
                            let x = event.pageX - (baseRect.left + baseRadius), y = event.pageY - (baseRect.top + baseRadius);
                            const distance = Math.sqrt(x*x + y*y), maxDistance = baseRadius - stickRadius;
                            if (distance > maxDistance) { x = (x / distance) * maxDistance; y = (y / distance) * maxDistance; }
                            target.style.transform = `translate(${x}px, ${y}px)`;
                            performHapticFeedback();
                        },
                        end(event) { event.target.style.transform = 'translate(0px, 0px)'; }
                    },
                    enabled: true
                });
            }
        } else if (type === 'dpad') {
            newEl.classList.add('d-pad-base');
            newEl.dataset.label = "D-Pad";
            newEl.dataset.command = "DPAD";
            newEl.dataset.scale = "1.0";
            newEl.dataset.style = "dpad";
            newEl.dataset.mode = "press";
            newEl.innerHTML += `
                <div class="d-pad-btn d-pad-up" data-command="W"><i class="fas fa-caret-up"></i></div>
                <div class="d-pad-btn d-pad-left" data-command="A"><i class="fas fa-caret-left"></i></div>
                <div class="d-pad-center"></div>
                <div class="d-pad-btn d-pad-right" data-command="D"><i class="fas fa-caret-right"></i></div>
                <div class="d-pad-btn d-pad-down" data-command="S"><i class="fas fa-caret-down"></i></div>
            `;
            newEl.querySelectorAll('.d-pad-btn').forEach(addResponsiveListener);
        }
        
        if (customUiOverlay) customUiOverlay.appendChild(newEl);
        addEditListener(newEl);
        
        if (dragInteraction) {
            interact(newEl).draggable({
                listeners: { move: dragMoveListener },
                inertia: true,
                modifiers: [ interact.modifiers.restrictRect({ restriction: 'parent', endOnly: true }) ],
                enabled: true
            });
        }
    }

    // --- 6. Event Listeners ---
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (connectBtn) connectBtn.disabled = true;
            if (loadingSpinner) loadingSpinner.classList.remove('hidden');
            setTimeout(() => {
                if (connectBtn) connectBtn.disabled = false;
                if (loadingSpinner) loadingSpinner.classList.add('hidden');
                if (loginPage) loginPage.style.display = 'none';
                if (remotePage) remotePage.style.display = 'flex';
                if (clientIdInput) {
                    showToast(`Terhubung ke ${clientIdInput.value}`);
                } else {
                    showToast('Terhubung!');
                }
            }, 1000);
        });
    } 
    
    if (subscribeBtn) subscribeBtn.addEventListener('click', () => openModal(premiumModal));
    if (closePremiumModal) closePremiumModal.addEventListener('click', () => closeModal(premiumModal));
    
    document.body.addEventListener('click', (e) => {
        const target = e.target.closest('[data-premium-feature="true"]');
        if (target) {
            if (!isPremium) {
                e.preventDefault();
                e.stopPropagation();
                if (settingsModal && !settingsModal.classList.contains('hidden')) {
                    closeModal(settingsModal);
                }
                openModal(premiumModal);
            }
        }
    }, true);

    if (settingsBtn) settingsBtn.addEventListener('click', () => openModal(settingsModal));
    if (closeSettingsModal) closeSettingsModal.addEventListener('click', () => closeModal(settingsModal));
    
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            const activeTabContent = document.getElementById(`tab-${tabId}`);
            if (activeTabContent) activeTabContent.classList.add('active');
        });
    });
    
    if (settingsModal) {
        settingsModal.addEventListener('click', (e) => {
            const targetBtn = e.target.closest('.choice-btn:not([data-premium-feature="true"])');
            if (!targetBtn) return;
            
            const parent = targetBtn.parentElement;
            if (parent) {
                parent.querySelectorAll('.choice-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
            }
            targetBtn.classList.add('active');
        });
    }

    if (toggleStatsBtn) {
        toggleStatsBtn.addEventListener('change', (e) => {
             if (statsOverlay) statsOverlay.classList.toggle('hidden', !e.target.checked);
        });
    }
    if (toggleHapticsBtn) {
        toggleHapticsBtn.addEventListener('change', (e) => {
            hapticsEnabled = e.target.checked;
            showToast(hapticsEnabled ? 'Getar Aktif' : 'Getar Nonaktif');
            if(hapticsEnabled) performHapticFeedback(100);
        });
    }
    
    if (disconnectBtn) {
        disconnectBtn.addEventListener('click', () => {
            if (remotePage) remotePage.style.display = 'none';
            if (loginPage) loginPage.style.display = 'flex';
            closeModal(settingsModal);
            if (isCustomizing) toggleCustomizationMode(true);
            showToast('Disconnected from session.');
            if (document.fullscreenElement) document.exitFullscreen();
        });
    }
    
    if (enterCustomizeBtn) enterCustomizeBtn.addEventListener('click', () => toggleCustomizationMode(false));
    if (exitCustomizeBtn) exitCustomizeBtn.addEventListener('click', () => toggleCustomizationMode(true));

    function addEditListener(element) {
        element.addEventListener('click', (e) => {
            if (isCustomizing && e.target.closest('.draggable') === element) {
                e.stopPropagation();
                currentEditingElement = element;
                openEditModal(element);
            }
        });
    }
    
    document.querySelectorAll('.draggable').forEach(addEditListener);

    function openEditModal(el) {
        const label = el.dataset.label || '';
        const command = el.dataset.command || 'N/A';
        const scale = el.dataset.scale || "1.0";
        const style = el.dataset.style || "circle";
        const mode = el.dataset.mode || "press";
        
        if (editKeyLabel) editKeyLabel.value = label;
        if (editKeyCommand) editKeyCommand.value = command;
        if (editKeySize) editKeySize.value = parseFloat(scale) * 100;
        if (editKeySizeValue) editKeySizeValue.textContent = Math.round(parseFloat(scale) * 100);

        if (editKeyStyleWrapper) {
            editKeyStyleWrapper.querySelectorAll('.choice-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.style === style);
            });
        }
        if (editKeyModeWrapper) {
            editKeyModeWrapper.querySelectorAll('.choice-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.mode === mode);
            });
        }
        
        const isSpecialButton = style === 'analog' || style === 'dpad' || command === 'SPECIAL_PASTE';
        if (editKeyLabelWrapper) editKeyLabelWrapper.style.display = 'block';
        if (editKeyCommandWrapper) editKeyCommandWrapper.style.display = isSpecialButton ? 'none' : 'block';
        if (editKeyStyleWrapperParent) editKeyStyleWrapperParent.style.display = isSpecialButton ? 'none' : 'block';
        if (editKeyModeWrapperParent) editKeyModeWrapperParent.style.display = isSpecialButton ? 'none' : 'block';
        
        if(command === 'SPECIAL_PASTE') {
            if (editKeyLabelWrapper) editKeyLabelWrapper.style.display = 'none';
        }

        openModal(editKeyModal);
    }
    
    if (closeEditKeyModal) closeEditKeyModal.addEventListener('click', () => closeModal(editKeyModal));
    
    if (saveEditKeyBtn) {
        saveEditKeyBtn.addEventListener('click', () => {
            if (!currentEditingElement) return;
            
            const newLabel = editKeyLabel.value;
            const newScale = parseFloat(editKeySize.value) / 100;
            const newStyle = editKeyStyleWrapper.querySelector('.active')?.dataset.style || currentEditingElement.dataset.style;
            const newMode = editKeyModeWrapper.querySelector('.active')?.dataset.mode || currentEditingElement.dataset.mode;
            
            currentEditingElement.dataset.label = newLabel;
            currentEditingElement.dataset.scale = newScale.toFixed(2);
            currentEditingElement.dataset.style = newStyle;
            currentEditingElement.dataset.mode = newMode;
            
            const labelEl = currentEditingElement.querySelector('.btn-label');
            if (labelEl) {
                if(currentEditingElement.dataset.command !== 'SPECIAL_PASTE') {
                     labelEl.textContent = newLabel;
                }
            }
            
            if (newStyle === 'rectangle') {
                currentEditingElement.classList.add('text-btn');
            } else {
                currentEditingElement.classList.remove('text-btn');
            }
            
            const x = parseFloat(currentEditingElement.getAttribute('data-x')) || 0;
            const y = parseFloat(currentEditingElement.getAttribute('data-y')) || 0;
            currentEditingElement.style.transform = `translate(${x}px, ${y}px) scale(${newScale})`;
            
            showToast('Tombol diperbarui!');
            closeModal(editKeyModal);
            currentEditingElement = null;
        });
    }
    
    if (deleteKeyBtn) {
        deleteKeyBtn.addEventListener('click', () => {
            if (!currentEditingElement) return;
            currentEditingElement.remove();
            showToast('Tombol dihapus');
            closeModal(editKeyModal);
            currentEditingElement = null;
        });
    }
    
    if (editKeySize) {
        editKeySize.addEventListener('input', (e) => {
            if (editKeySizeValue) editKeySizeValue.textContent = e.target.value;
            if (currentEditingElement) {
                const newScale = parseFloat(e.target.value) / 100;
                const x = parseFloat(currentEditingElement.getAttribute('data-x')) || 0;
                const y = parseFloat(currentEditingElement.getAttribute('data-y')) || 0;
                currentEditingElement.style.transform = `translate(${x}px, ${y}px) scale(${newScale})`;
            }
        });
    }

    if (editKeyStyleWrapper) {
        editKeyStyleWrapper.addEventListener('click', (e) => {
            const targetBtn = e.target.closest('.choice-btn');
            if (!targetBtn) return;
            editKeyStyleWrapper.querySelectorAll('.choice-btn').forEach(btn => btn.classList.remove('active'));
            targetBtn.classList.add('active');
        });
    }
    if (editKeyModeWrapper) {
        editKeyModeWrapper.addEventListener('click', (e) => {
            const targetBtn = e.target.closest('.choice-btn');
            if (!targetBtn) return;
            editKeyModeWrapper.querySelectorAll('.choice-btn').forEach(btn => btn.classList.remove('active'));
            targetBtn.classList.add('active');
        });
    }
    
    // --- Logika Keyboard v19 ---
    
    // 1. Keyboard BINDING (Popup)
    if (addKeyBtn) {
        addKeyBtn.addEventListener('click', () => {
            openModal(bindingKeyboardModal);
        });
    }
    if (closeBindingKeyboardBtn) {
         closeBindingKeyboardBtn.addEventListener('click', () => {
            closeModal(bindingKeyboardModal);
        });
    }
    if (bindingKeyboardModal) {
        bindingKeyboardModal.querySelectorAll('.kbd-key').forEach(key => {
            key.addEventListener('click', () => {
                const keyVal = key.dataset.key;
                if (!keyVal) return;
                const label = (keyVal === 'SPECIAL_PASTE') ? 'Paste' : (keyVal.length > 1 ? keyVal : keyVal.toUpperCase());
                addNewDraggable('key', label, keyVal);
                closeModal(bindingKeyboardModal);
                showToast(`Tombol "${label}" ditambahkan! Klik untuk edit.`);
            });
        });
    }

    // 2. Keyboard SLIDING (In-Game)
    if (globalKeyboardBtn) {
        globalKeyboardBtn.addEventListener('click', () => {
            if (slidingKeyboard) slidingKeyboard.classList.add('show');
            // Selalu reset ke layer utama saat dibuka
            switchKeyboardLayer('kbd-layer-main');
        });
    }
    if (closeSlidingKeyboardBtn) {
        closeSlidingKeyboardBtn.addEventListener('click', () => {
            if (slidingKeyboard) slidingKeyboard.classList.remove('show');
        });
    }

    // Fungsi untuk mengganti layer keyboard
    function switchKeyboardLayer(layerId) {
        if (!slidingKeyboardLayers) return;
        
        // Sembunyikan semua layer
        slidingKeyboardLayers.querySelectorAll('.kbd-layer').forEach(layer => {
            layer.classList.remove('active');
            layer.classList.add('hidden');
        });

        // Tampilkan layer yang benar (di KIRI dan KANAN)
        const newLayerLeft = document.getElementById(`${layerId}-left`);
        const newLayerRight = document.getElementById(`${layerId}-right`);

        if (newLayerLeft && newLayerRight) {
            newLayerLeft.classList.remove('hidden');
            newLayerLeft.classList.add('active');
            newLayerRight.classList.remove('hidden');
            newLayerRight.classList.add('active');
        } else {
            // Fallback jika hanya ada satu layer (misal main)
            const mainLayer = document.getElementById(layerId);
            if(mainLayer) {
                 mainLayer.classList.remove('hidden');
                 mainLayer.classList.add('active');
            }
        }
    }

    if (slidingKeyboard) {
        slidingKeyboard.querySelectorAll('.kbd-key').forEach(key => {
            key.addEventListener('click', () => {
                const keyVal = key.dataset.key;
                if (!keyVal) return;

                performHapticFeedback();
                
                // PERUBAHAN v19: Logika ganti layer
                if (keyVal === '?123') {
                    switchKeyboardLayer('kbd-layer-symbols1');
                    return;
                }
                if (keyVal === 'ABC') {
                    switchKeyboardLayer('kbd-layer-main');
                    return;
                }
                // PERBAIKAN v19: Bug, harusnya #{<
                if (keyVal === '#{<') {
                    switchKeyboardLayer('kbd-layer-symbols2');
                    return;
                }
                
                // Logika aksi
                if (keyVal === 'SPECIAL_PASTE') {
                    handlePasteCommand();
                } else {
                    showToast(`Mengirim tombol: ${keyVal}`);
                    // Di aplikasi nyata: kirim keyVal ke host
                }
            });
        });
    }
    
    // Alur Tambah Joystick
    if (addJoystickBtn) {
        addJoystickBtn.addEventListener('click', () => {
            openModal(addJoystickModal);
        });
    }
    if (closeAddJoystickModal) closeAddJoystickModal.addEventListener('click', () => closeModal(addJoystickModal));

    document.querySelectorAll('.add-control-sim-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            if (type === 'analog') {
                addNewDraggable('analog');
                showToast('Joystick Analog ditambahkan');
            } else if (type === 'dpad') {
                addNewDraggable('dpad');
                showToast('D-Pad (WASD) ditambahkan');
            }
            closeModal(addJoystickModal);
        });
    });

    // Haptic Feedback
    function performHapticFeedback(duration = 50) {
        if (hapticsEnabled && navigator.vibrate) {
            navigator.vibrate(duration);
        }
    }
    
    function handlePasteCommand() {
        if (navigator.clipboard && navigator.clipboard.readText) {
            navigator.clipboard.readText()
                .then(text => {
                    if (!text) {
                        showToast('Clipboard HP kosong', true);
                        return;
                    }
                    console.log(`Mengirim Clipboard: ${text.substring(0, 20)}...`);
                    showToast('Clipboard dikirim ke PC! (Simulasi)');
                })
                .catch(err => {
                    showToast('Gagal membaca clipboard. Izin ditolak?', true);
                });
        } else {
            showToast('Browser tidak mendukung clipboard API', true);
        }
    }

    // Listener Responsif (PointerDown)
    function addResponsiveListener(element) {
        if (!element) return;
        let pressTimer = null; // Untuk mode Turbo

        element.addEventListener('pointerdown', (e) => {
            if (isCustomizing) return; 
            e.preventDefault();
            element.classList.add('active-state');
            performHapticFeedback();
            
            const command = element.dataset.command || element.id;
            const mode = element.dataset.mode || 'press';
            
            if (command === 'SPECIAL_PASTE') {
                handlePasteCommand();
                return;
            }

            if (mode === 'toggle') {
                // Toggle dihandle di pointerup
            } else if (mode === 'turbo') {
                console.log(`[PointerDown-Turbo] Mengirim: ${command}`);
                if (pressTimer) clearInterval(pressTimer);
                pressTimer = setInterval(() => {
                    console.log(`[Turbo] Mengirim: ${command}`);
                }, 100); // 10x per detik
            } else {
                console.log(`[PointerDown] Mengirim: ${command}`);
            }
        });
        
        const onPointerUp = (e) => {
            if (isCustomizing) return;
            element.classList.remove('active-state');
            const command = element.dataset.command || element.id;
            const mode = element.dataset.mode || 'press';
            
            if(command === 'SPECIAL_PASTE') return;
            
            if (pressTimer) clearInterval(pressTimer);
            
            if (mode === 'toggle') {
                console.log(`[PointerUp - Toggle] Mengirim: ${command}`);
            } else {
                console.log(`[PointerUp] Mengirim: ${command}`);
            }
        };
        
        element.addEventListener('pointerup', onPointerUp);
        element.addEventListener('pointerleave', onPointerUp);
        element.addEventListener('pointercancel', onPointerUp);
    }
    
    document.querySelectorAll('.draggable[data-command]').forEach(addResponsiveListener);
    
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                if (remotePage) remotePage.requestFullscreen();
            } 
            else { document.exitFullscreen(); }
            closeModal(settingsModal);
        });
    }
    
    if (buttonOpacitySlider) {
        buttonOpacitySlider.addEventListener('input', (e) => {
            const opacity = e.target.value / 100;
            if (opacityValue) opacityValue.textContent = e.target.value;
            document.documentElement.style.setProperty('--button-opacity', opacity.toFixed(2));
        });
    }

    // Simulasi Simpan/Muat Layout
    if (saveLayoutBtn) {
        saveLayoutBtn.addEventListener('click', () => {
            const layoutName = saveLayoutInput.value;
            if (!layoutName) {
                showToast('Masukkan nama layout', true);
                return;
            }
            const newLayout = { id: Date.now(), name: layoutName };
            savedLayouts.push(newLayout);
            updateLayoutList();
            saveLayoutInput.value = '';
            showToast(`Layout "${layoutName}" disimpan!`);
        });
    }
    
    if (loadLayoutBtn) {
        loadLayoutBtn.addEventListener('click', () => {
            const code = loadLayoutInput.value;
            if (!code) {
                showToast('Masukkan kode share', true);
                return;
            }
            showToast(`Memuat layout dari kode... (Simulasi)`);
            loadLayoutInput.value = '';
        });
    }

    function updateLayoutList() {
        if (!savedLayoutsList) return;
        if (savedLayouts.length === 0) {
            savedLayoutsList.innerHTML = `<p class="text-gray-400 text-sm">Belum ada layout yang disimpan.</p>`;
            return;
        }
        savedLayoutsList.innerHTML = '';
        savedLayouts.forEach(layout => {
            const div = document.createElement('div');
            div.className = 'flex items-center justify-between p-3 bg-gray-700 rounded-lg';
            div.innerHTML = `
                <span class="font-semibold">${layout.name}</span>
                <div class="flex gap-2">
                    <button class="text-sm text-green-400" data-load-id="${layout.id}">Muat</button>
                    <button class="text-sm text-blue-400" data-share-id="${layout.id}">Share</button>
                    <button class="text-sm text-red-400" data-delete-id="${layout.id}">Hapus</button>
                </div>
            `;
            savedLayoutsList.appendChild(div);
        });
    }

    if (savedLayoutsList) {
        savedLayoutsList.addEventListener('click', (e) => {
            const target = e.target;
            if (target.dataset.loadId) {
                showToast(`Memuat layout... (Simulasi)`);
                closeModal(settingsModal);
            }
            if (target.dataset.shareId) {
                const shareCode = `XYC_SHARE_${Date.now()}`;
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(shareCode).then(() => {
                        showToast(`Kode share disalin!`);
                    });
                } else {
                    showToast(`Kode Share: ${shareCode}`);
                }
            }
            if (target.dataset.deleteId) {
                const id = parseInt(target.dataset.deleteId);
                savedLayouts = savedLayouts.filter(l => l.id !== id);
                updateLayoutList();
                showToast(`Layout dihapus.`);
            }
        });
    }

    updateLayoutList();
});
</script>