// ================== КЛАСС ИГРЫ ==================
class ProCubeGame {
    constructor() {
        // Основные переменные Three.js
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.cube = null;
        this.cubelets = [];
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // Очередь ходов и настройки анимации
        this.moveQueue = [];
        this.isProcessingQueue = false;
        this.rotationDurationMs = 220;
        
        // Состояние игры
        this.isRotating = false;
        this.isDraggingCamera = false;
        this.moveCount = 0;
        this.startTime = null;
        this.timerInterval = null;
        this.isSolved = false;
        this.isShuffling = false;
        
        // Система уровней и монет
        this.currentLevel = parseInt(localStorage.getItem('procube_level') || '1');
        this.coins = parseInt(localStorage.getItem('procube_coins') || '0');
        this.bestMoves = parseInt(localStorage.getItem('procube_best_moves') || '999');
        this.bestTime = localStorage.getItem('procube_best_time') || '--:--';
        
        // Цветовая схема кубика
        this.colors = {
            white: 0xffffff,
            yellow: 0xffff00,
            red: 0xff0000,
            orange: 0xff8000,
            blue: 0x0000ff,
            green: 0x00ff00,
            black: 0x111111
        };
        
        // Купленные предметы
        this.ownedItems = JSON.parse(localStorage.getItem('procube_items') || '[]');
        
        this.init();
    }
    
    init() {
        this.createScene();
        this.createLighting();
        this.createCube();
        this.setupEventListeners();
        this.setupMobileControls();
        this.updateUI();
        this.animate();
    }
    
    // ================== СОЗДАНИЕ СЦЕНЫ ==================
    createScene() {
        // Сцена
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x001122);
        
        // Камера
        const canvas = document.getElementById('gameCanvas');
        const aspect = canvas.clientWidth / canvas.clientHeight;
        this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
        this.camera.position.set(8, 8, 8);
        this.camera.lookAt(0, 0, 0);
        
        // Рендерер (оптимизирован)
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: canvas,
            antialias: false, // Отключаем для производительности
            alpha: false,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        this.renderer.shadowMap.enabled = false; // Отключаем тени
        this.renderer.setClearColor(0x001122, 1);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Ограничиваем DPI
        
        // Обработка изменения размера окна
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    createLighting() {
        // Простое освещение для производительности
        const ambientLight = new THREE.AmbientLight(0x404080, 0.8);
        this.scene.add(ambientLight);
        
        // Один основной источник света
        const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
        mainLight.position.set(10, 10, 5);
        this.scene.add(mainLight);
    }
    
    // ================== СОЗДАНИЕ КУБИКА ==================
    createCube() {
        if (this.cube) {
            this.scene.remove(this.cube);
        }
        
        this.cube = new THREE.Group();
        this.cubelets = [];
        
        // Оптимизированный размер кубика
        const size = 1.2;
        const gap = 0.05;
        const spacing = size + gap;
        
        // Создание 27 маленьких кубиков (3x3x3)
        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                for (let z = -1; z <= 1; z++) {
                    const cubelet = this.createCubelet(size);
                    cubelet.position.set(x * spacing, y * spacing, z * spacing);
                    cubelet.userData = { 
                        originalPosition: { x, y, z },
                        currentPosition: { x, y, z }
                    };
                    
                    this.cube.add(cubelet);
                    this.cubelets.push(cubelet);
                }
            }
        }
        
        this.scene.add(this.cube);
        this.colorCube();
    }
    
    createCubelet(size) {
        // Переиспользуем геометрию для всех кубиков
        if (!this.sharedGeometry) {
            // Упрощенная геометрия для производительности
            this.sharedGeometry = new THREE.BoxGeometry(size, size, size, 1, 1, 1);
        }
        
        // Простые материалы для производительности
        const materials = [];
        for (let i = 0; i < 6; i++) {
            const material = new THREE.MeshLambertMaterial({ 
                color: this.colors.black
            });
            materials.push(material);
        }
        
        const cubelet = new THREE.Mesh(this.sharedGeometry, materials);
        
        // Упрощенная рамка
        if (!this.sharedEdges) {
            this.sharedEdges = new THREE.EdgesGeometry(this.sharedGeometry);
            this.sharedLineMaterial = new THREE.LineBasicMaterial({ 
                color: 0x000000
            });
        }
        const wireframe = new THREE.LineSegments(this.sharedEdges, this.sharedLineMaterial);
        cubelet.add(wireframe);
        
        return cubelet;
    }
    
    colorCube() {
        this.cubelets.forEach(cubelet => {
            const { x, y, z } = cubelet.userData.currentPosition;
            
            // Правая грань (красная)
            if (x === 1) {
                cubelet.material[0].color.setHex(this.colors.red);
            }
            // Левая грань (оранжевая)
            if (x === -1) {
                cubelet.material[1].color.setHex(this.colors.orange);
            }
            // Верхняя грань (белая)
            if (y === 1) {
                cubelet.material[2].color.setHex(this.colors.white);
            }
            // Нижняя грань (желтая)
            if (y === -1) {
                cubelet.material[3].color.setHex(this.colors.yellow);
            }
            // Передняя грань (зеленая)
            if (z === 1) {
                cubelet.material[4].color.setHex(this.colors.green);
            }
            // Задняя грань (синяя)
            if (z === -1) {
                cubelet.material[5].color.setHex(this.colors.blue);
            }
        });
    }
    
    // ================== УПРАВЛЕНИЕ КАМЕРОЙ И МОБИЛЬНЫЕ КОНТРОЛИ ==================
    setupCameraControls() {
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };
        let touchStartTime = 0;
        let touchStartPosition = { x: 0, y: 0 };
        let lastTouchTime = 0;
        
        const canvas = this.renderer.domElement;
        
        // Оптимизированные обработчики мыши для десктопа
        canvas.addEventListener('mousedown', (e) => {
            if (this.isRotating || this.isShuffling) return;
            
            // Проверяем клик по кубику
            if (!this.checkCubeClick(e)) {
                isDragging = true;
                this.isDraggingCamera = true;
                previousMousePosition = { x: e.clientX, y: e.clientY };
            }
        }, { passive: false });
        
        canvas.addEventListener('mousemove', (e) => {
            if (!isDragging || !this.isDraggingCamera) return;
            
            // Throttle движения мыши для производительности
            if (!this.mouseThrottle) {
                this.mouseThrottle = setTimeout(() => {
                    const deltaMove = {
                        x: e.clientX - previousMousePosition.x,
                        y: e.clientY - previousMousePosition.y
                    };
                    
                    this.rotateCameraAroundCube(deltaMove);
                    previousMousePosition = { x: e.clientX, y: e.clientY };
                    this.mouseThrottle = null;
                }, 16); // 60 FPS
            }
        }, { passive: true });
        
        canvas.addEventListener('mouseup', () => {
            isDragging = false;
            this.isDraggingCamera = false;
        }, { passive: true });
        
        // Блокируем контекстное меню для правого клика (используем его как R')
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // ================ УЛУЧШЕННЫЕ ТАЧ-КОНТРОЛИ ДЛЯ МОБИЛЬНЫХ ================
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            
            if (e.touches.length === 1) {
                const touch = e.touches[0];
                touchStartTime = Date.now();
                touchStartPosition = { x: touch.clientX, y: touch.clientY };
                
                if (this.isRotating || this.isShuffling) return;
                
                // Попробуем сначала обработать как клик по кубику
                if (!this.checkCubeTouchClick(touch)) {
                    isDragging = true;
                    this.isDraggingCamera = true;
                    previousMousePosition = {
                        x: touch.clientX,
                        y: touch.clientY
                    };
                }
            } else if (e.touches.length === 2) {
                // Двойное касание - масштабирование
                this.handlePinchStart(e);
            }
        }, { passive: false });
        
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            
            if (e.touches.length === 1) {
                const touch = e.touches[0];
                
                if (isDragging && this.isDraggingCamera) {
                    // Обычное вращение камеры
                    const deltaMove = {
                        x: touch.clientX - previousMousePosition.x,
                        y: touch.clientY - previousMousePosition.y
                    };
                    
                    this.rotateCameraAroundCube(deltaMove);
                    previousMousePosition = { x: touch.clientX, y: touch.clientY };
                } else if (!this.isRotating && !this.isShuffling) {
                    // Проверяем на свайп-жесты для поворота кубика
                    this.handleTouchSwipe(touchStartPosition, { x: touch.clientX, y: touch.clientY });
                }
            } else if (e.touches.length === 2) {
                // Масштабирование
                this.handlePinchMove(e);
            }
        }, { passive: false });
        
        canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            
            const touchEndTime = Date.now();
            const touchDuration = touchEndTime - touchStartTime;
            
            // Если было быстрое касание (тап), проверяем на двойной тап
            if (touchDuration < 300 && !isDragging) {
                const timeSinceLastTouch = touchEndTime - lastTouchTime;
                
                if (timeSinceLastTouch < 300) {
                    // Двойной тап - поворот вида
                    this.handleDoubleTap();
                }
                
                lastTouchTime = touchEndTime;
            }
            
            isDragging = false;
            this.isDraggingCamera = false;
            touchStartTime = 0;
        }, { passive: false });
        
        // Предотвращение стандартных жестов браузера
        canvas.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
        canvas.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false });
        canvas.addEventListener('gestureend', (e) => e.preventDefault(), { passive: false });
    }
    
    // ================ ОБРАБОТКА СВАЙП-ЖЕСТОВ ================
    handleTouchSwipe(startPos, endPos) {
        const deltaX = endPos.x - startPos.x;
        const deltaY = endPos.y - startPos.y;
        const minSwipeDistance = 50; // Минимальное расстояние для свайпа
        
        // Проверяем, достаточно ли длинный свайп
        if (Math.abs(deltaX) < minSwipeDistance && Math.abs(deltaY) < minSwipeDistance) {
            return;
        }
        
        // Определяем направление свайпа
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // Горизонтальный свайп
            if (deltaX > 0) {
                // Свайп вправо
                this.handleSwipeGesture('right');
            } else {
                // Свайп влево
                this.handleSwipeGesture('left');
            }
        } else {
            // Вертикальный свайп
            if (deltaY > 0) {
                // Свайп вниз
                this.handleSwipeGesture('down');
            } else {
                // Свайп вверх
                this.handleSwipeGesture('up');
            }
        }
    }
    
    handleSwipeGesture(direction) {
        if (this.isRotating || this.isShuffling) return;
        
        // Определяем какую грань поворачивать на основе текущего вида камеры
        const cameraDirection = this.getCameraDirection();
        let move = '';
        
        switch (direction) {
            case 'up':
                if (cameraDirection.front) move = 'U';
                else if (cameraDirection.back) move = 'U\'';
                else if (cameraDirection.left) move = 'L';
                else if (cameraDirection.right) move = 'R\'';
                break;
            case 'down':
                if (cameraDirection.front) move = 'D';
                else if (cameraDirection.back) move = 'D\'';
                else if (cameraDirection.left) move = 'L\'';
                else if (cameraDirection.right) move = 'R';
                break;
            case 'left':
                if (cameraDirection.front) move = 'L';
                else if (cameraDirection.back) move = 'R';
                else if (cameraDirection.top) move = 'F\'';
                else if (cameraDirection.bottom) move = 'F';
                break;
            case 'right':
                if (cameraDirection.front) move = 'R';
                else if (cameraDirection.back) move = 'L\'';
                else if (cameraDirection.top) move = 'F';
                else if (cameraDirection.bottom) move = 'F\'';
                break;
        }
        
        if (move) {
            this.performRotation(move);
            this.showSwipeIndicator(direction, move);
        }
    }
    
    getCameraDirection() {
        const cameraPos = this.camera.position.clone().normalize();
        
        return {
            front: cameraPos.z > 0.5,
            back: cameraPos.z < -0.5,
            left: cameraPos.x < -0.5,
            right: cameraPos.x > 0.5,
            top: cameraPos.y > 0.5,
            bottom: cameraPos.y < -0.5
        };
    }
    
    showSwipeIndicator(direction, move) {
        // Показываем индикатор свайпа пользователю
        const indicator = document.createElement('div');
        indicator.className = 'swipe-indicator';
        indicator.textContent = `${this.getDirectionEmoji(direction)} ${move}`;
        indicator.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 170, 255, 0.9);
            color: white;
            padding: 10px 20px;
            border-radius: 20px;
            font-size: 24px;
            font-weight: bold;
            z-index: 10000;
            pointer-events: none;
            animation: swipeIndicatorShow 0.8s ease-out forwards;
        `;
        
        document.body.appendChild(indicator);
        
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        }, 800);
    }
    
    getDirectionEmoji(direction) {
        const emojis = {
            up: '⬆️',
            down: '⬇️',
            left: '⬅️',
            right: '➡️'
        };
        return emojis[direction] || '🔄';
    }
    
    handleDoubleTap() {
        // Двойной тап для автоматического поворота вида
        this.animateCameraToPosition();
    }
    
    animateCameraToPosition() {
        const positions = [
            { x: 8, y: 8, z: 8 },    // Изометрический вид
            { x: 0, y: 0, z: 12 },   // Фронтальный вид
            { x: 12, y: 0, z: 0 },   // Боковой вид
            { x: 0, y: 12, z: 0 }    // Вид сверху
        ];
        
        if (!this.currentViewIndex) this.currentViewIndex = 0;
        this.currentViewIndex = (this.currentViewIndex + 1) % positions.length;
        
        const targetPos = positions[this.currentViewIndex];
        const duration = 1000;
        const startPos = this.camera.position.clone();
        const startTime = Date.now();
        
        const animateCamera = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = this.easeInOutCubic(progress);
            
            this.camera.position.lerpVectors(startPos, new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z), eased);
            this.camera.lookAt(0, 0, 0);
            
            if (progress < 1) {
                requestAnimationFrame(animateCamera);
            }
        };
        
        animateCamera();
    }
    
    // Масштабирование для мобильных (пинч)
    handlePinchStart(e) {
        if (e.touches.length === 2) {
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            this.lastPinchDistance = Math.sqrt(
                Math.pow(touch2.clientX - touch1.clientX, 2) +
                Math.pow(touch2.clientY - touch1.clientY, 2)
            );
        }
    }
    
    handlePinchMove(e) {
        if (e.touches.length === 2 && this.lastPinchDistance) {
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const currentDistance = Math.sqrt(
                Math.pow(touch2.clientX - touch1.clientX, 2) +
                Math.pow(touch2.clientY - touch1.clientY, 2)
            );
            
            const scale = currentDistance / this.lastPinchDistance;
            
            // Масштабируем камеру
            const newDistance = this.camera.position.length() / scale;
            const clampedDistance = Math.max(5, Math.min(15, newDistance));
            
            this.camera.position.normalize().multiplyScalar(clampedDistance);
            this.camera.lookAt(0, 0, 0);
            
            this.lastPinchDistance = currentDistance;
        }
    }
    
    rotateCameraAroundCube(deltaMove) {
        const rotationSpeed = 0.005;
        
        // Создаем сферические координаты
        const spherical = new THREE.Spherical();
        spherical.setFromVector3(this.camera.position);
        spherical.theta -= deltaMove.x * rotationSpeed;
        spherical.phi += deltaMove.y * rotationSpeed;
        
        // Ограничиваем вертикальное вращение
        spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));
        
        this.camera.position.setFromSpherical(spherical);
        this.camera.lookAt(0, 0, 0);
    }
    
    // ================== ВЗАИМОДЕЙСТВИЕ С КУБИКОМ ==================
    checkCubeClick(event) {
        if (this.isRotating || this.isShuffling) return false;
        
        const canvas = this.renderer.domElement;
        const rect = canvas.getBoundingClientRect();
        
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.cubelets, true);
        
        if (intersects.length > 0) {
            const intersectedObject = intersects[0].object;
            if (intersectedObject.parent && this.cubelets.includes(intersectedObject.parent)) {
                const cubelet = intersectedObject.parent;
                const face = intersects[0].face;
                const move = this.getMoveFromFace(cubelet, face);
                if (move) {
                    const isPrime = !!(event && (event.shiftKey || event.button === 2 || event.altKey || event.ctrlKey));
                    const finalMove = isPrime ? `${move}'` : move;
                    this.performRotation(finalMove);
                    return true;
                }
            }
        }
        return false;
    }
    
    checkCubeTouchClick(touch) {
        if (this.isRotating || this.isShuffling) return false;
        
        const canvas = this.renderer.domElement;
        const rect = canvas.getBoundingClientRect();
        
        this.mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.cubelets, true);
        
        if (intersects.length > 0) {
            const intersectedObject = intersects[0].object;
            if (intersectedObject.parent && this.cubelets.includes(intersectedObject.parent)) {
                const cubelet = intersectedObject.parent;
                const face = intersects[0].face;
                const move = this.getMoveFromFace(cubelet, face);
                if (move) {
                    this.performRotation(move);
                    return true;
                }
            }
        }
        return false;
    }
    
    getMoveFromFace(cubelet, face) {
        const faceIndex = Math.floor(face.materialIndex || 0);
        const { x, y, z } = cubelet.userData.currentPosition;
        
        // Определяем ход на основе индекса грани и позиции кубика
        switch (faceIndex) {
            case 0: return x === 1 ? 'R' : null; // Правая грань
            case 1: return x === -1 ? 'L' : null; // Левая грань
            case 2: return y === 1 ? 'U' : null; // Верхняя грань
            case 3: return y === -1 ? 'D' : null; // Нижняя грань
            case 4: return z === 1 ? 'F' : null; // Передняя грань
            case 5: return z === -1 ? 'B' : null; // Задняя грань
            default: return null;
        }
    }
    
    // ================== ЛОГИКА ПОВОРОТОВ ==================
    performRotation(move) {
        // Очередь ходов: если сейчас идет поворот, добавляем в очередь
        if (this.isRotating) {
            this.moveQueue.push(move);
            return;
        }
        
        const parsed = this.parseMove(move);
        const baseMove = parsed.base;
        const quarterTurns = parsed.quarterTurns; // может быть -2..2
        if (!baseMove || quarterTurns === 0) return;
        
        const axis = this.getMoveAxis(baseMove);
        const face = this.getFaceCubelets(baseMove);
        // Направление угла для согласованности с классическими ходами (R/U/F по часовой стрелке)
        const baseSign = ['R','U','F'].includes(baseMove) ? 1 : -1;
        const angle = baseSign * (Math.PI / 2) * quarterTurns;
        
        this.isRotating = true;
        this.animateRotation(face, axis, angle, baseMove, quarterTurns, () => {
            this.isRotating = false;
            if (!this.isShuffling) {
                this.incrementMoveCount();
                this.updateProgress();
                setTimeout(() => this.checkIfSolved(), 100);
            }
            // Продолжаем очередь
            if (this.moveQueue.length > 0) {
                const next = this.moveQueue.shift();
                // Небольшая пауза для плавности
                setTimeout(() => this.performRotation(next), 10);
            }
            // Если это была сессия перемешивания и очередь пуста – завершаем
            if (this.isShuffling && this.moveQueue.length === 0 && !this.isRotating) {
                this.isShuffling = false;
                this.resetMoveCount();
                this.resetTimer();
                this.isSolved = false;
                this.updateGameStatus('🎯 Кубик перемешан! Начните сборку!');
                this.updateProgress();
            }
        });
    }

    parseMove(move) {
        // Поддержка форматов: "R", "R'", "R2"
        if (!move || typeof move !== 'string') return { base: null, quarterTurns: 0 };
        const base = move[0];
        let quarterTurns = 1;
        if (move.includes("2")) quarterTurns = 2;
        if (move.includes("'")) quarterTurns = -quarterTurns;
        return { base, quarterTurns };
    }
    
    getMoveAxis(move) {
        switch (move) {
            case 'R':
            case 'L':
                return new THREE.Vector3(1, 0, 0);
            case 'U':
            case 'D':
                return new THREE.Vector3(0, 1, 0);
            case 'F':
            case 'B':
                return new THREE.Vector3(0, 0, 1);
            default:
                return new THREE.Vector3(0, 1, 0);
        }
    }
    
    getFaceCubelets(move) {
        return this.cubelets.filter(cubelet => {
            const { x, y, z } = cubelet.userData.currentPosition;
            switch (move) {
                case 'R': return x === 1;
                case 'L': return x === -1;
                case 'U': return y === 1;
                case 'D': return y === -1;
                case 'F': return z === 1;
                case 'B': return z === -1;
                default: return false;
            }
        });
    }
    
    animateRotation(cubelets, axis, angle, baseMove, quarterTurns, callback) {
        const group = new THREE.Group();
        this.scene.add(group);
        
        // Перемещаем кубики в группу-поворот
        cubelets.forEach(cubelet => {
            this.cube.remove(cubelet);
            group.add(cubelet);
        });
        
        // Кватернионы для плавного поворота
        const startQuat = group.quaternion.clone();
        const deltaQuat = new THREE.Quaternion().setFromAxisAngle(axis.clone().normalize(), angle);
        const endQuat = startQuat.clone().multiply(deltaQuat);
        
        const duration = this.rotationDurationMs;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = this.easeInOutCubic(progress);
            group.quaternion.slerpQuaternions(startQuat, endQuat, eased);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Зафиксировать итоговую ориентацию
                group.quaternion.copy(endQuat);
                group.updateMatrixWorld(true);
                
                // Применяем трансформацию к каждому кубику и возвращаем в основной контейнер
                const rotMatrix = new THREE.Matrix4().makeRotationFromQuaternion(endQuat);
                cubelets.forEach(cubelet => {
                    group.remove(cubelet);
                    this.cube.add(cubelet);
                    
                    // Позиция
                    cubelet.position.applyMatrix4(rotMatrix);
                    // Ориентация
                    cubelet.quaternion.premultiply(endQuat);
                });
                
                this.scene.remove(group);
                this.updateCubeletData(cubelets, baseMove, quarterTurns);
                
                if (callback) callback();
            }
        };
        
        animate();
    }
    
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    }
    
    updateCubeletData(cubelets, baseMove, quarterTurns) {
        const turns = Math.abs(quarterTurns) % 4;
        const dir = quarterTurns >= 0 ? 1 : -1; // 1: по часовой, -1: против
        if (turns === 0) return;
        
        const applyTurn = (pos) => {
            let { x, y, z } = pos;
            let newX = x, newY = y, newZ = z;
            switch (baseMove) {
                case 'R':
                    if (dir === 1) { newY = z; newZ = -y; } else { newY = -z; newZ = y; }
                    break;
                case 'L':
                    if (dir === 1) { newY = -z; newZ = y; } else { newY = z; newZ = -y; }
                    break;
                case 'U':
                    if (dir === 1) { newX = -z; newZ = x; } else { newX = z; newZ = -x; }
                    break;
                case 'D':
                    if (dir === 1) { newX = z; newZ = -x; } else { newX = -z; newZ = x; }
                    break;
                case 'F':
                    if (dir === 1) { newX = y; newY = -x; } else { newX = -y; newY = x; }
                    break;
                case 'B':
                    if (dir === 1) { newX = -y; newY = x; } else { newX = y; newY = -x; }
                    break;
            }
            return { x: newX, y: newY, z: newZ };
        };
        
        cubelets.forEach(cubelet => {
            let pos = cubelet.userData.currentPosition;
            for (let i = 0; i < turns; i++) {
                pos = applyTurn(pos);
            }
            // Нормируем (избегаем -0)
            pos = { x: Math.sign(pos.x) * Math.min(Math.abs(pos.x), 1), y: Math.sign(pos.y) * Math.min(Math.abs(pos.y), 1), z: Math.sign(pos.z) * Math.min(Math.abs(pos.z), 1) };
            cubelet.userData.currentPosition = pos;
            // Подровняем позицию по сетке (устранение накопленной погрешности)
            cubelet.position.x = Math.round(cubelet.position.x * 20) / 20;
            cubelet.position.y = Math.round(cubelet.position.y * 20) / 20;
            cubelet.position.z = Math.round(cubelet.position.z * 20) / 20;
        });
    }
    
    // ================== ИГРОВАЯ ЛОГИКА ==================
    shuffle() {
        if (this.isRotating || this.isShuffling) return;
        
        this.isShuffling = true;
        this.updateGameStatus('🔀 Перемешивание кубика...');
        
        const moves = ['R', "R'", 'L', "L'", 'U', "U'", 'D', "D'", 'F', "F'", 'B', "B'"];
        const numMoves = 50;
        let previousBase = '';
        
        const sequence = [];
        for (let i = 0; i < numMoves; i++) {
            let m;
            do {
                m = moves[Math.floor(Math.random() * moves.length)];
            } while (m[0] === previousBase); // не повторяем одну и ту же грань подряд
            previousBase = m[0];
            sequence.push(m);
        }
        // Заливаем в очередь и запускаем
        this.moveQueue.push(...sequence);
        if (!this.isRotating) {
            const next = this.moveQueue.shift();
            this.performRotation(next);
        }
    }
    
    reset() {
        if (this.isRotating || this.isShuffling) return;
        
        this.scene.remove(this.cube);
        this.createCube();
        this.resetMoveCount();
        this.resetTimer();
        this.isSolved = false;
        this.updateGameStatus('✨ Кубик сброшен! Готов к новой игре!');
        this.updateProgress();
    }
    
    solveCube() {
        if (this.isRotating || this.isShuffling) return;
        
        // Проверяем, собран ли кубик
        if (this.checkIfSolved()) {
            this.updateGameStatus('✅ Кубик уже собран! Перемешайте его для новой игры.');
            return;
        }
        
        // Открываем модальное окно сборки
        this.openSolveModal();
    }
    
    // ================== СИСТЕМА МОДАЛЬНОГО ОКНА СБОРКИ ==================
    openSolveModal() {
        const modal = document.getElementById('solveModal');
        modal.style.display = 'flex';
        
        // Инициализируем сессию сборки
        this.initSolveSession();
        this.updateGameStatus('🧩 Режим сборки активирован!');
    }
    
    closeSolveModal() {
        const modal = document.getElementById('solveModal');
        modal.style.display = 'none';
        
        // Останавливаем таймер сборки
        this.stopSolveTimer();
        this.updateGameStatus('🎯 Режим сборки завершен.');
    }
    
    initSolveSession() {
        // Сбрасываем данные сессии
        this.solveStartTime = Date.now();
        this.solveMoves = 0;
        this.solvePaused = false;
        this.solvePausedTime = 0;
        
        // Обновляем UI
        this.updateSolveUI();
        
        // Запускаем таймер
        this.startSolveTimer();
        
        // Создаем копию кубика для модального окна (если нужно)
        this.setupSolveCube();
        
        // Обновляем статус
        this.updateSolveStatus('🎯 Начните сборку кубика! Кликайте на кубик или используйте кнопки ниже.');
    }
    
    setupSolveCube() {
        const canvas = document.getElementById('solveCubeCanvas');
        if (!canvas) return;
        
        // Для упрощения будем использовать основной кубик
        // В реальной реализации можно создать отдельную сцену
        canvas.style.display = 'block';
    }
    
    // ================== СИСТЕМА ТАЙМЕРА СБОРКИ ==================
    startSolveTimer() {
        this.solveTimerInterval = setInterval(() => {
            if (!this.solvePaused) {
                const elapsed = this.getSolveElapsedTime();
                document.getElementById('solveTimer').textContent = elapsed;
            }
        }, 100); // Обновляем каждые 100мс для точности
    }
    
    stopSolveTimer() {
        if (this.solveTimerInterval) {
            clearInterval(this.solveTimerInterval);
            this.solveTimerInterval = null;
        }
    }
    
    pauseSolveTimer() {
        this.solvePaused = !this.solvePaused;
        const btn = document.getElementById('pauseSolveBtn');
        
        if (this.solvePaused) {
            this.solvePausedStart = Date.now();
            btn.innerHTML = '<span class="btn-icon">▶️</span><span class="btn-text">Продолжить</span>';
            this.updateSolveStatus('⏸️ Сборка приостановлена. Нажмите "Продолжить" для возобновления.');
        } else {
            if (this.solvePausedStart) {
                this.solvePausedTime += Date.now() - this.solvePausedStart;
            }
            btn.innerHTML = '<span class="btn-icon">⏸️</span><span class="btn-text">Пауза</span>';
            this.updateSolveStatus('🎯 Сборка возобновлена! Продолжайте решение кубика.');
        }
    }
    
    getSolveElapsedTime() {
        if (!this.solveStartTime) return '00:00.0';
        
        let elapsed = Date.now() - this.solveStartTime - this.solvePausedTime;
        if (this.solvePaused && this.solvePausedStart) {
            elapsed -= (Date.now() - this.solvePausedStart);
        }
        
        const totalSeconds = elapsed / 1000;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.floor(totalSeconds % 60);
        const deciseconds = Math.floor((totalSeconds % 1) * 10);
        
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${deciseconds}`;
    }
    
    // ================== УПРАВЛЕНИЕ СБОРКОЙ ==================
    handleSolveMove(move) {
        if (this.solvePaused || this.isRotating) return;
        
        // Выполняем ход
        this.performSolveRotation(move);
        this.solveMoves++;
        
        // Обновляем UI
        this.updateSolveUI();
        
        // Проверяем решение
        setTimeout(() => {
            if (this.checkIfSolved()) {
                this.onSolveCompleted();
            }
        }, 300);
    }
    
    performSolveRotation(move) {
        this.performRotation(move);
    }
    
    updateSolveUI() {
        document.getElementById('solveMoves').textContent = this.solveMoves;
        
        // Обновляем прогресс
        const progress = this.calculateSolveProgress();
        document.getElementById('solveProgress').textContent = `${Math.round(progress)}%`;
        
        // Включаем подсказку если куплена
        if (this.ownedItems.includes('hint')) {
            document.getElementById('hintSolveBtn').disabled = false;
        }
    }
    
    updateSolveStatus(message) {
        const statusElement = document.getElementById('solveStatusMessage');
        if (statusElement) {
            statusElement.textContent = message;
        }
    }
    
    onSolveCompleted() {
        this.stopSolveTimer();
        
        const solveTime = this.getSolveElapsedTime();
        const timeInSeconds = this.timeToSeconds(solveTime);
        
        // Вычисляем награды (максимум 100 монет за раунд)
        const baseReward = 30; // Базовая награда
        const timeBonus = Math.max(0, 50 - Math.floor(timeInSeconds / 6)); // Бонус за время
        const moveBonus = Math.max(0, 20 - Math.floor(this.solveMoves / 10)); // Бонус за эффективность
        const levelBonus = Math.floor(this.currentLevel * 1.5); // Бонус за уровень
        
        let totalReward = baseReward + timeBonus + moveBonus + levelBonus;
        
        // Ограничиваем максимальную награду 100 монетами за раунд
        totalReward = Math.min(totalReward, 100);
        
        // Добавляем монеты
        this.coins += totalReward;
        
        // Повышаем уровень
        this.currentLevel++;
        
        // Обновляем рекорды
        if (this.moveCount < this.bestMoves) {
            this.bestMoves = this.solveMoves;
            localStorage.setItem('procube_best_moves', this.bestMoves);
        }
        
        if (this.bestTime === '--:--' || timeInSeconds < this.timeToSeconds(this.bestTime)) {
            this.bestTime = solveTime;
            localStorage.setItem('procube_best_time', this.bestTime);
        }
        
        // Сохраняем прогресс
        this.saveProgress();
        this.updateUI();
        
        // Показываем результат
        this.updateSolveStatus(`🏆 ПОЗДРАВЛЯЕМ! Кубик собран за ${solveTime} и ${this.solveMoves} ходов! +${totalReward} монет!`);
        
        setTimeout(() => {
            alert(`🎉 Отличная работа!\n⏱️ Время: ${solveTime}\n🔄 Ходы: ${this.solveMoves}\n🪙 Награда: ${totalReward} монет\n🔥 Новый уровень: ${this.currentLevel}\n\n💡 Бонус за время: ${timeBonus}\n🎯 Бонус за эффективность: ${moveBonus}\n🌟 Бонус за уровень: ${levelBonus}`);
            this.closeSolveModal();
        }, 2000);
    }
    
    checkIfSolved() {
        const faces = {
            right: [], left: [], top: [], bottom: [], front: [], back: []
        };
        const vX = new THREE.Vector3(1, 0, 0);
        const vNX = new THREE.Vector3(-1, 0, 0);
        const vY = new THREE.Vector3(0, 1, 0);
        const vNY = new THREE.Vector3(0, -1, 0);
        const vZ = new THREE.Vector3(0, 0, 1);
        const vNZ = new THREE.Vector3(0, 0, -1);
        
        this.cubelets.forEach(cubelet => {
            const { x, y, z } = cubelet.userData.currentPosition;
            if (x === 1) faces.right.push(this.getOutwardFaceColor(cubelet, vX));
            if (x === -1) faces.left.push(this.getOutwardFaceColor(cubelet, vNX));
            if (y === 1) faces.top.push(this.getOutwardFaceColor(cubelet, vY));
            if (y === -1) faces.bottom.push(this.getOutwardFaceColor(cubelet, vNY));
            if (z === 1) faces.front.push(this.getOutwardFaceColor(cubelet, vZ));
            if (z === -1) faces.back.push(this.getOutwardFaceColor(cubelet, vNZ));
        });
        
        const solved = Object.values(faces).every(faceColors => {
            if (faceColors.length === 0) return true;
            const firstColor = faceColors[0];
            return faceColors.every(color => color === firstColor);
        });
        
        if (solved && !this.isSolved) {
            this.isSolved = true;
            this.onCubeSolved();
        }
        
        return solved;
    }
    
    onCubeSolved() {
        this.stopTimer();
        
        // Вычисляем награды с учетом уровня
        const timeBonus = this.getTimeBonus();
        const moveBonus = this.getMoveBonus();
        const levelMultiplier = 1 + (this.currentLevel * 0.2); // Бонус за уровень: +20% за каждый уровень
        const levelBonus = Math.floor(this.currentLevel * 5); // Дополнительные монеты за уровень
        
        let coinsEarned = Math.floor((timeBonus + moveBonus + 50) * levelMultiplier) + levelBonus;
        
        // Ограничиваем максимум 100 монет за обычную сборку
        coinsEarned = Math.min(coinsEarned, 100);
        
        // Обновляем рекорды
        if (this.moveCount < this.bestMoves) {
            this.bestMoves = this.moveCount;
            localStorage.setItem('procube_best_moves', this.bestMoves);
        }
        
        const currentTime = this.getElapsedTime();
        if (this.bestTime === '--:--' || this.timeToSeconds(currentTime) < this.timeToSeconds(this.bestTime)) {
            this.bestTime = currentTime;
            localStorage.setItem('procube_best_time', this.bestTime);
        }
        
        // Повышаем уровень и добавляем монеты
        this.currentLevel++;
        this.coins += coinsEarned;
        this.saveProgress();
        
        this.updateUI();
        this.updateGameStatus(`🏆 ПОЗДРАВЛЯЕМ! Уровень ${this.currentLevel}! +${coinsEarned} монет!`);
        
        // Эффект победы
        this.victoryEffect();
        
        setTimeout(() => {
            alert(`🎉 Кубик собран за ${this.moveCount} ходов!\n⏱️ Время: ${currentTime}\n🪙 Заработано монет: ${coinsEarned}\n🔥 Новый уровень: ${this.currentLevel}\n\n💰 Бонус за время: ${timeBonus}\n🎯 Бонус за эффективность: ${moveBonus}\n🌟 Бонус за уровень: ${levelBonus}\n📈 Множитель уровня: x${levelMultiplier.toFixed(1)}`);
        }, 1000);
    }
    
    victoryEffect() {
        // Упрощенный эффект победы для производительности
        this.updateGameStatus('🏆 ПОБЕДА! Кубик собран!');
    }
    
    // ================== СИСТЕМА ТАЙМЕРА ==================
    startTimer() {
        this.startTime = Date.now();
        this.timerInterval = setInterval(() => {
            const elapsed = this.getElapsedTime();
            document.getElementById('gameTimer').textContent = elapsed;
        }, 1000);
    }
    
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }
    
    resetTimer() {
        this.stopTimer();
        this.startTime = null;
        document.getElementById('gameTimer').textContent = '00:00';
    }
    
    getElapsedTime() {
        if (!this.startTime) return '00:00';
        const elapsed = Date.now() - this.startTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    timeToSeconds(timeStr) {
        const [minutes, seconds] = timeStr.split(':').map(Number);
        return minutes * 60 + seconds;
    }
    
    // ================== СИСТЕМА СЧЕТА ==================
    incrementMoveCount() {
        this.moveCount++;
        document.getElementById('moves').textContent = this.moveCount;
        
        if (!this.startTime) {
            this.startTimer();
        }
    }
    
    resetMoveCount() {
        this.moveCount = 0;
        document.getElementById('moves').textContent = this.moveCount;
    }
    
    getTimeBonus() {
        if (!this.startTime) return 0;
            const elapsed = Date.now() - this.startTime;
        const minutes = elapsed / 60000;
        return Math.max(0, Math.floor(100 - minutes * 10)); // Бонус за скорость
    }
    
    getMoveBonus() {
        return Math.max(0, Math.floor(200 - this.moveCount * 2)); // Бонус за эффективность
    }
    
    updateProgress() {
        // Дебаунсинг для производительности
        if (this.progressUpdateTimeout) return;
        
        this.progressUpdateTimeout = setTimeout(() => {
            const progressPercentage = this.calculateSolveProgress();
            document.getElementById('progressFill').style.width = `${progressPercentage}%`;
            this.progressUpdateTimeout = null;
        }, 100);
    }
    
    calculateSolveProgress() {
        const faces = {
            right: [], left: [], top: [], bottom: [], front: [], back: []
        };
        const vX = new THREE.Vector3(1, 0, 0);
        const vNX = new THREE.Vector3(-1, 0, 0);
        const vY = new THREE.Vector3(0, 1, 0);
        const vNY = new THREE.Vector3(0, -1, 0);
        const vZ = new THREE.Vector3(0, 0, 1);
        const vNZ = new THREE.Vector3(0, 0, -1);
        
        this.cubelets.forEach(cubelet => {
            const { x, y, z } = cubelet.userData.currentPosition;
            if (x === 1) faces.right.push(this.getOutwardFaceColor(cubelet, vX));
            if (x === -1) faces.left.push(this.getOutwardFaceColor(cubelet, vNX));
            if (y === 1) faces.top.push(this.getOutwardFaceColor(cubelet, vY));
            if (y === -1) faces.bottom.push(this.getOutwardFaceColor(cubelet, vNY));
            if (z === 1) faces.front.push(this.getOutwardFaceColor(cubelet, vZ));
            if (z === -1) faces.back.push(this.getOutwardFaceColor(cubelet, vNZ));
        });
        
        let solvedFaces = 0;
        Object.values(faces).forEach(faceColors => {
            if (faceColors.length > 0) {
                const firstColor = faceColors[0];
                const isUniform = faceColors.every(color => color === firstColor);
                if (isUniform) solvedFaces++;
            }
        });
        
        return (solvedFaces / 6) * 100;
    }

    getOutwardFaceColor(cubelet, worldAxisVec) {
        const localNormals = [
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(-1, 0, 0),
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(0, -1, 0),
            new THREE.Vector3(0, 0, 1),
            new THREE.Vector3(0, 0, -1),
        ];
        const wq = cubelet.getWorldQuaternion(new THREE.Quaternion());
        let bestIdx = 0;
        let bestDot = -Infinity;
        for (let i = 0; i < 6; i++) {
            const n = localNormals[i].clone().applyQuaternion(wq).normalize();
            const d = n.dot(worldAxisVec);
            if (d > bestDot) { bestDot = d; bestIdx = i; }
        }
        return cubelet.material[bestIdx].color.getHex();
    }
    
    // ================== ПОЛЬЗОВАТЕЛЬСКИЙ ИНТЕРФЕЙС ==================
    updateUI() {
        document.getElementById('currentLevel').textContent = this.currentLevel;
        document.getElementById('coinsAmount').textContent = this.coins;
        document.getElementById('shopCoinsAmount').textContent = this.coins;
        document.getElementById('bestMoves').textContent = this.bestMoves === 999 ? '∞' : this.bestMoves;
        document.getElementById('bestTime').textContent = this.bestTime;
    }
    
    updateGameStatus(message) {
        const statusElement = document.getElementById('gameStatus');
        if (statusElement) {
            statusElement.textContent = message;
        }
    }
    
    saveProgress() {
        localStorage.setItem('procube_level', this.currentLevel);
        localStorage.setItem('procube_coins', this.coins);
        localStorage.setItem('procube_items', JSON.stringify(this.ownedItems));
    }
    
    // ================== МАГАЗИН ==================
    openShop() {
        document.getElementById('shopModal').style.display = 'flex';
        this.updateShopUI();
    }
    
    closeShop() {
        document.getElementById('shopModal').style.display = 'none';
    }
    
    updateShopUI() {
        document.getElementById('shopCoinsAmount').textContent = this.coins;
        
        // Обновляем состояние кнопок покупки
        document.querySelectorAll('.shop-item').forEach(item => {
            const itemId = item.dataset.item;
            const priceElement = item.querySelector('.item-price span:last-child');
            const price = parseInt(priceElement.textContent);
            const buyBtn = item.querySelector('.buy-btn');
            
            if (this.ownedItems.includes(itemId)) {
                buyBtn.textContent = 'Куплено';
                buyBtn.disabled = true;
            } else if (this.coins < price) {
                buyBtn.disabled = true;
            } else {
                buyBtn.disabled = false;
            }
        });
    }
    
    buyItem(itemId) {
        const item = document.querySelector(`[data-item="${itemId}"]`);
        const priceElement = item.querySelector('.item-price span:last-child');
        const price = parseInt(priceElement.textContent);
        
        if (this.coins >= price && !this.ownedItems.includes(itemId)) {
            this.coins -= price;
            this.ownedItems.push(itemId);
            this.saveProgress();
            this.updateUI();
            this.updateShopUI();
            
            // Применяем эффект покупки
            this.applyItemEffect(itemId);
            
            alert(`Покупка успешна! Предмет "${itemId}" добавлен в ваш инвентарь.`);
        }
    }
    
    applyItemEffect(itemId) {
        switch (itemId) {
            case 'theme1':
                // Применяем радужную тему
                this.applyRainbowTheme();
                break;
            case 'hint':
                // Показываем подсказку
                this.showHint();
                break;
            case 'autosolve':
                // Автоматическое решение
                this.solveCube();
                break;
        }
    }
    
    applyRainbowTheme() {
        this.colors = {
            white: 0xffffff,
            yellow: 0xffff00,
            red: 0xff0066,
            orange: 0xff6600,
            blue: 0x0066ff,
            green: 0x00ff66,
            black: 0x111111
        };
        this.colorCube();
        this.updateGameStatus('🌈 Радужная тема активирована!');
    }
    
    showHint() {
        const moves = ['R', 'L', 'U', 'D', 'F', 'B'];
        const hint = moves[Math.floor(Math.random() * moves.length)];
        this.updateGameStatus(`💡 Подсказка: попробуйте ход "${hint}"`);
        
        setTimeout(() => {
            this.updateGameStatus('🎯 Используйте подсказку для следующего хода!');
        }, 3000);
    }
    
    showSolveHint() {
        const moves = ['R', 'R\'', 'L', 'L\'', 'U', 'U\'', 'D', 'D\'', 'F', 'F\'', 'B', 'B\''];
        const hint = moves[Math.floor(Math.random() * moves.length)];
        
        // Подсвечиваем соответствующую кнопку
        const hintBtn = document.querySelector(`[data-move="${hint}"]`);
        if (hintBtn) {
            hintBtn.style.animation = 'hintGlow 2s ease-in-out';
            hintBtn.style.background = 'linear-gradient(45deg, #ff8800, #ffaa00)';
            
            setTimeout(() => {
                hintBtn.style.animation = '';
                hintBtn.style.background = '';
            }, 2000);
        }
        
        this.updateSolveStatus(`💡 Подсказка: попробуйте ход "${hint}"`);
        
        setTimeout(() => {
            this.updateSolveStatus('🎯 Продолжайте сборку кубика!');
        }, 3000);
    }
    
    // ================== ОБРАБОТЧИКИ СОБЫТИЙ ==================
    setupEventListeners() {
        // Кнопки управления
        document.getElementById('shuffleBtn').addEventListener('click', () => this.shuffle());
        document.getElementById('resetBtn').addEventListener('click', () => this.reset());
        document.getElementById('solveBtn').addEventListener('click', () => this.solveCube());
        document.getElementById('shopBtn').addEventListener('click', () => this.openShop());
        
        // Магазин
        document.getElementById('closeShop').addEventListener('click', () => this.closeShop());
        
        // Покупки в магазине
        document.querySelectorAll('.buy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemId = e.target.closest('.shop-item').dataset.item;
                this.buyItem(itemId);
            });
        });
        
        // Модальное окно сборки
        document.getElementById('closeSolveModal').addEventListener('click', () => this.closeSolveModal());
        document.getElementById('pauseSolveBtn').addEventListener('click', () => this.pauseSolveTimer());
        document.getElementById('exitSolveBtn').addEventListener('click', () => this.closeSolveModal());
        
        // Кнопка подсказки в режиме сборки
        document.getElementById('hintSolveBtn').addEventListener('click', () => {
            if (this.ownedItems.includes('hint')) {
                this.showSolveHint();
            } else {
                alert('Купите подсказку в магазине для использования этой функции!');
            }
        });
        
        // Кнопки ходов в режиме сборки
        document.querySelectorAll('.move-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const move = e.target.getAttribute('data-move');
                this.handleSolveMove(move);
            });
        });
        
        // Управление камерой
        this.setupCameraControls();
    }
    
    // ================== МОБИЛЬНЫЕ КОНТРОЛИ ==================
    setupMobileControls() {
        // Определяем мобильное устройство
        const isMobile = window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile) {
            // Показываем мобильные элементы
            document.getElementById('floatingMobileBtn').style.display = 'block';
            document.getElementById('mobileControls').style.display = 'block';
            
            // Автоматически показываем мобильную панель через 2 секунды
            setTimeout(() => {
                this.showMobileHelp();
            }, 2000);
        }
        
        // Обработчики для мобильной панели
        document.getElementById('floatingMobileBtn').addEventListener('click', () => {
            this.toggleMobileControls();
        });
        
        document.getElementById('toggleMobileControls').addEventListener('click', () => {
            this.toggleMobileControls();
        });
        
        // Обработчики для мобильных кнопок ходов
        document.querySelectorAll('.mobile-move-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const move = e.target.getAttribute('data-move');
                if (move) {
                    this.handleMobileMove(move);
                }
            });
            
            // Добавляем тактильную обратную связь
            btn.addEventListener('touchstart', () => {
                if (navigator.vibrate) {
                    navigator.vibrate(50); // Короткая вибрация
                }
            });
        });
        
        // Добавляем swipe-индикатор в начале
        if (isMobile) {
            this.showSwipeHelp();
        }
    }
    
    toggleMobileControls() {
        const mobileControls = document.getElementById('mobileControls');
        const isActive = mobileControls.classList.contains('active');
        
        if (isActive) {
            mobileControls.classList.remove('active');
            document.getElementById('floatingMobileBtn').textContent = '🎮';
        } else {
            mobileControls.classList.add('active');
            document.getElementById('floatingMobileBtn').textContent = '✖️';
        }
    }
    
    handleMobileMove(move) {
        if (this.isRotating || this.isShuffling) {
            this.updateGameStatus('⏳ Подождите завершения текущего хода...');
            return;
        }
        
        // Показываем индикатор хода
        this.showMoveIndicator(move);
        
        // Выполняем ход (поддержка ' и 2 внутри performRotation)
        this.performRotation(move);
        
        // Обновляем статистику если не в режиме перемешивания
        if (!this.isShuffling) {
            // incrementMoveCount вызывается внутри performRotation
            setTimeout(() => this.checkIfSolved(), 300);
        }
    }
    
    showMoveIndicator(move) {
        const indicator = document.createElement('div');
        indicator.className = 'move-indicator';
        indicator.textContent = `🎯 ${move}`;
        indicator.style.cssText = `
            position: fixed;
            top: 20%;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 170, 255, 0.9);
            color: white;
            padding: 8px 16px;
            border-radius: 15px;
            font-size: 18px;
            font-weight: bold;
            z-index: 10000;
            pointer-events: none;
            animation: moveIndicatorShow 0.6s ease-out forwards;
            font-family: 'Orbitron', monospace;
            border: 2px solid rgba(255, 255, 255, 0.3);
        `;
        
        document.body.appendChild(indicator);
        
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        }, 600);
    }
    
    showMobileHelp() {
        if (!localStorage.getItem('procube_mobile_help_shown')) {
            const helpModal = document.createElement('div');
            helpModal.className = 'mobile-help-modal';
            helpModal.innerHTML = `
                <div class="mobile-help-content">
                    <h2>📱 Добро пожаловать в мобильную версию!</h2>
                    <div class="help-section">
                        <h3>🎮 Управление кубиком:</h3>
                        <p>• <strong>Свайп</strong> по кубику для поворота граней</p>
                        <p>• <strong>Двойной тап</strong> для смены угла обзора</p>
                        <p>• <strong>Пинч</strong> для масштабирования</p>
                        <p>• <strong>Перетаскивание</strong> для вращения камеры</p>
                    </div>
                    <div class="help-section">
                        <h3>🎯 Быстрые ходы:</h3>
                        <p>• Нажмите на кнопку 🎮 внизу для панели ходов</p>
                        <p>• Используйте кнопки для точных поворотов</p>
                    </div>
                    <button id="closeMobileHelp" class="help-close-btn">Понятно! 👍</button>
                </div>
            `;
            
            helpModal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                animation: fadeIn 0.3s ease;
            `;
            
            document.body.appendChild(helpModal);
            
            document.getElementById('closeMobileHelp').addEventListener('click', () => {
                document.body.removeChild(helpModal);
                localStorage.setItem('procube_mobile_help_shown', 'true');
            });
        }
    }
    
    showSwipeHelp() {
        setTimeout(() => {
            const swipeHelp = document.createElement('div');
            swipeHelp.textContent = '👆 Попробуйте свайп по кубику!';
            swipeHelp.style.cssText = `
                position: fixed;
                bottom: 100px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(255, 136, 0, 0.9);
                color: white;
                padding: 10px 20px;
                border-radius: 20px;
                font-size: 16px;
                font-weight: bold;
                z-index: 9999;
                animation: swipeHelpShow 3s ease-out forwards;
                font-family: 'Exo 2', sans-serif;
            `;
            
            document.body.appendChild(swipeHelp);
            
            setTimeout(() => {
                if (swipeHelp.parentNode) {
                    swipeHelp.parentNode.removeChild(swipeHelp);
                }
            }, 3000);
        }, 1000);
    }
    
    onWindowResize() {
            const canvas = document.getElementById('gameCanvas');
            const aspect = canvas.clientWidth / canvas.clientHeight;
            this.camera.aspect = aspect;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    }
    
    // ================== ОПТИМИЗИРОВАННАЯ АНИМАЦИЯ ==================
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Ограничиваем FPS для экономии ресурсов
        const now = Date.now();
        if (!this.lastRenderTime) this.lastRenderTime = now;
        const elapsed = now - this.lastRenderTime;
        
        // Рендерим только если прошло достаточно времени (60 FPS макс)
        if (elapsed > 16) {
        this.renderer.render(this.scene, this.camera);
            this.lastRenderTime = now;
        }
    }
}

// ================== ПРИЛОЖЕНИЕ ==================
class ProCubeApp {
    constructor() {
        this.loadingScreen = document.getElementById('loading-screen');
        this.gameScreen = document.getElementById('game-screen');
        this.game = null;
        
        this.startLoading();
    }
    
    startLoading() {
        // Ускоренная загрузка
        setTimeout(() => {
            this.showGame();
        }, 2000);
    }
    
    showGame() {
        this.loadingScreen.style.display = 'none';
        this.gameScreen.style.display = 'flex';
        
        // Небольшая задержка для корректной инициализации канваса
        setTimeout(() => {
            this.game = new ProCubeGame();
        }, 100);
    }
}

// ================== ЗАПУСК ПРИЛОЖЕНИЯ ==================
document.addEventListener('DOMContentLoaded', () => {
    new ProCubeApp();
});

// Предотвращение зума при двойном тапе
document.addEventListener('touchstart', function (event) {
    if (event.touches.length > 1) {
        event.preventDefault();
    }
});

let lastTouchEnd = 0;
document.addEventListener('touchend', function (event) {
    const now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
        event.preventDefault();
    }
    lastTouchEnd = now;
}, false);