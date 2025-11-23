let bufferYcache; //Для того чтобы избавиться от операции умножения
let bufferXcache; //Для того чтобы избавиться от операции умножения
let textureYCache; //Для текстуры можно по одной стороне, они квадратные
let distInvCache; //Кэш расстояния, чтобы отказаться от деления в циклах

class Render {
	
	imageData;
	frameBuffer;
	project = new Float16Array( 2 );
	
	constructor() {
		this.frameBuffer = new Uint8Array( canvas.width * canvas.height * 4 );
		bufferYcache     = new Uint32Array( canvas.height );
		bufferXcache     = new Uint32Array( canvas.width );
		textureYCache    = new Uint32Array( textSize );
		distInvCache     = new Float32Array( 1000 );
		for( let y = 0; y < canvas.height; y++ ) {
			bufferYcache[ y ] = y * ( canvas.width * 4 );
		}
		for( let x = 0; x < canvas.width; x++ ) {
			bufferXcache[ x ] = x * 4;
		}
		for( let y = 0; y < textSize; y++ ) {
			textureYCache[ y ] = y * ( textSize * 4 );
		}
		for ( let d = 0; d < 1000; d++ ) {
			distInvCache[ d ] = 1 / d;
		}
	}
	DrawBG() {
		for( let y = 0; y < canvas.height; y++ ) {
			for( let x = 0; x < canvas.width; x++ ) {
				let buffI = bufferYcache[ y ] + bufferXcache[ x ];
				if( this.frameBuffer[ buffI + 1 ] > 0 ) continue;
				this.frameBuffer[ buffI ]     = 255;
				this.frameBuffer[ buffI + 1 ] = 255;
				this.frameBuffer[ buffI + 2 ] = 255;
				this.frameBuffer[ buffI + 3 ] = 255;
			}
		}	
	}
	ProjectPoint( point , position , wallHeight = 1 ) {
		let rotated   = new Float16Array( 3 );
		let projected = new Float16Array( 4 );
		let camCoords = SubtractVectorsF( point , position );
		// Поворачиваем точку
		rotated[ 0 ] = camCoords[ 0 ] * this.project[ 0 ] - camCoords[ 2 ] * this.project[ 1 ]; //x
		rotated[ 1 ] = 0; //z
		rotated[ 2 ] = camCoords[ 0 ] * this.project[ 1 ] + camCoords[ 2 ] * this.project[ 0 ]; //z
		// Проецируем точку
		projected[ 0 ] = ( ( rotated[ 0 ] / rotated[ 2 ] ) * scale + widthH ) | 0;
		projected[ 1 ] = point[ 1 ];
		projected[ 2 ] = Math.min( wallHMax , ( wallHMax * ( 1 / Math.hypot( camCoords[ 0 ] , camCoords[ 1 ] , camCoords[ 2 ] ) ) | 0 ) ); //Полный размер проекции
		projected[ 3 ] = ( projected[ 2 ] * wallHeight ) | 0; //Отмасштабированная стена
		return projected;
	}
	SetProject() {
		this.project[ 0 ] = Math.cos( camAngle );
		this.project[ 1 ] = Math.sin( camAngle );
	}
	GetWallDrawPoints( p1 , p2 ) {
		let topLeft     = CreateVector2F( p1[ 0 ] , heightH - ( p1[ 3 ] ) - ( p1[ 1 ] - position[ 1 ] ) * p1[ 2 ] );
		let topRight    = CreateVector2F( p2[ 0 ] , heightH - ( p2[ 3 ] ) - ( p2[ 1 ] - position[ 1 ] ) * p2[ 2 ] );
		let bottomLeft  = CreateVector2F( topLeft[ 0 ]  , topLeft[ 1 ]  + p1[ 3 ] );
		let bottomRight = CreateVector2F( topRight[ 0 ] , topRight[ 1 ] + p2[ 3 ] );
		return [ topLeft , topRight , bottomLeft , bottomRight ];
	}
	RenderWallPolygon( p1 , p2 , wallHeight , texture ) {

		let topLeft     = CreateVector2F( p1[ 0 ] , heightH - ( p1[ 2 ] >> 1 ) - p1[ 1 ] * p1[ 2 ] );
		let topRight    = CreateVector2F( p2[ 0 ] , heightH - ( p2[ 2 ] >> 1 ) - p2[ 1 ] * p2[ 2 ] );
		let bottomLeft  = CreateVector2F( topLeft[ 0 ]  , topLeft[ 1 ]  + p1[ 2 ] );
		let bottomRight = CreateVector2F( topRight[ 0 ] , topRight[ 1 ] + p2[ 2 ] );
		
		let xDiff    = ( p2[ 0 ] - p1[ 0 ] ) | 0;
		let dir      = Math.sign( xDiff );
			xDiff    = Math.abs( xDiff );
		let hDiff    = p2[ 2 ] - p1[ 2 ];
		let xDiffInv = distInvCache[ xDiff | 0 ];

		for( let x = 0; x < xDiff; x += 1 ) {
			let p  = x * xDiffInv;
			let h  = p1[ 2 ] + hDiff * p;
			let hh = h >> 1;
			context.drawImage( img ,( textSize * p ) | 0 , 0 , 1 , img.height * wallHeight , p1[ 0 ] + x * dir , ( heightH - hh - ( p1[ 1 ] * h ) ) | 0 , 1 , h );
		}
		
		return [ topLeft , topRight , bottomLeft , bottomRight ];
	}
	//Упрощённый рендер, так как знаем что нижняя часть всегда парралельна верхней
	RenderWallPolygonOpt( p1 , p2 , p3 , p4 , textureData , shadow = 0 ) {
		//Считаем разницу по x, чтобы отрисовать полоску по x
		const xStart   = p1[ 0 ];
		let xDiff      = p2[ 0 ] - p1[ 0 ];
		let xDir       = Math.sign( xDiff ); //Запоминаем направление
			xDiff      = Math.abs( xDiff | 0 );
		//Кэш для избежания деления
		const xDistInv = distInvCache[ xDiff ];
		//Считаем разницу по оси y верха и низа
		const topDist_y = p2[ 1 ] - p1[ 1 ];
		const botDist_y = p4[ 1 ] - p3[ 1 ];
		//Считаем шаг по оси y верха и низа
		const topStep_y = topDist_y * xDistInv;
		const botStep_y = botDist_y * xDistInv;
		//Пройденный путь, стартуем с начальной точки
		let wayTop_y = p1[ 1 ];
		let wayBot_y = p3[ 1 ];
		//Стартуем цикл по оси x
		for( let x = 0; x < xDiff; x += 2 ) {
			let pixel_x  = xStart + x * xDir;
			let px       = ( textSize * ( x * xDistInv ) ) | 0;
			let yDiff    = ( wayBot_y - wayTop_y ) | 0;
			let yDistInv = distInvCache[ yDiff ];
			//Красим полоску по y
			for( let y = 0; y < yDiff; y++ ) {
				let pixel_y = ( wayTop_y + y + 1 ) | 0;
				let py      = ( textSize * ( y * yDistInv ) ) | 0;
				let buffI   = bufferYcache[ pixel_y ] + bufferXcache[ pixel_x ];
				let buffI2  = bufferYcache[ pixel_y + 1 ] + bufferXcache[ pixel_x ];
				let pixelI  = textureYCache[ py ] + bufferXcache[ px ];

				//Красим 2 пикселя
				this.frameBuffer[ buffI ]     = textureData[ pixelI ] - shadow;
				this.frameBuffer[ buffI + 1 ] = textureData[ pixelI + 1 ] - shadow;
				this.frameBuffer[ buffI + 2 ] = textureData[ pixelI + 2 ] - shadow;
				this.frameBuffer[ buffI + 3 ] = 255;
				
				this.frameBuffer[ buffI + 4 ] = textureData[ pixelI + 4 ] - shadow;
				this.frameBuffer[ buffI + 5 ] = textureData[ pixelI + 5 ] - shadow;
				this.frameBuffer[ buffI + 6 ] = textureData[ pixelI + 6 ] - shadow;
				this.frameBuffer[ buffI + 7 ] = 255;
				
				this.frameBuffer[ buffI2 ]     = textureData[ pixelI ] - shadow;
				this.frameBuffer[ buffI2 + 1 ] = textureData[ pixelI + 1 ] - shadow;
				this.frameBuffer[ buffI2 + 2 ] = textureData[ pixelI + 2 ] - shadow;
				this.frameBuffer[ buffI2 + 3 ] = 255;
				
				this.frameBuffer[ buffI2 + 4 ] = textureData[ pixelI + 4 ] - shadow;
				this.frameBuffer[ buffI2 + 5 ] = textureData[ pixelI + 5 ] - shadow;
				this.frameBuffer[ buffI2 + 6 ] = textureData[ pixelI + 6 ] - shadow;
				this.frameBuffer[ buffI2 + 7 ] = 255;
			}
			wayTop_y += topStep_y;
			wayTop_y += topStep_y;
			wayBot_y += botStep_y;
			wayBot_y += botStep_y;
		}
	}

	ReadBuffer() {
		this.imageData = context.getImageData( 0 , 0 , canvas.width , canvas.height );
		this.frameBuffer = this.imageData.data;
	}
	DrawBuffer() {
		context.putImageData( this.imageData , 0 , 0 );
	}
	RenderTexturedFloorDoomOpt( p1 , p2 , p3 , p4 , textureData , shadows  ) { //v1 , v2 - линия текстурирования от, v3 , v4 - линия текстурирования до
		//ScanLine алгоритм
		//Базовое направление
		const baseDirection1_x = p2[ 0 ] - p1[ 0 ];
		const baseDirection1_y = p2[ 1 ] - p1[ 1 ];
		const baseDirection2_x = p4[ 0 ] - p3[ 0 ];
		const baseDirection2_y = p4[ 1 ] - p3[ 1 ];
		//Считаем расстояние цикла
		const shadDist1 = shadows[ 0 ] * 0.1;
		const shadDist2 = shadows[ 2 ] * 0.1;
		const baseDist1 = Math.max( Math.abs( baseDirection1_x ) , Math.abs( baseDirection1_y ) );
		const baseDist2 = Math.max( Math.abs( baseDirection2_x ) , Math.abs( baseDirection2_y ) );
		const baseDist  = Math.min( Math.max( baseDist1 , baseDist2 ) , width );
		//Оптимизация t, чтобы избежать деления в цикле
		const baseDistInv = distInvCache[ baseDist | 0 ];
		//Считаем шаг цикла
		const baseStep1_x  = baseDirection1_x * baseDistInv;
		const baseStep1_y  = baseDirection1_y * baseDistInv;
		const baseStep2_x  = baseDirection2_x * baseDistInv;
		const baseStep2_y  = baseDirection2_y * baseDistInv;
		const shadStep1    = shadDist1 * baseDistInv;
		//Инициализируем переменные для подсчёта прохода, дабы отказаться от умножения, даёт погрешность, но она компенсируется костылём fill;
		let baseWay1_x = 0;
		let baseWay1_y = 0;
		let baseWay2_x = 0;
		let baseWay2_y = 0;
		let shadWay1   = 0;
		const start1_x = p1[ 0 ];
		const start1_y = p1[ 1 ];
		const start2_x = p3[ 0 ];
		const start2_y = p3[ 1 ];
		for( let d = 0; d < baseDist; d++ ) {
			//Считаем старт лини от основания
			const start_x = start1_x + baseWay1_x;
			const start_y = start1_y + baseWay1_y;
			const end_x = start2_x + baseWay2_x;
			const end_y = start2_y + baseWay2_y;
			//Считаем направление закраски линии
			const dir_x = end_x - start_x;
			const dir_y = end_y - start_y;
			//Считаем длинну линии
			const dist  = Math.min( Math.max( Math.abs( dir_x ) , Math.abs( dir_y ) ) , width );
			let distInv = 1 / dist;
			//Считаем шаг
			const shadStep2 = shadDist2 * distInv;
			const step_x    = dir_x * distInv;
			const step_y    = dir_y * distInv;
			//Подсчёт прохода
			let way_x = 0;
			let way_y = 0;
			let shadWay2 = 0;
			//Сразу считаем пиксель вывода по x
			const px = ( textSize * ( d * baseDistInv ) ) | 0; //Быстрое округление
			//Закрашиваем полоску
			for( let p = 0; p < dist; p += 1 ) {
				const py      = ( textSize * ( p * distInv ) ) | 0;
				const pixel_x = ( start_x + way_x + 0.5 ) | 0;
				const pixel_y = ( start_y + way_y + 0.5 ) | 0;
				//Индексы буфера кадра и текстуры
				let buffI  = bufferYcache[ pixel_y ] + bufferXcache[ pixel_x ];
				let pixelI = textureYCache[ py ] + bufferXcache[ px ];
				//Красим 2 пикселя
				let shadow  = ( shadWay1 + shadWay2 );
				this.frameBuffer[ buffI ]     = textureData[ pixelI ] - shadow;
				this.frameBuffer[ buffI + 1 ] = textureData[ pixelI + 1 ] - shadow;
				this.frameBuffer[ buffI + 2 ] = textureData[ pixelI + 2 ] - shadow;
				this.frameBuffer[ buffI + 3 ] = 255;
				
				this.frameBuffer[ buffI + 4 ] = textureData[ pixelI + 4 ] - shadow;
				this.frameBuffer[ buffI + 5 ] = textureData[ pixelI + 5 ] - shadow;
				this.frameBuffer[ buffI + 6 ] = textureData[ pixelI + 6 ] - shadow;
				this.frameBuffer[ buffI + 7 ] = 255;
				//Шаг
				way_x += step_x;
				//way_x += step_x;
				way_y += step_y;
				//way_y += step_y;
				shadWay2 += shadStep2;
			}
			//Шаг
			baseWay1_x += baseStep1_x;
			baseWay1_y += baseStep1_y;
			baseWay2_x += baseStep2_x;
			baseWay2_y += baseStep2_y;
			shadWay1   += shadStep1;
		}
	}
}