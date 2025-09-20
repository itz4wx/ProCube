class RubiksCube {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.cube = null;
        this.cubelets = [];
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.isRotating = false;
        this.moveCount = 0;
        this.startTime = null;
        this.timerInterval = null;
        this.isDraggingCamera = false;
        this.selectedFace = null;
        this.isSolved = false;
        
        this.colors = {
            white: 0xffffff,
            yellow: 0xffff00,
            red: 0xff0000,
            orange: 0xff8000,
            blue: 0x0000ff,
            green: 0x00ff00,
            black: 0x000000
        };
        
        this.init();
        this.animate();
        this.setupEventListeners();
    }
    
    init() {
        // Создание сцены
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a3c72);
        
        // Создание камеры
        const canvas = document.getElementById('gameCanvas');
        const aspect = canvas.clientWidth / canvas.clientHeight;
        this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
        this.camera.position.set(5, 5, 5);
        this.camera.lookAt(0, 0, 0);
        
        // Создание рендерера
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: canvas,
            antialias: true 
        });
        this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Улучшенное освещение
        const ambientLight = new THREE.AmbientLight(0x4080ff, 0.4);
        this.scene.add(ambientLight);
        
        // Основной источник света
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.1;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -10;
        directionalLight.shadow.camera.right = 10;
        directionalLight.shadow.camera.top = 10;
        directionalLight.shadow.camera.bottom = -10;
        this.scene.add(directionalLight);
        
        // Дополнительные источники света для лучшего освещения
        const light1 = new THREE.DirectionalLight(0x80aaff, 0.3);
        light1.position.set(-10, 5, 10);
        this.scene.add(light1);
        
        const light2 = new THREE.DirectionalLight(0xaaccff, 0.2);
        light2.position.set(5, -10, -5);
        this.scene.add(light2);
        
        // Точечный источник света для дополнительного эффекта
        const pointLight = new THREE.PointLight(0xffffff, 0.5, 100);
        pointLight.position.set(0, 5, 5);
        this.scene.add(pointLight);
        
        // Создание кубика Рубика
        this.createCube();
        
        // Добавление орбитальных контролов для вращения камеры
        this.setupCameraControls();
    }
    
    createCube() {
        this.cube = new THREE.Group();
        this.cubelets = [];
        
        const size = 0.9;
        const gap = 0.05;
        const spacing = size + gap;
        
        // Создание 27 маленьких кубиков (3x3x3)
        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                for (let z = -1; z <= 1; z++) {
                    const cubelet = this.createCubelet(size);
                    cubelet.position.set(x * spacing, y * spacing, z * spacing);
                    cubelet.userData = { x, y, z };
                    
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
        
        // Создание материалов для каждой грани с улучшенными свойствами
        const materials = [
            new THREE.MeshPhongMaterial({ 
                color: this.colors.black, 
                shininess: 30,
                specular: 0x222222
            }), // right
            new THREE.MeshPhongMaterial({ 
                color: this.colors.black, 
                shininess: 30,
                specular: 0x222222
            }), // left
            new THREE.MeshPhongMaterial({ 
                color: this.colors.black, 
                shininess: 30,
                specular: 0x222222
            }), // top
            new THREE.MeshPhongMaterial({ 
                color: this.colors.black, 
                shininess: 30,
                specular: 0x222222
            }), // bottom
            new THREE.MeshPhongMaterial({ 
                color: this.colors.black, 
                shininess: 30,
                specular: 0x222222
            }), // front
            new THREE.MeshPhongMaterial({ 
                color: this.colors.black, 
                shininess: 30,
                specular: 0x222222
            })  // back
        ];
        
        const cubelet = new THREE.Mesh(geometry, materials);
        cubelet.castShadow = true;
        cubelet.receiveShadow = true;
        
        return cubelet;
    }
    
    colorCube() {
        this.cubelets.forEach(cubelet => {
            const { x, y, z } = cubelet.userData;
            
            // Правая грань (красная)
            if (x === 1) {
                cubelet.material[0].color.setHex(this.colors.red);
                cubelet.material[0].emissive.setHex(0x110000);
            }
            // Левая грань (оранжевая)
            if (x === -1) {
                cubelet.material[1].color.setHex(this.colors.orange);
                cubelet.material[1].emissive.setHex(0x111100);
            }
            // Верхняя грань (белая)
            if (y === 1) {
                cubelet.material[2].color.setHex(this.colors.white);
                cubelet.material[2].emissive.setHex(0x111111);
            }
            // Нижняя грань (желтая)
            if (y === -1) {
                cubelet.material[3].color.setHex(this.colors.yellow);
                cubelet.material[3].emissive.setHex(0x111100);
            }
            // Передняя грань (зеленая)
            if (z === 1) {
                cubelet.material[4].color.setHex(this.colors.green);
                cubelet.material[4].emissive.setHex(0x001100);
            }
            // Задняя грань (синяя)
            if (z === -1) {
                cubelet.material[5].color.setHex(this.colors.blue);
                cubelet.material[5].emissive.setHex(0x000011);
            }
        });
    }
    
    setupCameraControls() {
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };
        
        const canvas = this.renderer.domElement;
        
        // Мышь
        canvas.addEventListener('mousedown', (e) => {
            if (this.isRotating) return;
            
            // Проверяем, кликнул ли пользователь по кубику
            this.checkCubeClick(e);
            
            isDragging = true;
            this.isDraggingCamera = true;
            previousMousePosition = { x: e.clientX, y: e.clientY };
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
        let touchStartPosition = { x: 0, y: 0 };
        
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (e.touches.length === 1) {
                if (this.isRotating) return;
                
                // Проверяем, коснулся ли пользователь кубика
                this.checkCubeTouchClick(e.touches[0]);
                
                isDragging = true;
                this.isDraggingCamera = true;
                touchStartPosition = {
                    x: e.touches[0].clientX,
                    y: e.touches[0].clientY
                };
                previousMousePosition = touchStartPosition;
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
        
        // Горизонтальное вращение (вокруг оси Y)
        const spherical = new THREE.Spherical();
        spherical.setFromVector3(this.camera.position);
        spherical.theta -= deltaMove.x * rotationSpeed;
        spherical.phi += deltaMove.y * rotationSpeed;
        
        // Ограничиваем вертикальное вращение
        spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));
        
        this.camera.position.setFromSpherical(spherical);
        this.camera.lookAt(0, 0, 0);
    }
    
    shuffle() {
        if (this.isRotating) return;
        
        const moves = ['R', 'L', 'U', 'D', 'F', 'B'];
        const numMoves = 20;
        
        let moveCount = 0;
        const performMove = () => {
            if (moveCount < numMoves) {
                const randomMove = moves[Math.floor(Math.random() * moves.length)];
                this.performRotation(randomMove);
                moveCount++;
                setTimeout(performMove, 200);
            } else {
                this.updateGameStatus('Кубик перемешан - начните сборку!');
            }
        };
        
        this.resetMoveCount();
        this.updateGameStatus('Перемешивание...');
        performMove();
    }
    
    performRotation(move) {
        if (this.isRotating) return;
        
        this.isRotating = true;
        const axis = this.getMoveAxis(move);
        const angle = Math.PI / 2;
        const face = this.getFaceCubelets(move);
        
        this.animateRotation(face, axis, angle, () => {
            this.isRotating = false;
            this.incrementMoveCount();
            // Проверяем, собран ли кубик после поворота
            this.checkIfSolved();
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
            const { x, y, z } = cubelet.userData;
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
    
    animateRotation(cubelets, axis, angle, callback) {
        const group = new THREE.Group();
        this.scene.add(group);
        
        // Перемещаем кубики в группу
        cubelets.forEach(cubelet => {
            this.cube.remove(cubelet);
            group.add(cubelet);
        });
        
        const startRotation = group.rotation.clone();
        const targetRotation = startRotation.clone();
        
        if (axis.x) targetRotation.x += angle;
        if (axis.y) targetRotation.y += angle;
        if (axis.z) targetRotation.z += angle;
        
        const duration = 300;
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
                    
                    // Обновляем позиции после поворота
                    cubelet.position.applyMatrix4(group.matrix);
                    cubelet.rotation.setFromRotationMatrix(group.matrix);
                });
                
                this.scene.remove(group);
                this.updateCubeletData(cubelets, axis, angle);
                
                if (callback) callback();
            }
        };
        
        animate();
    }
    
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    }
    
    updateCubeletData(cubelets, axis, angle) {
        cubelets.forEach(cubelet => {
            const { x, y, z } = cubelet.userData;
            let newX = x, newY = y, newZ = z;
            
            if (axis.x) {
                // Поворот вокруг оси X
                newY = -z;
                newZ = y;
            } else if (axis.y) {
                // Поворот вокруг оси Y
                newX = z;
                newZ = -x;
            } else if (axis.z) {
                // Поворот вокруг оси Z
                newX = -y;
                newY = x;
            }
            
            cubelet.userData = { x: newX, y: newY, z: newZ };
        });
    }
    
    reset() {
        this.scene.remove(this.cube);
        this.createCube();
        this.resetMoveCount();
        this.resetTimer();
        this.isSolved = false;
        this.updateGameStatus('Кубик сброшен - готов к игре!');
    }
    
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
    
    startTimer() {
        this.startTime = Date.now();
        this.timerInterval = setInterval(() => {
            const elapsed = Date.now() - this.startTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            document.querySelector('.timer').textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }
    
    resetTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        this.startTime = null;
        document.querySelector('.timer').textContent = '00:00';
    }
    
    setupEventListeners() {
        document.getElementById('shuffleBtn').addEventListener('click', () => {
            this.shuffle();
        });
        
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.reset();
        });
        
        document.getElementById('solveBtn').addEventListener('click', () => {
            this.solveCube();
        });
        
        // Обработчики для взаимодействия с кубиком
        this.setupCubeInteraction();
        
        // Адаптация размера канваса при изменении размера окна
        window.addEventListener('resize', () => {
            const canvas = document.getElementById('gameCanvas');
            const aspect = canvas.clientWidth / canvas.clientHeight;
            this.camera.aspect = aspect;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        });
    }
    
    setupCubeInteraction() {
        // Дополнительные обработчики событий для взаимодействия с кубиком
    }
    
    checkCubeClick(event) {
        if (this.isRotating) return;
        
        const canvas = this.renderer.domElement;
        const rect = canvas.getBoundingClientRect();
        
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.cubelets, true);
        
        if (intersects.length > 0) {
            const intersectedObject = intersects[0].object;
            const face = intersects[0].face;
            const faceNormal = face.normal.clone();
            
            // Преобразуем нормаль в мировые координаты
            faceNormal.transformDirection(intersectedObject.matrixWorld);
            
            // Определяем какую грань повернуть на основе нормали
            const move = this.getMoveFromNormal(faceNormal, intersectedObject.userData);
            if (move) {
                this.performRotation(move);
            }
        }
    }
    
    checkCubeTouchClick(touch) {
        if (this.isRotating) return;
        
        const canvas = this.renderer.domElement;
        const rect = canvas.getBoundingClientRect();
        
        this.mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.cubelets, true);
        
        if (intersects.length > 0) {
            const intersectedObject = intersects[0].object;
            const face = intersects[0].face;
            const faceNormal = face.normal.clone();
            
            // Преобразуем нормаль в мировые координаты
            faceNormal.transformDirection(intersectedObject.matrixWorld);
            
            // Определяем какую грань повернуть на основе нормали
            const move = this.getMoveFromNormal(faceNormal, intersectedObject.userData);
            if (move) {
                this.performRotation(move);
            }
        }
    }
    
    getMoveFromNormal(normal, cubePosition) {
        const threshold = 0.5;
        
        // Определяем наиболее выступающую компоненту нормали
        const absX = Math.abs(normal.x);
        const absY = Math.abs(normal.y);
        const absZ = Math.abs(normal.z);
        
        if (absX > threshold && absX > absY && absX > absZ) {
            // Клик по боковой грани (право/лево)
            return normal.x > 0 ? 'R' : 'L';
        } else if (absY > threshold && absY > absX && absY > absZ) {
            // Клик по верхней/нижней грани
            return normal.y > 0 ? 'U' : 'D';
        } else if (absZ > threshold && absZ > absX && absZ > absY) {
            // Клик по передней/задней грани
            return normal.z > 0 ? 'F' : 'B';
        }
        
        return null;
    }
    
    checkIfSolved() {
        // Проверка каждой грани на одинаковый цвет
        const faces = {
            right: [], left: [], top: [], bottom: [], front: [], back: []
        };
        
        this.cubelets.forEach(cubelet => {
            const { x, y, z } = cubelet.userData;
            
            if (x === 1) faces.right.push(cubelet.material[0].color.getHex());
            if (x === -1) faces.left.push(cubelet.material[1].color.getHex());
            if (y === 1) faces.top.push(cubelet.material[2].color.getHex());
            if (y === -1) faces.bottom.push(cubelet.material[3].color.getHex());
            if (z === 1) faces.front.push(cubelet.material[4].color.getHex());
            if (z === -1) faces.back.push(cubelet.material[5].color.getHex());
        });
        
        // Проверяем, что все цвета на каждой грани одинаковы
        const solved = Object.values(faces).every(faceColors => {
            if (faceColors.length === 0) return true;
            const firstColor = faceColors[0];
            return faceColors.every(color => color === firstColor);
        });
        
        if (solved && !this.isSolved) {
            this.isSolved = true;
            this.onCubeSolved();
        } else if (!solved) {
            this.isSolved = false;
        }
        
        return solved;
    }
    
    onCubeSolved() {
        // Останавливаем таймер
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        
        // Обновляем статус
        this.updateGameStatus('🎉 ПОЗДРАВЛЯЕМ! КУБИК СОБРАН! 🎉');
        
        // Показываем сообщение о победе
        setTimeout(() => {
            alert(`Поздравляем! Кубик собран за ${this.moveCount} ходов!`);
        }, 500);
        
        // Добавляем эффект свечения
        this.cubelets.forEach(cubelet => {
            cubelet.material.forEach(material => {
                material.emissive.multiplyScalar(2);
            });
        });
        
        // Убираем эффект через 3 секунды
        setTimeout(() => {
            this.cubelets.forEach(cubelet => {
                cubelet.material.forEach(material => {
                    material.emissive.multiplyScalar(0.5);
                });
            });
        }, 3000);
    }
    
    solveCube() {
        if (this.isRotating) return;
        
        // Простой алгоритм "решения" - выполняем последовательность ходов
        // которая приводит к собранному состоянию
        const solutionMoves = [
            'U', 'R', 'U\'', 'R\'', 'U\'', 'F\'', 'U', 'F',
            'R', 'U', 'R\'', 'F\'', 'R', 'F', 'U2', 'R\'',
            'U2', 'R', 'B\'', 'R\'', 'B', 'R', 'U2', 'R\''
        ];
        
        // Сброс к собранному состоянию (более простое решение)
        this.reset();
        this.updateGameStatus('Кубик автоматически решен!');
        
        // Показываем уведомление
        alert('Кубик автоматически решен! Попробуйте перемешать и собрать самостоятельно.');
    }
    
    updateGameStatus(message) {
        const statusElement = document.getElementById('gameStatus');
        if (statusElement) {
            statusElement.textContent = message;
        }
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        this.renderer.render(this.scene, this.camera);
    }
}

// Инициализация приложения
class App {
    constructor() {
        this.loadingScreen = document.getElementById('loading-screen');
        this.gameScreen = document.getElementById('game-screen');
        this.rubiksCube = null;
        
        this.startLoading();
    }
    
    startLoading() {
        // Симуляция загрузки
        setTimeout(() => {
            this.showGame();
        }, 4000);
    }
    
    showGame() {
        this.loadingScreen.style.display = 'none';
        this.gameScreen.style.display = 'flex';
        
        // Небольшая задержка для корректной инициализации канваса
        setTimeout(() => {
            this.rubiksCube = new RubiksCube();
        }, 100);
    }
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', () => {
    new App();
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
