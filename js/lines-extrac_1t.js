class LineExtractor {
    constructor() {
        
    }
	Init( imageData ) {
		this.imageData = imageData;
        this.width = imageData.width;
        this.height = imageData.height;
        this.visited = new Set();
        this.lines = [];
	}

    // Основной метод извлечения линий
    extractLines() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.isBlackPixel(x, y) && !this.isVisited(x, y)) {
                    const line = this.traceLine(x, y);
                    if (line.length > 1) {
                        this.lines.push(line);
                    }
                }
            }
        }
        return this.lines;
    }

    // Трассировка одной линии
    traceLine(startX, startY) {
        const line = [];
        let current = { x: startX, y: startY };
        
        // Находим начало линии (точку с одним соседом)
        let startPoint = this.findLineStart(current.x, current.y);
        current = startPoint;
        
        line.push({ x: current.x, y: current.y });
        this.markVisited(current.x, current.y);

        // Трассируем до конца линии
        while (true) {
            const neighbors = this.getUnvisitedBlackNeighbors(current.x, current.y);
            
            if (neighbors.length === 0) break; // Конец линии
            
            // Выбираем следующую точку (для простых линий - первого соседа)
            current = neighbors[0];
            line.push({ x: current.x, y: current.y });
            this.markVisited(current.x, current.y);
            
            // Если нашли точку ветвления или пересечение, останавливаемся
            if (neighbors.length > 1) break;
        }
        
        return this.simplifyLine(line);
    }

    // Поиск начала линии (точка с 1 соседом)
    findLineStart(x, y) {
        let current = { x, y };
        let visitedLocal = new Set();
        visitedLocal.add(`${x},${y}`);
        
        while (true) {
            const neighbors = this.getBlackNeighbors(current.x, current.y)
                .filter(n => !visitedLocal.has(`${n.x},${n.y}`));
            
            if (neighbors.length !== 1) break;
            
            current = neighbors[0];
            visitedLocal.add(`${current.x},${current.y}`);
        }
        
        return current;
    }

    // Получение черных соседей
    getBlackNeighbors(x, y) {
        const neighbors = [];
        const directions = [
            [-1, -1], [0, -1], [1, -1],
            [-1, 0],           [1, 0],
            [-1, 1],  [0, 1],  [1, 1]
        ];
        
        for (const [dx, dy] of directions) {
            const nx = x + dx, ny = y + dy;
            if (this.isInBounds(nx, ny) && this.isBlackPixel(nx, ny)) {
                neighbors.push({ x: nx, y: ny });
            }
        }
        
        return neighbors;
    }

    // Только непосещенные черные соседи
    getUnvisitedBlackNeighbors(x, y) {
        return this.getBlackNeighbors(x, y)
            .filter(n => !this.isVisited(n.x, n.y));
    }

    // Проверка черного пикселя
    isBlackPixel(x, y) {
        const index = (y * this.width + x) * 4;
        const r = this.imageData.data[index];
        const g = this.imageData.data[index + 1];
        const b = this.imageData.data[index + 2];
        const a = this.imageData.data[index + 3];
        
        // Черный пиксель (или очень темный) и не прозрачный
        return a > 0;
    }

    isInBounds(x, y) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    isVisited(x, y) {
        return this.visited.has(`${x},${y}`);
    }

    markVisited(x, y) {
        this.visited.add(`${x},${y}`);
    }

    // Упрощение линии (удаление избыточных точек)
    simplifyLine(line, tolerance = 1.0) {
        if (line.length < 3) return line;
        
        const simplified = [line[0]];
        
        for (let i = 1; i < line.length - 1; i++) {
            const prev = simplified[simplified.length - 1];
            const current = line[i];
            const next = line[i + 1];
            
            // Проверяем, лежит ли точка на прямой между prev и next
            if (!this.isPointOnLine(prev, next, current, tolerance)) {
                simplified.push(current);
            }
        }
        
        simplified.push(line[line.length - 1]);
        return simplified;
    }

    isPointOnLine(p1, p2, testPoint, tolerance) {
        const area = Math.abs(
            (p2.x - p1.x) * (testPoint.y - p1.y) - 
            (testPoint.x - p1.x) * (p2.y - p1.y)
        );
        const length = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
        return area / length < tolerance;
    }
}