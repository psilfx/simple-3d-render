let bufferYcache; //Для того чтобы избавиться от операции умножения
let bufferXcache; //Для того чтобы избавиться от операции умножения
let textureYCache; //Для текстуры можно по одной стороне, они квадратные
let distInvCache; //Кэш расстояния, чтобы отказаться от деления в циклах
let distCosCache;

class Render {
	
	imageData;
	visualBuffer_walls; //Буффер для хранения точек вывода и последующей сортировки по удалению
	visualBuffer_flats; //Буффер для хранения точек вывода, отличается от стен способом рендера
	frameBuffer;
	
	constructor() {
		this.frameBuffer = new Uint8Array( canvas.width * canvas.height * 4 );
		bufferYcache     = new Uint32Array( canvas.height );
		bufferXcache     = new Uint32Array( canvas.width );
		textureYCache    = new Uint32Array( textSize );
		distInvCache     = new Float32Array( 1280 );
		distCosCache     = new Float16Array( width );
		let angleStep    = fov / width;
		for( let y = 0; y < canvas.height; y++ ) {
			bufferYcache[ y ] = y * ( canvas.width * 4 );
		}
		for( let x = 0; x < canvas.width; x++ ) {
			bufferXcache[ x ] = x * 4;
		}
		for( let y = 0; y < textSize; y++ ) {
			textureYCache[ y ] = y * ( textSize * 4 );
		}
		for ( let d = 0; d < 1280; d++ ) {
			distInvCache[ d ] = 1 / d;
		}
		for( let w = 0; w < width; w++ ) {
			let angle = angleStep * w;
			distCosCache[ w ] = Math.cos( angle );
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
		let camNormal = camera.normalC;
		// Поворачиваем точку
		rotated[ 0 ] = camCoords[ 0 ] * camNormal[ 0 ] + camCoords[ 2 ] * camNormal[ 2 ]; //x
		rotated[ 1 ] = 0; //z
		rotated[ 2 ] = camCoords[ 0 ] * camNormal[ 2 ] - camCoords[ 2 ] * camNormal[ 0 ]; //z
		let cosDist =  Math.cos( Math.atan2( camCoords[ 2 ] , camCoords[ 0 ] ) - ( camera.angle ) );
		// Проецируем точку
		projected[ 0 ] = ( widthH + ( rotated[ 0 ] / rotated[ 2 ] ) * scale ) | 0;
		projected[ 1 ] = point[ 1 ];
		projected[ 2 ] = Math.min( wallHMax , ( wallHMax * ( 1 / Math.max( near , Math.hypot( camCoords[ 0 ] , camCoords[ 1 ] , camCoords[ 2 ] ) * cosDist ) ) ) ) | 0; //Полный размер проекции
		projected[ 3 ] = ( projected[ 2 ] * wallHeight ) | 0; //Отмасштабированная стена
		
		return projected;
	}
	
	GetWallDrawPoints( p1 , p2 ) {
		let topLeft     = CreateVector2F( p1[ 0 ] , heightH - ( p1[ 3 ] ) - ( ( p1[ 1 ] - cameraPosition[ 1 ] ) * p1[ 2 ] ) | 0 );
		let topRight    = CreateVector2F( p2[ 0 ] , heightH - ( p2[ 3 ] ) - ( ( p2[ 1 ] - cameraPosition[ 1 ] ) * p2[ 2 ] ) | 0 );
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
		for( let x = 0; x <= xDiff; x += 2 ) {
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
	Update() {
		this.visualBuffer_walls = [];
	}

	ReadBuffer() {
		this.imageData = context.getImageData( 0 , 0 , canvas.width , canvas.height );
		this.frameBuffer = this.imageData.data;
	}
	DrawBuffer() {
		context.putImageData( this.imageData , 0 , 0 );
	}
	RenderTexturedFloorDoomOpt( p1 , p2 , p3 , p4 , textureData , shadows  ) { //v1 , v2 - линия текстурирования от, v3 , v4 - линия текстурирования до
		if( ( p1[ 0 ] <= 0 && p2[ 0 ] <= 0 && p3[ 0 ] <= 0 && p4[ 0 ] <= 0 ) ||
			( p1[ 0 ] >= width && p2[ 0 ] >= width && p3[ 0 ] >= width && p4[ 0 ] >= width ) ||
			( p1[ 1 ] >= height && p2[ 1 ] >= height && p3[ 1 ] >= height && p4[ 1 ] >= height ) ||
			( p1[ 0 ] <= widthMin || p2[ 0 ] <= widthMin || p3[ 0 ] <= widthMin || p4[ 0 ] <= widthMin ) ||
			( p1[ 0 ] >= widthMax || p2[ 0 ] >= widthMax || p3[ 0 ] >= widthMax || p4[ 0 ] >= widthMax )
			) return;
		//Сортируем по y , потом по x
		const points = [ p1 , p2 , p3 , p4 ];
			  points.sort( ( a , b ) => a[ 1 ] - b[ 1 ] );
		[ p1 , p2 , p3 , p4 ] = points;
		
		const topPoints = [ p1 , p2 ];
			  topPoints.sort( ( a , b ) => a[ 0 ] - b[ 0 ] );
		[ p1 , p2 ] = topPoints;
		
		const botPoints = [ p3 , p4 ];
			  botPoints.sort( ( a , b ) => a[ 0 ] - b[ 0 ] );
		[ p3 , p4 ] = botPoints;
		
		//ScanLine алгоритм
		//Базовое направление
		const baseDirection1_x = p2[ 0 ] - p1[ 0 ];
		const baseDirection1_y = p2[ 1 ] - p1[ 1 ];
		const baseDirection2_x = p4[ 0 ] - p3[ 0 ];
		const baseDirection2_y = p4[ 1 ] - p3[ 1 ];
		const uvDirection1_x   = p2[ 2 ] - p1[ 2 ];
		const uvDirection1_y   = p2[ 3 ] - p1[ 3 ];
		const uvDirection2_x   = p4[ 2 ] - p3[ 2 ];
		const uvDirection2_y   = p4[ 3 ] - p3[ 3 ];
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
		const uvStep1_x    = uvDirection1_x * baseDistInv;
		const uvStep1_y    = uvDirection1_y * baseDistInv;
		const uvStep2_x    = uvDirection2_x * baseDistInv;
		const uvStep2_y    = uvDirection2_y * baseDistInv;
		const shadStep1    = shadDist1 * baseDistInv;
		//Инициализируем переменные для подсчёта прохода, дабы отказаться от умножения, даёт погрешность, но она компенсируется костылём fill;
		let baseWay1_x = 0;
		let baseWay1_y = 0;
		let baseWay2_x = 0;
		let baseWay2_y = 0;
		let uvWay1_x   = 0;
		let uvWay1_y   = 0;
		let uvWay2_x   = 0;
		let uvWay2_y   = 0;
		let shadWay1   = 0;
		const start1_x = p1[ 0 ];
		const start1_y = p1[ 1 ];
		const start2_x = p3[ 0 ];
		const start2_y = p3[ 1 ];
		const uvSt1_x  = p1[ 2 ];
		const uvSt1_y  = p1[ 3 ];
		const uvSt2_x  = p3[ 2 ];
		const uvSt2_y  = p3[ 3 ];
		for( let d = 0; d < baseDist; d +=2 ) {
			//Считаем старт лини от основания
			const start_x = start1_x + baseWay1_x;
			const start_y = start1_y + baseWay1_y;
			const end_x = start2_x + baseWay2_x;
			const end_y = start2_y + baseWay2_y;
			if( start_x >= width && end_x >= width ) break;
			//UV
			const uv1_x = uvSt1_x + uvWay1_x;
			const uv1_y = uvSt1_y + uvWay1_y;
			const uv2_x = uvSt2_x + uvWay2_x;
			const uv2_y = uvSt2_y + uvWay2_y;
			
			const uv_dir_x = uv2_x - uv1_x;
			const uv_dir_y = uv2_y - uv1_y;
			//Считаем направление закраски линии
			const dir_x = end_x - start_x;
			const dir_y = end_y - start_y;
			//Считаем длинну линии
			const dist  = Math.min( Math.max( Math.abs( dir_x ) , Math.abs( dir_y ) ) , width );
			let distInv = distInvCache[ Math.round( dist ) ];
			//Считаем шаг
			const shadStep2 = shadDist2 * distInv;
			const step_x    = dir_x * distInv;
			const step_y    = dir_y * distInv;
			const step_uv_x = uv_dir_x * distInv;
			const step_uv_y = uv_dir_y * distInv;
			//Подсчёт прохода
			let way_x = 0;
			let way_y = 0;
			let uvw_x = uv1_x;
			let uvw_y = uv1_y;
			let shadWay2 = 0;
			//Закрашиваем полоску
			for( let p = 0; p < dist; p += 2 ) {
				// const textX   = uv1_x + uv_dir_x * ( p * distInv );
				// const textY   = uv1_y + uv_dir_y * ( p * distInv );
				const px      = ( ( textSize - 1 ) * uvw_x ) | 0; //Быстрое округление
				const py      = ( ( textSize - 1 ) * uvw_y ) | 0;
				//if( py == 0 ) console.log( uv_dir_x , uv_dir_y );
				const pixel_x = ( start_x + way_x + 0.5 ) | 0;
				const pixel_y = ( start_y + way_y + 0.5 ) | 0;
				if( pixel_y > canvas.height ) break;
				//Индексы буфера кадра и текстуры
				
					let buffI  = bufferYcache[ pixel_y ] + bufferXcache[ pixel_x ];
					let pixelI = textureYCache[ py ] + bufferXcache[ px ];
					
					//Красим 2 пикселя
					let shadow  = ( shadWay1 + shadWay2 );
					//Хардкод для оптимизации, вложенные циклы работают медленнее
					if( this.frameBuffer[ buffI - 4 ] == 0 ) {
						this.frameBuffer[ buffI - 4 ] = textureData[ pixelI ] - shadow;
						this.frameBuffer[ buffI - 3 ] = textureData[ pixelI + 1 ] - shadow;
						this.frameBuffer[ buffI - 2 ] = textureData[ pixelI + 2 ] - shadow;
						this.frameBuffer[ buffI - 1 ] = 255;
					}
					
					this.frameBuffer[ buffI ]     = textureData[ pixelI ] - shadow;
					this.frameBuffer[ buffI + 1 ] = textureData[ pixelI + 1 ] - shadow;
					this.frameBuffer[ buffI + 2 ] = textureData[ pixelI + 2 ] - shadow;
					this.frameBuffer[ buffI + 3 ] = 255;
					
					//if( this.frameBuffer[ buffI + 4 ] == 0 ) {
						this.frameBuffer[ buffI + 4 ] = textureData[ pixelI + 4 ] - shadow;
						this.frameBuffer[ buffI + 5 ] = textureData[ pixelI + 5 ] - shadow;
						this.frameBuffer[ buffI + 6 ] = textureData[ pixelI + 6 ] - shadow;
						this.frameBuffer[ buffI + 7 ] = 255;
					//}
					
					buffI  = bufferYcache[ pixel_y - 1 ] + bufferXcache[ pixel_x ];
					pixelI = textureYCache[ Math.max( py - 1 , 0 ) ] + bufferXcache[ px ];
					
					if( this.frameBuffer[ buffI - 4 ] == 0 ) {
						this.frameBuffer[ buffI - 4 ] = textureData[ pixelI ] - shadow;
						this.frameBuffer[ buffI - 3 ] = textureData[ pixelI + 1 ] - shadow;
						this.frameBuffer[ buffI - 2 ] = textureData[ pixelI + 2 ] - shadow;
						this.frameBuffer[ buffI - 1 ] = 255;
					}
					
					if( this.frameBuffer[ buffI ] == 0 ) {
						this.frameBuffer[ buffI ]     = textureData[ pixelI ] - shadow;
						this.frameBuffer[ buffI + 1 ] = textureData[ pixelI + 1 ] - shadow;
						this.frameBuffer[ buffI + 2 ] = textureData[ pixelI + 2 ] - shadow;
						this.frameBuffer[ buffI + 3 ] = 255;
					}
					if( this.frameBuffer[ buffI + 4 ] == 0 ) {
						this.frameBuffer[ buffI + 4 ] = textureData[ pixelI + 4 ] - shadow;
						this.frameBuffer[ buffI + 5 ] = textureData[ pixelI + 5 ] - shadow;
						this.frameBuffer[ buffI + 6 ] = textureData[ pixelI + 6 ] - shadow;
						this.frameBuffer[ buffI + 7 ] = 255;
					}
					
					buffI  = bufferYcache[ pixel_y + 1 ] + bufferXcache[ pixel_x ];
					pixelI = textureYCache[ Math.min( py + 1 , textSize - 1 ) ] + bufferXcache[ px ];
					
					if( this.frameBuffer[ buffI - 4 ] == 0 ) {
						this.frameBuffer[ buffI - 4 ] = textureData[ pixelI ] - shadow;
						this.frameBuffer[ buffI - 3 ] = textureData[ pixelI + 1 ] - shadow;
						this.frameBuffer[ buffI - 2 ] = textureData[ pixelI + 2 ] - shadow;
						this.frameBuffer[ buffI - 1 ] = 255;
					}
					//if( this.frameBuffer[ buffI ] == 0 ) {
						this.frameBuffer[ buffI ]     = textureData[ pixelI ] - shadow;
						this.frameBuffer[ buffI + 1 ] = textureData[ pixelI + 1 ] - shadow;
						this.frameBuffer[ buffI + 2 ] = textureData[ pixelI + 2 ] - shadow;
						this.frameBuffer[ buffI + 3 ] = 255;
					//}
					//if( this.frameBuffer[ buffI + 4 ] == 0 ) {
						this.frameBuffer[ buffI + 4 ] = textureData[ pixelI + 4 ] - shadow;
						this.frameBuffer[ buffI + 5 ] = textureData[ pixelI + 5 ] - shadow;
						this.frameBuffer[ buffI + 6 ] = textureData[ pixelI + 6 ] - shadow;
						this.frameBuffer[ buffI + 7 ] = 255;
					//}
				
				//Шаг
				way_x += step_x;
				way_x += step_x;
				way_y += step_y;
				way_y += step_y;
				uvw_x += step_uv_x;
				uvw_x += step_uv_x;
				uvw_y += step_uv_y;
				uvw_y += step_uv_y;
				shadWay2 += shadStep2;
			}
			
			//Шаг
			baseWay1_x += baseStep1_x ;
			baseWay1_x += baseStep1_x ;
			baseWay1_y += baseStep1_y ;
			baseWay1_y += baseStep1_y ;
			baseWay2_x += baseStep2_x ;
			baseWay2_x += baseStep2_x ;
			baseWay2_y += baseStep2_y ;
			baseWay2_y += baseStep2_y ;
			uvWay1_x   += uvStep1_x;
			uvWay1_x   += uvStep1_x;
			uvWay1_y   += uvStep1_y;
			uvWay1_y   += uvStep1_y;
			uvWay2_x   += uvStep2_x;
			uvWay2_x   += uvStep2_x;
			uvWay2_y   += uvStep2_y;
			uvWay2_y   += uvStep2_y;
			shadWay1   += shadStep1;
			
		}
	}
	RenderTriangleScanline( p1 , p2 , p3 , textureData ) {
		if( ( p1[ 0 ] <= 0 && p2[ 0 ] <= 0 && p3[ 0 ] <= 0 ) ||
			( p1[ 0 ] >= width && p2[ 0 ] >= width && p3[ 0 ] >= width ) ||
			( p1[ 1 ] >= height && p2[ 1 ] >= height && p3[ 1 ] >= height ) ||
			( p1[ 0 ] <= widthMin || p2[ 0 ] <= widthMin || p3[ 0 ] <= widthMin ) ||
			( p1[ 0 ] >= widthMax || p2[ 0 ] >= widthMax || p3[ 0 ] >= widthMax )
			) return;
		const points = [ p1 , p2 , p3 ];
			  points.sort( ( a , b ) => a[ 1 ] - b[ 1 ] );
		
		const [ top , middle , bottom ] = points;

		// Вычисляем обратные наклоны (dx/dy)
		const diff1_y = ( middle[ 1 ] - top[ 1 ] )    | 0;
		const diff2_y = ( bottom[ 1 ] - top[ 1 ] )    | 0;
		const diff3_y = ( bottom[ 1 ] - middle[ 1 ] ) | 0;
		//
		const dir1_x  = ( middle[ 0 ] - top[ 0 ] )    * distInvCache[ diff1_y ];
		const dir2_x  = ( bottom[ 0 ] - top[ 0 ] )    * distInvCache[ diff2_y ];
		const dir3_x  = ( bottom[ 0 ] - middle[ 0 ] ) * distInvCache[ diff3_y ];
		let way1_x    = top[ 0 ];
		let way2_x    = top[ 0 ];
		
		const uw_diff1_x = middle[ 2 ] - top[ 2 ];
		const uw_diff2_x = bottom[ 2 ] - top[ 2 ];
		const uw_diff3_x = bottom[ 2 ] - middle[ 2 ];
		
		const uw_diff1_y = middle[ 3 ] - top[ 3 ];
		const uw_diff2_y = bottom[ 3 ] - top[ 3 ];
		const uw_diff3_y = bottom[ 3 ] - middle[ 3 ];
		
		const step1_u = uw_diff1_x * distInvCache[ diff1_y ];
		const step2_u = uw_diff2_x * distInvCache[ diff2_y ];
		const step3_u = uw_diff3_x * distInvCache[ diff3_y ];
    
		const step1_v = uw_diff1_y * distInvCache[ diff1_y ];
		const step2_v = uw_diff2_y * distInvCache[ diff2_y ];
		const step3_v = uw_diff3_y * distInvCache[ diff3_y ];
		
		let uv1_start_x   = top[ 2 ];
		let uv1_start_y   = top[ 3 ];
		const uv2_start_x = top[ 2 ];
		const uv2_start_y = top[ 3 ];
		
		let uv1_way_x = 0;
		let uv1_way_y = 0;
		let uv2_way_x = 0;
		let uv2_way_y = 0;
		let yCount  = 0;

		// Верхняя часть треугольника (от top до middle)
		for ( let y = top[ 1 ] | 0; y < middle[ 1 ] | 0; y++ ) {
			const startX   = Math.min( way1_x , way2_x );
			const endX     = Math.max( way1_x , way2_x );
			const x_diff   = way2_x - way1_x;
			const x_dist   = Math.abs( x_diff );
			const t        = distInvCache[ x_dist | 0 ];
			const uv1_x    = uv1_start_x + uv1_way_x;
			const uv1_y    = uv1_start_y + uv1_way_y;
			const uv2_x    = uv2_start_x + uv2_way_x;
			const uv2_y    = uv2_start_y + uv2_way_y;
			const uv_d_x   = ( uv2_x - uv1_x );
			const uv_d_y   = ( uv2_y - uv1_y );
			const uv_s_x   = uv_d_x * t;
            const uv_s_y   = uv_d_y * t;
			
			const x_dir  = ( x_diff >= 0 ) ? 1 : -1;
			
            let uvw_x  = uv1_x;
            let uvw_y  = uv1_y;

			for ( let xd = 0; xd <= x_dist; xd += 2 ) {
				const x = way1_x + xd * x_dir;
				//Индексы буфера кадра и текстуры
				const px = ( ( uvw_x ) * ( textSize - 1 ) ) | 0;
				const py = ( ( uvw_y ) * ( textSize - 1 ) ) | 0;
				
				//console.log( px , py );
				let buffI  = bufferYcache[ y ]   + bufferXcache[ x | 0 ];
				let pixelI = textureYCache[ py | 0 ] + bufferXcache[ px | 0 ];
				
				this.frameBuffer[ buffI ]     = textureData[ pixelI ];
				this.frameBuffer[ buffI + 1 ] = textureData[ pixelI + 1 ];
				this.frameBuffer[ buffI + 2 ] = textureData[ pixelI + 2 ];
				this.frameBuffer[ buffI + 3 ] = 255;
				
				buffI  = bufferYcache[ y ]   + bufferXcache[ ( x | 0 ) + 1 * x_dir ];
				
				this.frameBuffer[ buffI ]     = textureData[ pixelI ];
				this.frameBuffer[ buffI + 1 ] = textureData[ pixelI + 1 ];
				this.frameBuffer[ buffI + 2 ] = textureData[ pixelI + 2 ];
				this.frameBuffer[ buffI + 3 ] = 255;
				
				uvw_x += uv_s_x;
                uvw_y += uv_s_y;
				uvw_x += uv_s_x;
                uvw_y += uv_s_y;
			}
			way1_x += dir1_x;
			way2_x += dir2_x;
			uv1_way_x += step1_u; 
			uv1_way_y += step1_v;
			uv2_way_x += step2_u; 
			uv2_way_y += step2_v;
		}
		
		// Корректируем начальные значения для нижней части
		way1_x       = middle[ 0 ];
		uv1_start_x  = middle[ 2 ];
		uv1_start_y  = middle[ 3 ];
		uv1_way_x    = 0;
		uv1_way_y    = 0;
		// Нижняя часть треугольника (от middle до bottom)
		for ( let y = middle[ 1 ] | 0; y <= bottom[ 1 ] | 0; y++ ) {
			const x_diff   = way2_x - way1_x;
			const x_dist   = Math.abs( x_diff );
			const t        = distInvCache[ x_dist | 0 ];
			const uv1_x    = uv1_start_x + uv1_way_x;
			const uv1_y    = uv1_start_y + uv1_way_y;
			const uv2_x    = uv2_start_x + uv2_way_x;
			const uv2_y    = uv2_start_y + uv2_way_y;
			const uv_d_x   = ( uv2_x - uv1_x );
			const uv_d_y   = ( uv2_y - uv1_y );
			const uv_s_x   = uv_d_x * t;
            const uv_s_y   = uv_d_y * t;
			
			const x_dir  = ( x_diff >= 0 ) ? 1 : -1;
			
            let uvw_x  = uv1_x;
            let uvw_y  = uv1_y;

			for ( let xd = 0; xd <= x_dist; xd += 2 ) {
				const x = way1_x + xd * x_dir;
				//Индексы буфера кадра и текстуры
				const px = ( uvw_x  * ( textSize - 1 ) ) | 0;
				const py = ( uvw_y  * ( textSize - 1 ) ) | 0;
				
				let buffI  = bufferYcache[ y ]   + bufferXcache[ x | 0 ];
				let pixelI = textureYCache[ py | 0 ] + bufferXcache[ px | 0 ];
				
				this.frameBuffer[ buffI ]     = textureData[ pixelI ];
				this.frameBuffer[ buffI + 1 ] = textureData[ pixelI + 1 ];
				this.frameBuffer[ buffI + 2 ] = textureData[ pixelI + 2 ];
				this.frameBuffer[ buffI + 3 ] = 255;
				
				buffI  = bufferYcache[ y ]   + bufferXcache[ ( x | 0 ) + 1 * x_dir ];
				
				this.frameBuffer[ buffI ]     = textureData[ pixelI ];
				this.frameBuffer[ buffI + 1 ] = textureData[ pixelI + 1 ];
				this.frameBuffer[ buffI + 2 ] = textureData[ pixelI + 2 ];
				this.frameBuffer[ buffI + 3 ] = 255;

				uvw_x += uv_s_x;
                uvw_y += uv_s_y;
				uvw_x += uv_s_x;
                uvw_y += uv_s_y;
			}
			way1_x += dir3_x;
			way2_x += dir2_x;
			uv1_way_x += step3_u; 
			uv1_way_y += step3_v;
			uv2_way_x += step2_u; 
			uv2_way_y += step2_v;
		}
		
	}
}