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
        
        // Рендерер
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setClearColor(0x001122, 0);
        
        // Обработка изменения размера окна
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    createLighting() {
        // Окружающий свет
        const ambientLight = new THREE.AmbientLight(0x404080, 0.6);
        this.scene.add(ambientLight);
        
        // Основной направленный свет
        const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
        mainLight.position.set(10, 15, 10);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        mainLight.shadow.camera.near = 1;
        mainLight.shadow.camera.far = 50;
        mainLight.shadow.camera.left = -10;
        mainLight.shadow.camera.right = 10;
        mainLight.shadow.camera.top = 10;
        mainLight.shadow.camera.bottom = -10;
        this.scene.add(mainLight);
        
        // Дополнительные источники света
        const fillLight1 = new THREE.DirectionalLight(0x4080ff, 0.4);
        fillLight1.position.set(-10, 5, 10);
        this.scene.add(fillLight1);
        
        const fillLight2 = new THREE.DirectionalLight(0x80aaff, 0.3);
        fillLight2.position.set(5, -5, -10);
        this.scene.add(fillLight2);
        
        // Точечный свет для дополнительного освещения
        const pointLight = new THREE.PointLight(0xffffff, 0.8, 50);
        pointLight.position.set(0, 10, 0);
        this.scene.add(pointLight);
    }
    
    // ================== СОЗДАНИЕ КУБИКА ==================
    createCube() {
        if (this.cube) {
            this.scene.remove(this.cube);
        }
        
        this.cube = new THREE.Group();
        this.cubelets = [];
        
        // Увеличенный размер кубика
        const size = 1.4;
        const gap = 0.08;
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
        const geometry = new THREE.BoxGeometry(size, size, size);
        
        // Создание улучшенных материалов
        const materials = [];
        for (let i = 0; i < 6; i++) {
            const material = new THREE.MeshPhongMaterial({ 
                color: this.colors.black,
                shininess: 100,
                specular: 0x333333,
                transparent: false
            });
            materials.push(material);
        }
        
        const cubelet = new THREE.Mesh(geometry, materials);
        cubelet.castShadow = true;
        cubelet.receiveShadow = true;
        
        // Добавление рамки для каждой грани
        const edges = new THREE.EdgesGeometry(geometry);
        const lineMaterial = new THREE.LineBasicMaterial({ 
            color: 0x000000, 
            linewidth: 3 
        });
        const wireframe = new THREE.LineSegments(edges, lineMaterial);
        cubelet.add(wireframe);
        
        return cubelet;
    }
    
    colorCube() {
        this.cubelets.forEach(cubelet => {
            const { x, y, z } = cubelet.userData.currentPosition;
            
            // Правая грань (красная)
            if (x === 1) {
                cubelet.material[0].color.setHex(this.colors.red);
                cubelet.material[0].emissive.setHex(0x220000);
            }
            // Левая грань (оранжевая)
            if (x === -1) {
                cubelet.material[1].color.setHex(this.colors.orange);
                cubelet.material[1].emissive.setHex(0x221100);
            }
            // Верхняя грань (белая)
            if (y === 1) {
                cubelet.material[2].color.setHex(this.colors.white);
                cubelet.material[2].emissive.setHex(0x222222);
            }
            // Нижняя грань (желтая)
            if (y === -1) {
                cubelet.material[3].color.setHex(this.colors.yellow);
                cubelet.material[3].emissive.setHex(0x222200);
            }
            // Передняя грань (зеленая)
            if (z === 1) {
                cubelet.material[4].color.setHex(this.colors.green);
                cubelet.material[4].emissive.setHex(0x002200);
            }
            // Задняя грань (синяя)
            if (z === -1) {
                cubelet.material[5].color.setHex(this.colors.blue);
                cubelet.material[5].emissive.setHex(0x000022);
            }
        });
    }
    
    // ================== УПРАВЛЕНИЕ КАМЕРОЙ ==================
    setupCameraControls() {
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };
        
        const canvas = this.renderer.domElement;
        
        // Мышь
        canvas.addEventListener('mousedown', (e) => {
            if (this.isRotating || this.isShuffling) return;
            
            // Проверяем клик по кубику
            if (!this.checkCubeClick(e)) {
                isDragging = true;
                this.isDraggingCamera = true;
                previousMousePosition = { x: e.clientX, y: e.clientY };
            }
        });
        
        canvas.addEventListener('mousemove', (e) => {
            if (!isDragging || !this.isDraggingCamera) return;
            
            const deltaMove = {
                x: e.clientX - previousMousePosition.x,
                y: e.clientY - previousMousePosition.y
            };
            
            this.rotateCameraAroundCube(deltaMove);
            previousMousePosition = { x: e.clientX, y: e.clientY };
        });
        
        canvas.addEventListener('mouseup', () => {
            isDragging = false;
            this.isDraggingCamera = false;
        });
        
        // Тач для мобильных устройств
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (e.touches.length === 1) {
                if (this.isRotating || this.isShuffling) return;
                
                if (!this.checkCubeTouchClick(e.touches[0])) {
                    isDragging = true;
                    this.isDraggingCamera = true;
                    previousMousePosition = {
                        x: e.touches[0].clientX,
                        y: e.touches[0].clientY
                    };
                }
            }
        });
        
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (!isDragging || !this.isDraggingCamera || e.touches.length !== 1) return;
            
            const touch = e.touches[0];
            const deltaMove = {
                x: touch.clientX - previousMousePosition.x,
                y: touch.clientY - previousMousePosition.y
            };
            
            this.rotateCameraAroundCube(deltaMove);
            previousMousePosition = { x: touch.clientX, y: touch.clientY };
        });
        
        canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            isDragging = false;
            this.isDraggingCamera = false;
        });
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
                    this.performRotation(move);
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
        if (this.isRotating || this.isShuffling) return;
        
        this.isRotating = true;
        const axis = this.getMoveAxis(move);
        const angle = Math.PI / 2;
        const face = this.getFaceCubelets(move);
        
        this.animateRotation(face, axis, angle, move, () => {
            this.isRotating = false;
            if (!this.isShuffling) {
                this.incrementMoveCount();
                this.updateProgress();
                setTimeout(() => this.checkIfSolved(), 100);
            }
        });
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
    
    animateRotation(cubelets, axis, angle, move, callback) {
        const group = new THREE.Group();
        this.scene.add(group);
        
        // Определяем направление поворота
        const clockwise = ['R', 'U', 'F'].includes(move);
        const finalAngle = clockwise ? angle : -angle;
        
        // Перемещаем кубики в группу
        cubelets.forEach(cubelet => {
            this.cube.remove(cubelet);
            group.add(cubelet);
        });
        
        const startRotation = group.rotation.clone();
        const targetRotation = startRotation.clone();
        
        if (axis.x) targetRotation.x += finalAngle;
        if (axis.y) targetRotation.y += finalAngle;
        if (axis.z) targetRotation.z += finalAngle;
        
        const duration = 400;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = this.easeInOutCubic(progress);
            
            group.rotation.lerpVectors(startRotation, targetRotation, eased);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Возвращаем кубики обратно в основную группу
                cubelets.forEach(cubelet => {
                    group.remove(cubelet);
                    this.cube.add(cubelet);
                    
                    // Применяем трансформацию
                    cubelet.position.applyMatrix4(group.matrix);
                    cubelet.rotation.setFromRotationMatrix(group.matrix);
                });
                
                this.scene.remove(group);
                this.updateCubeletData(cubelets, move);
                
                if (callback) callback();
            }
        };
        
        animate();
    }
    
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    }
    
    updateCubeletData(cubelets, move) {
        cubelets.forEach(cubelet => {
            const { x, y, z } = cubelet.userData.currentPosition;
            let newX = x, newY = y, newZ = z;
            
            switch (move) {
                case 'R':
                    newY = z;
                    newZ = -y;
                    break;
                case 'L':
                    newY = -z;
                    newZ = y;
                    break;
                case 'U':
                    newX = -z;
                    newZ = x;
                    break;
                case 'D':
                    newX = z;
                    newZ = -x;
                    break;
                case 'F':
                    newX = y;
                    newY = -x;
                    break;
                case 'B':
                    newX = -y;
                    newY = x;
                    break;
            }
            
            cubelet.userData.currentPosition = { x: newX, y: newY, z: newZ };
        });
    }
    
    // ================== ИГРОВАЯ ЛОГИКА ==================
    shuffle() {
        if (this.isRotating || this.isShuffling) return;
        
        this.isShuffling = true;
        this.updateGameStatus('🔀 Перемешивание кубика...');
        
        const moves = ['R', 'L', 'U', 'D', 'F', 'B'];
        const numMoves = 25;
        let moveCount = 0;
        
        const performMove = () => {
            if (moveCount < numMoves) {
                const randomMove = moves[Math.floor(Math.random() * moves.length)];
                this.performRotation(randomMove);
                moveCount++;
                setTimeout(performMove, 300);
            } else {
                this.isShuffling = false;
                this.resetMoveCount();
                this.updateGameStatus('🎯 Кубик перемешан! Начните сборку!');
                this.updateProgress();
            }
        };
        
        performMove();
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
        
        this.reset();
        this.updateGameStatus('🤖 Кубик автоматически решен!');
        
        setTimeout(() => {
            alert('Кубик решен! Попробуйте перемешать и собрать самостоятельно для получения монет и опыта.');
        }, 500);
    }
    
    checkIfSolved() {
        const faces = {
            right: [], left: [], top: [], bottom: [], front: [], back: []
        };
        
        this.cubelets.forEach(cubelet => {
            const { x, y, z } = cubelet.userData.currentPosition;
            
            if (x === 1) faces.right.push(cubelet.material[0].color.getHex());
            if (x === -1) faces.left.push(cubelet.material[1].color.getHex());
            if (y === 1) faces.top.push(cubelet.material[2].color.getHex());
            if (y === -1) faces.bottom.push(cubelet.material[3].color.getHex());
            if (z === 1) faces.front.push(cubelet.material[4].color.getHex());
            if (z === -1) faces.back.push(cubelet.material[5].color.getHex());
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
        
        // Вычисляем награды
        const timeBonus = this.getTimeBonus();
        const moveBonus = this.getMoveBonus();
        const coinsEarned = timeBonus + moveBonus + 50; // Базовая награда 50 монет
        
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
            alert(`🎉 Кубик собран за ${this.moveCount} ходов!\n⏱️ Время: ${currentTime}\n🪙 Заработано монет: ${coinsEarned}\n🔥 Новый уровень: ${this.currentLevel}`);
        }, 1000);
    }
    
    victoryEffect() {
        // Эффект свечения
        this.cubelets.forEach(cubelet => {
            cubelet.material.forEach(material => {
                material.emissive.multiplyScalar(3);
            });
        });
        
        // Убираем эффект через 3 секунды
        setTimeout(() => {
            this.cubelets.forEach(cubelet => {
                cubelet.material.forEach(material => {
                    material.emissive.multiplyScalar(0.33);
                });
            });
        }, 3000);
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
        // Простая система прогресса на основе того, сколько граней собрано
        const progressPercentage = this.calculateSolveProgress();
        document.getElementById('progressFill').style.width = `${progressPercentage}%`;
    }
    
    calculateSolveProgress() {
        const faces = {
            right: [], left: [], top: [], bottom: [], front: [], back: []
        };
        
        this.cubelets.forEach(cubelet => {
            const { x, y, z } = cubelet.userData.currentPosition;
            
            if (x === 1) faces.right.push(cubelet.material[0].color.getHex());
            if (x === -1) faces.left.push(cubelet.material[1].color.getHex());
            if (y === 1) faces.top.push(cubelet.material[2].color.getHex());
            if (y === -1) faces.bottom.push(cubelet.material[3].color.getHex());
            if (z === 1) faces.front.push(cubelet.material[4].color.getHex());
            if (z === -1) faces.back.push(cubelet.material[5].color.getHex());
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
        
        // Управление камерой
        this.setupCameraControls();
    }
    
    onWindowResize() {
        const canvas = document.getElementById('gameCanvas');
        const aspect = canvas.clientWidth / canvas.clientHeight;
        this.camera.aspect = aspect;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    }
    
    // ================== АНИМАЦИЯ ==================
    animate() {
        requestAnimationFrame(() => this.animate());
        this.renderer.render(this.scene, this.camera);
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
        // Симуляция загрузки
        setTimeout(() => {
            this.showGame();
        }, 5000);
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
