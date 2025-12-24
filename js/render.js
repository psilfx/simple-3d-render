let bufferYcache; //Для того чтобы избавиться от операции умножения
let bufferXcache; //Для того чтобы избавиться от операции умножения
let textureYCache; //Для текстуры можно по одной стороне, они квадратные
let distInvCache; //Кэш расстояния, чтобы отказаться от деления в циклах
let distCosCache;
let zBufferY; //Кэш точки старта отрисовки по y
let zBufferHeight; //Кэш высоты от точки отрисовки
let zBuffer;
let fViewDistCache;

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
		distInvCache     = new Float32Array( 2000 );
		distCosCache     = new Float16Array( width );
		zBufferY         = new Uint16Array( width );
		zBufferHeight    = new Uint16Array( width );
		zBuffer          = new Float16Array( canvas.width * canvas.height * 4 );
		fViewDistCache   = [];
		
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
		for ( let d = 0; d < 2000; d++ ) {
			distInvCache[ d ] = 1 / d;
		}
		for( let w = 0; w < width; w++ ) {
			let angle = angleStep * w;
			distCosCache[ w ] = Math.cos( angle );
		}
		for( let w = 0; w <= width; w++ ) {
			let rayAngle = -fovHalf + fovStep * w;
			fViewDistCache[ w ] = new Float16Array( heightH );
			for( let y = 0; y <= height; y++ ) {
				fViewDistCache[ w ][ y ] = y / ( heightH  );
			}
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
		let projected = new Float16Array( 6 );
		let camCoords = SubtractVectorsF( point , position );
		let camNormal = camera.normalC;
		// Поворачиваем точку
		rotated[ 0 ] = camCoords[ 0 ] * camNormal[ 0 ] + camCoords[ 2 ] * camNormal[ 2 ]; //x
		rotated[ 1 ] = 0; //z
		rotated[ 2 ] = -camCoords[ 0 ] * camNormal[ 2 ] + camCoords[ 2 ] * camNormal[ 0 ]; //z
		let distance = Math.abs( rotated[ 2 ] );
		// Проецируем точку
		projected[ 0 ] = ( widthH - ( rotated[ 0 ] / distance ) * scale ) | 0;
		projected[ 1 ] = point[ 1 ];
		projected[ 5 ] = Math.max( near , distance ); //Для zBuffer
		projected[ 2 ] = Math.min( wallHCut , ( scale * ( 1 / projected[ 5 ] ) ) ) | 0; //Полный размер проекции
		projected[ 3 ] = ( projected[ 2 ] * wallHeight ) | 0; //Отмасштабированная стена
		projected[ 4 ] = distance; //Для zBuffer
		return projected;
	}
	
	GetWallDrawPoints( p1 , p2 ) {
		// const points = [ p1 , p2 ];
			  // points.sort( ( a , b ) => a[ 0 ] - b[ 0 ] );
				// [ p1 , p2 ] = points;
		
		// const cameraoffset1 = ( ( cameraPosition[ 1 ] / p1[ 5 ] ) * scale ) | 0;
		// const cameraoffset2 = ( ( cameraPosition[ 1 ] / p2[ 5 ] ) * scale ) | 0;
		const camY = cameraPosition[ 1 ] + camAnim.GetOffsetY();
		const camX = camAnim.GetOffsetX();
		let topLeft     = CreateVector3F( p1[ 0 ] + camX , heightH + 0 - ( p1[ 3 ] ) - ( ( p1[ 1 ] - camY ) * p1[ 2 ] ) | 0 , p1[ 4 ] );
		let topRight    = CreateVector3F( p2[ 0 ] + camX , heightH + 0 - ( p2[ 3 ] ) - ( ( p2[ 1 ] - camY ) * p2[ 2 ] ) | 0 , p2[ 4 ] );
		let bottomLeft  = CreateVector3F( topLeft[ 0 ]  , topLeft[ 1 ]  + p1[ 3 ] , p1[ 4 ] );
		let bottomRight = CreateVector3F( topRight[ 0 ] , topRight[ 1 ] + p2[ 3 ] , p2[ 4 ] );
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
	RenderWallPolygonOpt( p1 , p2 , p3 , p4 , textureData , shadow = 0 , light = [ 0 , 0 , 0 ] ) {
		if( ( p1[ 0 ] <= 0 && p2[ 0 ] <= 0 ) ||
			( p1[ 0 ] >= width && p2[ 0 ] >= width ) ||
			( p1[ 1 ] >= height && p2[ 1 ] >= height ) ||
			( p1[ 0 ] <= widthMin || p2[ 0 ] <= widthMin ) ||
			( p1[ 0 ] >= widthMax || p2[ 0 ] >= widthMax ) ) return;
		const rendStep  = 2;
		//Считаем разницу по x, чтобы отрисовать полоску по x
		const xStart   = ( p1[ 0 ] ) | 0;
		let offset_x   = 0;
		let xDiff      = ( p2[ 0 ] - p1[ 0 ] ) | 0;
		let xDir       = ( xDiff >= 0 ) ? 1 : -1; //Запоминаем направление
			xDiff      = Math.max( 1 , Math.abs( xDiff ) );
		//Кэш для избежания деления
		const xDistInv = distInvCache[ xDiff ];
		//збуффер расстояние
		const zDiff    = p2[ 4 ] - p1[ 4 ];
		const zStep    = ( zDiff * xDistInv ) * rendStep;
		//Считаем разницу по оси y верха и низа
		const topDist_y = p2[ 1 ] - p1[ 1 ];
		const botDist_y = p4[ 1 ] - p3[ 1 ];
		//Считаем шаг по оси y верха и низа
		const topStep_y = ( topDist_y * xDistInv ) * rendStep;
		const botStep_y = ( botDist_y * xDistInv ) * rendStep;
		const ut_step = ( ( p2[ 2 ] - p1[ 2 ] ) * xDistInv ) * rendStep;
		const ub_step = ( ( p4[ 2 ] - p3[ 2 ] ) * xDistInv ) * rendStep;
		const vt_step = ( ( p2[ 3 ] - p1[ 3 ] ) * xDistInv ) * rendStep;
		const vb_step = ( ( p4[ 3 ] - p3[ 3 ] ) * xDistInv ) * rendStep;
		//Пройденный путь, стартуем с начальной точки
		let wayTop_y = p1[ 1 ];
		let wayBot_y = p3[ 1 ];
		let ut_way = p1[ 2 ];
		let vt_way = p1[ 3 ];
		let ub_way = p3[ 2 ];
		let vb_way = p3[ 3 ];
		let z_way  = p1[ 4 ];
		//Стартуем цикл по оси x
		//console.log( xStart , zBufferY[ xStart ] , zBufferHeight[ xStart ] );
		for( let x = 0; x <= xDiff; x += rendStep ) {
			let pixel_x              = xStart + x * xDir;
			const offset_y           = ( wayTop_y < 0 ) ? Math.abs( wayTop_y ) : 0;
			const offset_yb          = ( wayBot_y >= height ) ? ( wayBot_y - height ) | 0 : 0;
			let yDiff                = ( wayBot_y - wayTop_y ) | 0;
			const yStart             = ( wayTop_y + offset_y ) | 0;
			const yHeight            = yDiff - offset_yb;
			const secIndex           = Math.min( width - 1 , Math.max( 0 , pixel_x + 1 * xDir ) );
			if( ( pixel_x >= width || pixel_x < 0 ) || 
				( yStart > zBufferY[ pixel_x ]  && yStart + yDiff < zBufferHeight[ pixel_x ] ) || 
				( yStart > zBufferY[ secIndex ] && yStart + yDiff < zBufferHeight[ secIndex ] )
			) {
				wayTop_y += topStep_y;
				wayBot_y += botStep_y;
				//uv_way_x += uv_step_x - 1 * ( uv_way_x >= 1 );
				ut_way += ut_step;
				vt_way += vt_step;
				ub_way += ub_step;
				vb_way += vb_step;
				z_way  += zStep;
				if( xDir == 1  && pixel_x >= width ) break;
				if( xDir == -1 && pixel_x < 0 ) break;
				continue;
			}
			let yDistInv              = distInvCache[ yDiff ];
			const u_step              = ( ub_way - ut_way ) * yDistInv;
			const v_step              = ( vb_way - vt_way ) * yDistInv;
			let   u                   = ut_way + u_step * offset_y;
			let   v                   = vt_way + v_step * offset_y;
			zBufferY[ pixel_x ]       = yStart;
			zBufferHeight[ pixel_x ]  = yStart + yHeight;
			zBufferY[ secIndex ]      = yStart;
			zBufferHeight[ secIndex ] = yStart + yHeight;
			//Красим полоску по y
			for( let y = offset_y; y <= yHeight + 1; y += rendStep ) {
				let pixel_y = ( wayTop_y + y ) | 0;
				let buffI   = bufferYcache[ pixel_y ] + bufferXcache[ pixel_x ];
				let buffIs  = bufferYcache[ pixel_y + 1 ] + bufferXcache[ pixel_x ];
				let buffI2  = bufferYcache[ pixel_y ] + bufferXcache[ secIndex ];
				let buffI2s = bufferYcache[ pixel_y + 1 ] + bufferXcache[ secIndex ];
				if( zBuffer[ buffI ] < z_way && zBuffer[ buffI2 ] < z_way ) {
					u += u_step;
					v += v_step;
					u += u_step;
					v += v_step;
					continue;
				}
				let px      = ( 63 * u ) | 0;
				let py      = ( 63 * v ) | 0;
				let pixelI  = textureYCache[ py ] + bufferXcache[ px ];
				if( zBuffer[ buffI ] >= z_way ) {
					this.frameBuffer[ buffI ]     = textureData[ pixelI ] - shadow + light[ 0 ];
					this.frameBuffer[ buffI + 1 ] = textureData[ pixelI + 1 ] - shadow + light[ 1 ];
					this.frameBuffer[ buffI + 2 ] = textureData[ pixelI + 2 ] - shadow + light[ 2 ];
					this.frameBuffer[ buffI + 3 ] = 255;
					zBuffer[ buffI ]  = z_way;
					this.frameBuffer[ buffIs ]     = textureData[ pixelI ] - shadow + light[ 0 ];
					this.frameBuffer[ buffIs + 1 ] = textureData[ pixelI + 1 ] - shadow + light[ 1 ];
					this.frameBuffer[ buffIs + 2 ] = textureData[ pixelI + 2 ] - shadow + light[ 2 ];
					this.frameBuffer[ buffIs + 3 ] = 255;
					zBuffer[ buffIs ]  = z_way;
				}
				if( zBuffer[ buffI2 ] >= z_way ) {
					this.frameBuffer[ buffI2 ]     = textureData[ pixelI ] - shadow + light[ 0 ];
					this.frameBuffer[ buffI2 + 1 ] = textureData[ pixelI + 1 ] - shadow + light[ 1 ];
					this.frameBuffer[ buffI2 + 2 ] = textureData[ pixelI + 2 ] - shadow + light[ 2 ];
					this.frameBuffer[ buffI2 + 3 ] = 255;
					zBuffer[ buffI2 ] = z_way;
					this.frameBuffer[ buffI2s ]     = textureData[ pixelI ] - shadow + light[ 0 ];
					this.frameBuffer[ buffI2s + 1 ] = textureData[ pixelI + 1 ] - shadow + light[ 1 ];
					this.frameBuffer[ buffI2s + 2 ] = textureData[ pixelI + 2 ] - shadow + light[ 2 ];
					this.frameBuffer[ buffI2s + 3 ] = 255;
					zBuffer[ buffI2s ]  = z_way;
				}
				u += u_step;
				v += v_step;
				u += u_step;
				v += v_step;
			}
			wayTop_y += topStep_y;
			wayBot_y += botStep_y;
			//uv_way_x += uv_step_x - 1 * ( uv_way_x >= 1 );
			ut_way += ut_step;
			vt_way += vt_step;
			ub_way += ub_step;
			vb_way += vb_step;
			z_way  += zStep;
		}
	}
	Update() {
		this.visualBuffer_walls = [];
	}

	ReadBuffer() {
		this.imageData   = context.getImageData( 0 , 0 , canvas.width , canvas.height );
		this.frameBuffer = this.imageData.data;
		zBufferY.fill( 0 );
		zBufferHeight.fill( 0 );
		zBuffer.fill( visDist );
	}
	DrawBuffer() {
		context.putImageData( this.imageData , 0 , 0 );
	}
	// RenderTexturedFloorDoomOpt( p1 , p2 , p3 , p4 , textureData , shadow = 0 ) { //v1 , v2 - линия текстурирования от, v3 , v4 - линия текстурирования до
		// if( ( p1[ 0 ] <= 0 && p2[ 0 ] <= 0 && p3[ 0 ] <= 0 && p4[ 0 ] <= 0 ) ||
			// ( p1[ 0 ] >= width && p2[ 0 ] >= width && p3[ 0 ] >= width && p4[ 0 ] >= width ) ||
			// ( p1[ 1 ] >= height && p2[ 1 ] >= height && p3[ 1 ] >= height && p4[ 1 ] >= height ) ||
			// ( p1[ 0 ] <= widthMin || p2[ 0 ] <= widthMin || p3[ 0 ] <= widthMin || p4[ 0 ] <= widthMin ) ||
			// ( p1[ 0 ] >= widthMax || p2[ 0 ] >= widthMax || p3[ 0 ] >= widthMax || p4[ 0 ] >= widthMax )
			// ) return;
		// //Сортируем по y , потом по x
		// const points = [ p1 , p2 , p3 , p4 ];
			  // points.sort( ( a , b ) => a[ 1 ] - b[ 1 ] );
		// [ p1 , p2 , p3 , p4 ] = points;
		
		// const topPoints = [ p1 , p2 ];
			  // topPoints.sort( ( a , b ) => a[ 0 ] - b[ 0 ] );
		// [ p1 , p2 ] = topPoints;
		
		// const botPoints = [ p3 , p4 ];
			  // botPoints.sort( ( a , b ) => a[ 0 ] - b[ 0 ] );
		// [ p3 , p4 ] = botPoints;
		// const rendStep = 2;
		// //ScanLine алгоритм
		// //Базовое направление
		// const baseDirection1_x = p2[ 0 ] - p1[ 0 ];
		// const baseDirection1_y = p2[ 1 ] - p1[ 1 ];
		// const baseDirection2_x = p4[ 0 ] - p3[ 0 ];
		// const baseDirection2_y = p4[ 1 ] - p3[ 1 ];
		// const uvDirection1_x   = p2[ 2 ] - p1[ 2 ];
		// const uvDirection1_y   = p2[ 3 ] - p1[ 3 ];
		// const uvDirection2_x   = p4[ 2 ] - p3[ 2 ];
		// const uvDirection2_y   = p4[ 3 ] - p3[ 3 ];
		// //Считаем расстояние цикла
		// // const shadDist1 = shadows[ 0 ] * 0.1;
		// // const shadDist2 = shadows[ 2 ] * 0.1;
		// const baseDist1 = Math.max( Math.abs( baseDirection1_x ) , Math.abs( baseDirection1_y ) );
		// const baseDist2 = Math.max( Math.abs( baseDirection2_x ) , Math.abs( baseDirection2_y ) );
		// const baseDist  = Math.min( Math.max( baseDist1 , baseDist2 ) , width );
		
		// //Оптимизация t, чтобы избежать деления в цикле
		// const baseDistInv = distInvCache[ baseDist | 0 ];
		
		// //Считаем шаг цикла
		// const baseStep1_x  = ( baseDirection1_x * baseDistInv ) * rendStep;
		// const baseStep1_y  = ( baseDirection1_y * baseDistInv ) * rendStep;
		// const baseStep2_x  = ( baseDirection2_x * baseDistInv ) * rendStep;
		// const baseStep2_y  = ( baseDirection2_y * baseDistInv ) * rendStep;
		// const uvStep1_x    = ( uvDirection1_x * baseDistInv ) * rendStep;
		// const uvStep1_y    = ( uvDirection1_y * baseDistInv ) * rendStep;
		// const uvStep2_x    = ( uvDirection2_x * baseDistInv ) * rendStep;
		// const uvStep2_y    = ( uvDirection2_y * baseDistInv ) * rendStep;
		// // const shadStep1    = ( shadDist1 * baseDistInv ) * rendStep;
		// const z1_step      = ( p2[ 4 ] - p1[ 4 ] ) * baseDistInv * rendStep;
		// const z2_step      = ( p4[ 4 ] - p3[ 4 ] ) * baseDistInv * rendStep;
		// //Инициализируем переменные для подсчёта прохода, дабы отказаться от умножения, даёт погрешность, но она компенсируется костылём fill;
		// let baseWay1_x = 0;
		// let baseWay1_y = 0;
		// let baseWay2_x = 0;
		// let baseWay2_y = 0;
		// let uvWay1_x   = 0;
		// let uvWay1_y   = 0;
		// let uvWay2_x   = 0;
		// let uvWay2_y   = 0;
		// // let shadWay1   = 0;
		// let z1_way     = p1[ 4 ];
		// let z2_way     = p3[ 4 ];
		// const start1_x = p1[ 0 ];
		// const start1_y = p1[ 1 ];
		// const start2_x = p3[ 0 ];
		// const start2_y = p3[ 1 ];
		// const uvSt1_x  = p1[ 2 ];
		// const uvSt1_y  = p1[ 3 ];
		// const uvSt2_x  = p3[ 2 ];
		// const uvSt2_y  = p3[ 3 ];
		// for( let d = 0; d < baseDist; d +=rendStep ) {
			// //Считаем старт лини от основания
			// const start_x = start1_x + baseWay1_x;
			// const start_y = start1_y + baseWay1_y;
			// const end_x = start2_x + baseWay2_x;
			// const end_y = start2_y + baseWay2_y;
			// if( start_x >= width && end_x >= width ) break;
			// //UV
			// const uv1_x = uvSt1_x + uvWay1_x;
			// const uv1_y = uvSt1_y + uvWay1_y;
			// const uv2_x = uvSt2_x + uvWay2_x;
			// const uv2_y = uvSt2_y + uvWay2_y;
			
			// const uv_dir_x = uv2_x - uv1_x;
			// const uv_dir_y = uv2_y - uv1_y;
			// //Считаем направление закраски линии
			// const dir_x = end_x - start_x;
			// const dir_y = end_y - start_y;
			// //Считаем длинну линии
			// const dist  = Math.min( Math.max( Math.abs( dir_x ) , Math.abs( dir_y ) ) , width );
			// let distInv = distInvCache[ Math.round( dist ) ];
			// //Считаем шаг
			// // const shadStep2 = ( shadDist2 * distInv ) * rendStep;
			// const step_x    = ( dir_x * distInv ) * rendStep;
			// const step_y    = ( dir_y * distInv ) * rendStep;
			// const step_uv_x = ( uv_dir_x * distInv ) * rendStep;
			// const step_uv_y = ( uv_dir_y * distInv ) * rendStep;
			// const z_step    = ( z2_way - z1_way ) * distInv * rendStep;
			// //Подсчёт прохода
			// let way_x = 0;
			// let way_y = 0;
			// let uvw_x = uv1_x;
			// let uvw_y = uv1_y;
			// let z_way = z1_way;
			// // let shadWay2 = 0;
			// //Закрашиваем полоску
			// for( let p = 0; p < dist; p += rendStep ) {
				// // const textX   = uv1_x + uv_dir_x * ( p * distInv );
				// // const textY   = uv1_y + uv_dir_y * ( p * distInv );
				// const px      = ( 63 * uvw_x ) | 0; //Быстрое округление
				// const py      = ( 63 * uvw_y ) | 0;
				// //if( py == 0 ) console.log( uv_dir_x , uv_dir_y );
				// const pixel_x = ( start_x + way_x + 0.5 ) | 0;
				// const pixel_y = ( start_y + way_y + 0.5 ) | 0;
				// if( pixel_y > canvas.height ) break;
				// //Индексы буфера кадра и текстуры
				
					// let buffI  = bufferYcache[ pixel_y ] + bufferXcache[ pixel_x ];
					// let pixelI = textureYCache[ py ] + bufferXcache[ px ];
					
					// if( zBuffer[ buffI ] < z_way ) {
						// way_x += step_x;
						// way_y += step_y;
						// uvw_x += step_uv_x;
						// uvw_y += step_uv_y;
						// // shadWay2 += shadStep2;
						// z_way  += z_step;
						// continue;
					// }
					// zBuffer[ buffI ] = z_way;
					// //Красим 2 пикселя
					// // let shadow  = ( shadWay1 + shadWay2 );
					// //Хардкод для оптимизации, вложенные циклы работают медленнее
					// if( this.frameBuffer[ buffI - 4 ] == 0 ) {
						// this.frameBuffer[ buffI - 4 ] = textureData[ pixelI ] - shadow;
						// this.frameBuffer[ buffI - 3 ] = textureData[ pixelI + 1 ] - shadow;
						// this.frameBuffer[ buffI - 2 ] = textureData[ pixelI + 2 ] - shadow;
						// this.frameBuffer[ buffI - 1 ] = 255;
					// }
					// zBuffer[ buffI - 4 ] = z_way;
					// this.frameBuffer[ buffI ]     = textureData[ pixelI ] - shadow;
					// this.frameBuffer[ buffI + 1 ] = textureData[ pixelI + 1 ] - shadow;
					// this.frameBuffer[ buffI + 2 ] = textureData[ pixelI + 2 ] - shadow;
					// this.frameBuffer[ buffI + 3 ] = 255;
					
					// //if( this.frameBuffer[ buffI + 4 ] == 0 ) {
						// this.frameBuffer[ buffI + 4 ] = textureData[ pixelI + 4 ] - shadow;
						// this.frameBuffer[ buffI + 5 ] = textureData[ pixelI + 5 ] - shadow;
						// this.frameBuffer[ buffI + 6 ] = textureData[ pixelI + 6 ] - shadow;
						// this.frameBuffer[ buffI + 7 ] = 255;
					// //}
					// zBuffer[ buffI + 4 ] = z_way;
					// buffI  = bufferYcache[ pixel_y - 1 ] + bufferXcache[ pixel_x ];
					// pixelI = textureYCache[ Math.max( py - 1 , 0 ) ] + bufferXcache[ px ];
					
					// if( this.frameBuffer[ buffI - 4 ] == 0 ) {
						// this.frameBuffer[ buffI - 4 ] = textureData[ pixelI ] - shadow;
						// this.frameBuffer[ buffI - 3 ] = textureData[ pixelI + 1 ] - shadow;
						// this.frameBuffer[ buffI - 2 ] = textureData[ pixelI + 2 ] - shadow;
						// this.frameBuffer[ buffI - 1 ] = 255;
					// }
					// zBuffer[ buffI - 4 ] = z_way;
					// if( this.frameBuffer[ buffI ] == 0 ) {
						// this.frameBuffer[ buffI ]     = textureData[ pixelI ] - shadow;
						// this.frameBuffer[ buffI + 1 ] = textureData[ pixelI + 1 ] - shadow;
						// this.frameBuffer[ buffI + 2 ] = textureData[ pixelI + 2 ] - shadow;
						// this.frameBuffer[ buffI + 3 ] = 255;
					// }
					// zBuffer[ buffI ] = z_way;
					// if( this.frameBuffer[ buffI + 4 ] == 0 ) {
						// this.frameBuffer[ buffI + 4 ] = textureData[ pixelI + 4 ] - shadow;
						// this.frameBuffer[ buffI + 5 ] = textureData[ pixelI + 5 ] - shadow;
						// this.frameBuffer[ buffI + 6 ] = textureData[ pixelI + 6 ] - shadow;
						// this.frameBuffer[ buffI + 7 ] = 255;
					// }
					// zBuffer[ buffI + 4 ] = z_way;
					// buffI  = bufferYcache[ pixel_y + 1 ] + bufferXcache[ pixel_x ];
					// pixelI = textureYCache[ Math.min( py + 1 , textSize - 1 ) ] + bufferXcache[ px ];
					
					// if( this.frameBuffer[ buffI - 4 ] == 0 ) {
						// this.frameBuffer[ buffI - 4 ] = textureData[ pixelI ] - shadow;
						// this.frameBuffer[ buffI - 3 ] = textureData[ pixelI + 1 ] - shadow;
						// this.frameBuffer[ buffI - 2 ] = textureData[ pixelI + 2 ] - shadow;
						// this.frameBuffer[ buffI - 1 ] = 255;
					// }
					// zBuffer[ buffI - 4 ] = z_way;
					// //if( this.frameBuffer[ buffI ] == 0 ) {
						// this.frameBuffer[ buffI ]     = textureData[ pixelI ] - shadow;
						// this.frameBuffer[ buffI + 1 ] = textureData[ pixelI + 1 ] - shadow;
						// this.frameBuffer[ buffI + 2 ] = textureData[ pixelI + 2 ] - shadow;
						// this.frameBuffer[ buffI + 3 ] = 255;
					// //}
					// zBuffer[ buffI ] = z_way;
					// //if( this.frameBuffer[ buffI + 4 ] == 0 ) {
						// this.frameBuffer[ buffI + 4 ] = textureData[ pixelI + 4 ] - shadow;
						// this.frameBuffer[ buffI + 5 ] = textureData[ pixelI + 5 ] - shadow;
						// this.frameBuffer[ buffI + 6 ] = textureData[ pixelI + 6 ] - shadow;
						// this.frameBuffer[ buffI + 7 ] = 255;
					// //}
						// zBuffer[ buffI + 4 ] = z_way;
				// //Шаг
				// way_x += step_x;
				// way_y += step_y;
				// uvw_x += step_uv_x;
				// uvw_y += step_uv_y;
				// // shadWay2 += shadStep2;
				// z_way  += z_step;
			// }
			
			// //Шаг
			// baseWay1_x += baseStep1_x ;
			// baseWay1_y += baseStep1_y ;
			// baseWay2_x += baseStep2_x ;
			// baseWay2_y += baseStep2_y ;
			// uvWay1_x   += uvStep1_x;
			// uvWay1_y   += uvStep1_y;
			// uvWay2_x   += uvStep2_x;
			// uvWay2_y   += uvStep2_y;
			// // shadWay1   += shadStep1;
			// z1_way     += z1_step;
			// z2_way     += z2_step;
		// }
	// }
	//Закрашивает треугольник слева на право, p2 и p3 должны совпадать по x
	DrawScanlineX( p1 , p2 , p3 , textureData , shadow ) {
		const start_x     = p1[ 0 ];
		const diff1_x     = Math.abs( p2[ 0 ] - p1[ 0 ] ); //Точка дальняя
		const dir_x       = ( p2[ 0 ] >= p1[ 0 ] ) ? 1 : -1;
		const diff1_y     = p2[ 1 ] - p1[ 1 ];
		const diff2_x     = p3[ 0 ] - p1[ 0 ];
		const diff2_y     = p3[ 1 ] - p1[ 1 ];
		const diff1_u     = p2[ 2 ] - p1[ 2 ];
		const diff1_v     = p2[ 3 ] - p1[ 3 ];
		const diff2_u     = p3[ 2 ] - p1[ 2 ];
		const diff2_v     = p3[ 3 ] - p1[ 3 ];
		const diff_t_z    = p2[ 4 ] - p1[ 4 ];
		const diff_b_z    = p3[ 4 ] - p1[ 4 ];
		const scan_x_dist = distInvCache[ diff1_x | 0 ];
		const step1_y     = diff1_y * scan_x_dist;
		const step2_y     = diff2_y * scan_x_dist;
		const step1_u     = diff1_u * scan_x_dist;
		const step1_v     = diff1_v * scan_x_dist;
		const step2_u     = diff2_u * scan_x_dist;
		const step2_v     = diff2_v * scan_x_dist;
		const step_z_t    = diff_t_z * scan_x_dist;
		const step_z_b    = diff_b_z * scan_x_dist;
		let   way1_y      = p1[ 1 ];
		let   way2_y      = p1[ 1 ];
		let uv_w_tx       = p1[ 2 ];
		let uv_w_ty       = p1[ 3 ];
		let uv_w_bx       = p1[ 2 ];
		let uv_w_by       = p1[ 3 ];
		let z_w_t         = p1[ 4 ];
		let z_w_b         = p1[ 4 ];
		for( let xs = 0; xs <= diff1_x; xs++ ) {
			const x       = start_x + xs * dir_x;
			const start_y = way1_y | 0;
			const end_y   = way2_y | 0;
			const diff_y  = Math.abs( end_y - start_y );
			const dir_y   = ( end_y >= start_y ) ? 1 : -1;
			const dist_y  = distInvCache[ diff_y | 0 ];
			const diff_u  = ( uv_w_bx - uv_w_tx );
			const diff_v  = ( uv_w_by - uv_w_ty );
			const step_u  = diff_u * dist_y;
			const step_v  = diff_v * dist_y;
			const diff_z  = ( z_w_b - z_w_t );
			const step_z  = diff_z * dist_y;
			let   way_u   = uv_w_tx;
			let   way_v   = uv_w_ty;
			let   way_z   = z_w_t;
			for( let ys = 0; ys <= diff_y; ys++ ) {
				const y = start_y + ys * dir_y;
				let buffI = bufferYcache[ y ] + bufferXcache[ x ];
				if( zBuffer[ buffI ] < way_z || !fViewDistCache[ x ] ) {
					way_u += step_u;
					way_v += step_v;
					way_z += step_z;
					continue;
				}
				const px = ( 63 * way_u ) | 0; //Быстрое округление
				const py = ( 63 * way_v ) | 0;
				let pixelI = textureYCache[ py ] + bufferXcache[ px ];
				this.frameBuffer[ buffI ]     = textureData[ pixelI ] - shadow;
				this.frameBuffer[ buffI + 1 ] = textureData[ pixelI + 1 ] - shadow;
				this.frameBuffer[ buffI + 2 ] = textureData[ pixelI + 2 ] - shadow;
				this.frameBuffer[ buffI + 3 ] = 255;
				zBuffer[ buffI ] = way_z;
				way_u += step_u;
				way_v += step_v;
				way_z += step_z;
			}
			way1_y  += step1_y;
			way2_y  += step2_y;
			uv_w_tx += step1_u;
			uv_w_ty += step1_v;
			uv_w_bx += step2_u;
			uv_w_by += step2_v;
			z_w_t   += step_z_t;
			z_w_b   += step_z_b;
		}
	}
	RenderTexturedFloorDoomOpt( p1 , p2 , p3 , p4 , textureData , shadow = 0 ) { //v1 , v2 - линия текстурирования от, v3 , v4 - линия текстурирования до
		if( ( p1[ 0 ] <= 0 && p2[ 0 ] <= 0 && p3[ 0 ] <= 0 && p4[ 0 ] <= 0 ) ||
			( p1[ 0 ] >= width && p2[ 0 ] >= width && p3[ 0 ] >= width && p4[ 0 ] >= width ) ||
			( p1[ 1 ] >= height && p2[ 1 ] >= height && p3[ 1 ] >= height && p4[ 1 ] >= height ) ||
			( p1[ 0 ] <= widthMin || p2[ 0 ] <= widthMin || p3[ 0 ] <= widthMin || p4[ 0 ] <= widthMin ) ||
			( p1[ 0 ] >= widthMax || p2[ 0 ] >= widthMax || p3[ 0 ] >= widthMax || p4[ 0 ] >= widthMax )
			) return;
		// const min_x = Math.min( p1[ 0 ] , p2[ 0 ] , p3[ 0 ] , p4[ 0 ] );
		// const min_y = Math.min( p1[ 1 ] , p2[ 1 ] , p3[ 1 ] , p4[ 1 ] );
		// const max_x = Math.max( p1[ 0 ] , p2[ 0 ] , p3[ 0 ] , p4[ 0 ] );
		// const max_y = Math.max( p1[ 1 ] , p2[ 1 ] , p3[ 1 ] , p4[ 1 ] );
		// const cen_x = min_x + ( max_x - min_x ) * 0.5;
		// const cen_y = min_y + ( max_y - min_y ) * 0.5;
		// //Сортируем по y , потом по x
		const points = [ p1 , p2 , p3 , p4 ];
			  points.sort( ( a , b ) => a[ 0 ] - b[ 0 ] ); //Сортируем по x
			  [ p1 , p2 , p3 , p4 ] = points;
		const left  = [ p1 , p2 ];
			  left.sort( ( a , b ) => a[ 1 ] - b[ 1 ] );
		const right = [ p3 , p4 ];
			  right.sort( ( a , b ) => a[ 1 ] - b[ 1 ] ); 
		let [ topL , topR , botL , botR ] = [ left[ 0 ] , right[ 0 ] , left[ 1 ] , right[ 1 ] ];
		const rendStep = 2;
		//Первый треугольник
		let bottom_l = ( ( p1[ 0 ] == botL[ 0 ] && p1[ 1 ] == botL[ 1 ] ) ) ? true : false; //Если стартовая точка снизу
		let bottom_r = ( ( p4[ 0 ] == botR[ 0 ] && p4[ 1 ] == botR[ 1 ] ) ) ? true : false; //Если стартовая точка снизу
		//Костыль под парралель
		if( topL[ 1 ] == botL[ 1 ] && topL[ 0 ] < botL[ 0 ] ) {
			[ topL , botL ] = [ botL , topL ];
			bottom_l = true;
		}
		let diff1_x = 0 , diff1_y = 0 , diff2_x = 0 , diff3_x = 0 , diff3_y = 0 , diff4_x = 0 , t2p , t3p , uv1_d_x = 0 , uv1_d_y = 0 , uv2_d_x = 0 , uv2_d_y = 0 , diff1_z = 0 , diff2_z = 0; //t2p стартовая точка для расчёта второго треугольника
		if( bottom_l ) { //Стартовая точка снизу
			diff1_x = botR[ 0 ] - botL[ 0 ]; //Точка дальняя
			diff1_y = botR[ 1 ] - botL[ 1 ];
			diff2_x = topL[ 0 ] - botL[ 0 ]; 
			uv1_d_x = botR[ 2 ] - botL[ 2 ];
			uv1_d_y = botR[ 3 ] - botL[ 3 ];
			diff1_z = botR[ 4 ] - botL[ 4 ];
			t2p     = topL;
		} else { //Стартовая точка вверху
			diff1_x = topR[ 0 ] - topL[ 0 ]; //Точка дальняя
			diff1_y = topR[ 1 ] - topL[ 1 ];
			diff2_x = botL[ 0 ] - topL[ 0 ]; 
			uv1_d_x = topR[ 2 ] - topL[ 2 ];
			uv1_d_y = topR[ 3 ] - topL[ 3 ];
			diff1_z = topR[ 4 ] - topL[ 4 ];
			t2p     = botL;
		}
		if( bottom_r ) { //Стартовая точка снизу
			diff3_x = botL[ 0 ] - botR[ 0 ];
			diff3_y = botL[ 1 ] - botR[ 1 ];
			diff4_x = topR[ 0 ] - botR[ 0 ];
			uv2_d_x = botL[ 2 ] - botR[ 2 ];
			uv2_d_y = botL[ 3 ] - botR[ 3 ];
			diff2_z = botL[ 4 ] - botR[ 4 ];
			t3p     = topR;
		} else { //Стартовая точка вверху
			diff3_x = topL[ 0 ] - topR[ 0 ];
			diff3_y = topL[ 1 ] - topR[ 1 ];
			diff4_x = botR[ 0 ] - topR[ 0 ];
			uv2_d_x = topL[ 2 ] - topR[ 2 ];
			uv2_d_y = topL[ 3 ] - topR[ 3 ];
			diff2_z = topL[ 4 ] - topR[ 4 ];
			t3p     = botR;
		}
		const scan_x_dist_l = distInvCache[ diff1_x | 0 ];
		const scan_x_dist_r = distInvCache[ Math.abs( diff3_x ) | 0 ];
		const step1_x     = diff1_x * scan_x_dist_l;
		const step1_y     = diff1_y * scan_x_dist_l;
		const step1_z     = diff1_z * scan_x_dist_l;
		const step2_z     = diff2_z * scan_x_dist_r;
		const step3_x     = diff3_x * scan_x_dist_r;
		const step3_y     = diff3_y * scan_x_dist_r;
		const uv1_s_x     = uv1_d_x * scan_x_dist_l;
		const uv1_s_y     = uv1_d_y * scan_x_dist_l;
		const uv2_s_x     = uv2_d_x * scan_x_dist_r;
		const uv2_s_y     = uv2_d_y * scan_x_dist_r;

		const p2e         = CreatePointUVZ( p1[ 0 ] + step1_x *  diff2_x , p1[ 1 ] + step1_y * diff2_x , p1[ 2 ] + uv1_s_x * diff2_x , p1[ 3 ] + uv1_s_y * diff2_x , p1[ 4 ] + step1_z * diff2_x ); //Проекция точки по треугольнику
		const p3e         = CreatePointUVZ( p4[ 0 ] + step3_x * Math.abs( diff4_x ) , p4[ 1 ] + step3_y * Math.abs( diff4_x ) , p4[ 2 ] + uv2_s_x * Math.abs( diff4_x ) , p4[ 3 ] + uv2_s_y * Math.abs( diff4_x ) , p4[ 4 ] + step2_z * Math.abs( diff4_x ) ); //Проекция точки по треугольнику
		
		this.DrawScanlineX( p1 , t2p , p2e , textureData , shadow );
		this.DrawScanlineX( p4 , t3p , p3e , textureData , shadow );

		const scanLeft  = [ t2p , p2e ];
			  scanLeft.sort( ( a , b ) => a[ 1 ] - b[ 1 ] );	
		const scanRight = [ t3p , p3e ];
			  scanRight.sort( ( a , b ) => a[ 1 ] - b[ 1 ] );
		[ p1 , p2 , p3 , p4 ] = [ scanLeft[ 0 ] , scanLeft[ 1 ] , scanRight[ 0 ] , scanRight[ 1 ] ];
		

		const diff_x      = p3[ 0 ] - p1[ 0 ];
		const diff_t      = p3[ 1 ] - p1[ 1 ];
		const diff_b      = p4[ 1 ] - p2[ 1 ];

		const diff_uv_t_x = p3[ 2 ] - p1[ 2 ];
		const diff_uv_t_y = p3[ 3 ] - p1[ 3 ];
		const diff_uv_b_x = p4[ 2 ] - p2[ 2 ];
		const diff_uv_b_y = p4[ 3 ] - p2[ 3 ];
		const diff_t_z    = p3[ 4 ] - p1[ 4 ];
		const diff_b_z    = p4[ 4 ] - p2[ 4 ];
		const scan_x_dist = distInvCache[ diff_x | 0 ];
		
		const step_y_t    = diff_t * scan_x_dist;
		const step_y_b    = diff_b * scan_x_dist;
		const step_z_t    = diff_t_z * scan_x_dist;
		const step_z_b    = diff_b_z * scan_x_dist;
		const step_uv_t_x = diff_uv_t_x * scan_x_dist ;
		const step_uv_t_y = diff_uv_t_y * scan_x_dist;
		const step_uv_b_x = diff_uv_b_x * scan_x_dist;
		const step_uv_b_y = diff_uv_b_y * scan_x_dist;
		
		let way1_y    = p1[ 1 ];
		let way2_y    = p2[ 1 ];
		let uv_w_tx   = p1[ 2 ];
		let uv_w_ty   = p1[ 3 ];
		let uv_w_bx   = p2[ 2 ];
		let uv_w_by   = p2[ 3 ];
		let z_w_t     = p1[ 4 ];
		let z_w_b     = p2[ 4 ];
		const start_x = p1[ 0 ];
		for( let xs = 0; xs <= diff_x; xs++ ) {
			const x       = start_x + xs;
			const start_y = way1_y | 0;
			const end_y   = way2_y | 0;
			const diff_y  = Math.abs( end_y - start_y );
			const dist_y  = distInvCache[ diff_y | 0 ];
			const dir_y   = ( end_y >= start_y ) ? 1 : -1;
			const diff_u  = ( uv_w_bx - uv_w_tx );
			const diff_v  = ( uv_w_by - uv_w_ty );
			const diff_z  = ( z_w_b - z_w_t );
			const step_u  = ( diff_u * dist_y ) ;
			const step_v  = ( diff_v * dist_y ) ;
			const step_z  = diff_z * dist_y;
			const start_z = z_w_t;
			let   way_u   = uv_w_tx;
			let   way_v   = uv_w_ty;
			let   way_z   = 0;
			for( let ys = 0; ys <= diff_y; ys++ ) {
				const z   = start_z + way_z;
				const y   = start_y - diff_y * ( dir_y < 0 ) + ys * dir_y;
				let buffI = bufferYcache[ y ] + bufferXcache[ x ];
				if( zBuffer[ buffI ] < z ) {
					way_u += step_u;
					way_v += step_v;
					way_z += step_z;
					continue;
				}
				
				const rel_x = ( x - widthH ) / widthH;
    
   // # Угол луча для этого столбца
				//ray_angle = player_angle + rel_x * (fov_rad / 2)
				const cr_a = camera.angle - fovHalf + x * fovStep; // rel_x * fovHalf;
				const cos  = Math.cos( cr_a );
				const sin  = Math.sin( cr_a );

				
				const cr_d    = ( camera.position[ 1 ] / z * scale ) | 0;
				const world_x = camera.position[ 0 ] + cos * cr_d;
				const world_y = camera.position[ 2 ] + sin * cr_d;
				
				const px = Math.abs( world_x % 63 ) | 0;
				const py = Math.abs( world_y % 63 ) | 0;
				
				
				
				// const px = ( 63 * ( way_u * cr_x ) ) | 0; //Быстрое округление
				// const py = ( 63 * ( way_v * cr_y ) ) | 0;
				
				let pixelI = textureYCache[ py ] + bufferXcache[ px ];
				this.frameBuffer[ buffI ]     = textureData[ pixelI ] - shadow;
				this.frameBuffer[ buffI + 1 ] = textureData[ pixelI + 1 ] - shadow;
				this.frameBuffer[ buffI + 2 ] = textureData[ pixelI + 2 ] - shadow;
				this.frameBuffer[ buffI + 3 ] = 255;
				zBuffer[ buffI ] = z;
				way_u += step_u;
				way_v += step_v;
				way_z += step_z;
			}
			way1_y += step_y_t;
			way2_y += step_y_b;
			uv_w_tx += step_uv_t_x;
			uv_w_ty += step_uv_t_y;
			uv_w_bx += step_uv_b_x;
			uv_w_by += step_uv_b_y;
			z_w_t   += step_z_t;
			z_w_b   += step_z_b;
		}
	}
	RenderTriangleScanline( p1 , p2 , p3 , textureData , shadow = 0 , light = [ 0 , 0 , 0 ] ) {
		if( ( p1[ 0 ] <= 0 && p2[ 0 ] <= 0 && p3[ 0 ] <= 0 ) ||
			( p1[ 0 ] >= width && p2[ 0 ] >= width && p3[ 0 ] >= width ) ||
			( p1[ 1 ] >= height && p2[ 1 ] >= height && p3[ 1 ] >= height ) ||
			( p1[ 0 ] <= widthMin || p2[ 0 ] <= widthMin || p3[ 0 ] <= widthMin ) ||
			( p1[ 0 ] >= widthMax || p2[ 0 ] >= widthMax || p3[ 0 ] >= widthMax ) 
			// ( p1[ 1 ] >= zBufferY[ p1[ 0 ] ] && p1[ 1 ] <= zBufferHeight[ p1[ 0 ] ] &&
			  // p2[ 1 ] >= zBufferY[ p2[ 0 ] ] && p2[ 1 ] <= zBufferHeight[ p2[ 0 ] ] &&
			  // p3[ 1 ] >= zBufferY[ p3[ 0 ] ] && p3[ 1 ] <= zBufferHeight[ p3[ 0 ] ]	)
			) return;
		const points = [ p1 , p2 , p3 ];
			  points.sort( ( a , b ) => a[ 1 ] - b[ 1 ] );
		
		const [ top , middle , bottom ] = points;
		
		//if( top[ 1 ] < heightH ) return;
		
		// Вычисляем обратные наклоны (dx/dy)
		const diff1_y = ( middle[ 1 ] - top[ 1 ] )    | 0;
		const diff2_y = ( bottom[ 1 ] - top[ 1 ] )    | 0;
		const diff3_y = ( bottom[ 1 ] - middle[ 1 ] ) | 0;
		
		const dis1_inv = distInvCache[ diff1_y ];
		const dis2_inv = distInvCache[ diff2_y ];
		const dis3_inv = distInvCache[ diff3_y ];

		const dir1_x  = ( middle[ 0 ] - top[ 0 ] )    * dis1_inv;
		const dir2_x  = ( bottom[ 0 ] - top[ 0 ] )    * dis2_inv;
		const dir3_x  = ( bottom[ 0 ] - middle[ 0 ] ) * dis3_inv;
		let way1_x    = top[ 0 ];
		let way2_x    = top[ 0 ];
		
		const uw_diff1_x = middle[ 2 ] - top[ 2 ];
		const uw_diff2_x = bottom[ 2 ] - top[ 2 ];
		const uw_diff3_x = bottom[ 2 ] - middle[ 2 ];
		
		const uw_diff1_y = middle[ 3 ] - top[ 3 ];
		const uw_diff2_y = bottom[ 3 ] - top[ 3 ];
		const uw_diff3_y = bottom[ 3 ] - middle[ 3 ];
		
		const step1_u = uw_diff1_x * dis1_inv;
		const step2_u = uw_diff2_x * dis2_inv;
		const step3_u = uw_diff3_x * dis3_inv;
    
		const step1_v = uw_diff1_y * dis1_inv;
		const step2_v = uw_diff2_y * dis2_inv;
		const step3_v = uw_diff3_y * dis3_inv;
		
		const z1_step  = ( middle[ 4 ] - top[ 4 ] )    * dis1_inv ;
		const z2_step  = ( bottom[ 4 ] - top[ 4 ] )    * dis2_inv ;
		const z3_step  = ( bottom[ 4 ] - middle[ 4 ] ) * dis3_inv ;
		
		let uv1_start_x   = top[ 2 ];
		let uv1_start_y   = top[ 3 ];
		const uv2_start_x = top[ 2 ];
		const uv2_start_y = top[ 3 ];
		
		let uv1_way_x = 0;
		let uv1_way_y = 0;
		let uv2_way_x = 0;
		let uv2_way_y = 0;
		
		let yCount  = 0;
		
		let z1_way  = top[ 4 ];
		let z2_way  = top[ 4 ];
		
		

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
			const z_step   = ( z2_way - z1_way ) * t;
			
			const x_dir  = ( x_diff >= 0 ) ? 1 : -1;
			
            let uvw_x  = uv1_x;
            let uvw_y  = uv1_y;
			let z_way  = 0;

			for ( let xd = 0; xd <= x_dist; xd += 2 ) {
				const x = ( way1_x + xd * x_dir ) | 0;
				let buffI  = bufferYcache[ y ] + bufferXcache[ x ];
				let buffI2 = bufferYcache[ y ] + bufferXcache[ x + 1 * x_dir ];
				const z = z1_way + z_way;
				if( zBuffer[ buffI ] < z && zBuffer[ buffI2 ] < z ) {
					uvw_x += uv_s_x;
					uvw_y += uv_s_y;
					uvw_x += uv_s_x;
					uvw_y += uv_s_y;
					z_way += z_step;
					z_way += z_step;
					continue;
				}
				// const cr_a = camera.angle - fovHalf + x * fovStep; // rel_x * fovHalf;
				// const cos  = Math.cos( cr_a );
				// const sin  = Math.sin( cr_a );

				
				// const cr_d    = ( cameraPosition[ 1 ] / ( ( y - heightH ) * heightStep * Math.cos( cr_a - camera.angle )  ) ) * scale * floorCorrect;
				// const world_x = camera.position[ 0 ] + cos * cr_d;
				// const world_y = camera.position[ 2 ] + sin * cr_d;
				
				// const px = Math.abs( ( world_x - ( world_x | 0 ) ) * 63 ) | 0;
				// const py = Math.abs( ( world_y - ( world_y | 0 ) ) * 63 ) | 0;
				//Индексы буфера кадра и текстуры
				const px = ( uvw_x * 63 ) | 0;
				const py = ( uvw_y * 63 ) | 0;
				
				let pixelI = textureYCache[ py | 0 ] + bufferXcache[ px | 0 ];
				
				if( zBuffer[ buffI ] > z ) {
					this.frameBuffer[ buffI ]     = textureData[ pixelI ] - shadow + light[ 0 ];
					this.frameBuffer[ buffI + 1 ] = textureData[ pixelI + 1 ] - shadow + light[ 1 ];
					this.frameBuffer[ buffI + 2 ] = textureData[ pixelI + 2 ] - shadow + light[ 2 ];
					this.frameBuffer[ buffI + 3 ] = 255;
					zBuffer[ buffI ] = z;
				}
				
				if( zBuffer[ buffI2 ] > z ) {
					this.frameBuffer[ buffI2 ]     = textureData[ pixelI ] - shadow + light[ 0 ];
					this.frameBuffer[ buffI2 + 1 ] = textureData[ pixelI + 1 ] - shadow + light[ 1 ];
					this.frameBuffer[ buffI2 + 2 ] = textureData[ pixelI + 2 ] - shadow + light[ 2 ];
					this.frameBuffer[ buffI2 + 3 ] = 255;
					zBuffer[ buffI2 ] = z;
				}
				
				uvw_x += uv_s_x;
                uvw_y += uv_s_y;
				uvw_x += uv_s_x;
                uvw_y += uv_s_y;
				z_way += z_step;
				z_way += z_step;
			}
			way1_x += dir1_x;
			way2_x += dir2_x;
			uv1_way_x += step1_u; 
			uv1_way_y += step1_v;
			uv2_way_x += step2_u; 
			uv2_way_y += step2_v;
			z1_way    += z1_step;
			z2_way    += z2_step;
		}
		// Корректируем начальные значения для нижней части
		way1_x       = middle[ 0 ];
		uv1_start_x  = middle[ 2 ];
		uv1_start_y  = middle[ 3 ];
		uv1_way_x    = 0;
		uv1_way_y    = 0;
		z1_way       = middle[ 4 ];
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
			const z_step   = ( z2_way - z1_way ) * t;
			
			const x_dir  = ( x_diff >= 0 ) ? 1 : -1;
			
            let uvw_x  = uv1_x;
            let uvw_y  = uv1_y;
			let z_way  = 0;

			for ( let xd = 0; xd <= x_dist; xd += 2 ) {
				const x = ( way1_x + xd * x_dir ) | 0;
				const z = z1_way + z_way;
				let buffI  = bufferYcache[ y ]   + bufferXcache[ x ];
				let buffI2 = bufferYcache[ y ]   + bufferXcache[ x + 1 * x_dir ];
				if( zBuffer[ buffI ] < z && zBuffer[ buffI2 ] < z ) {
					uvw_x += uv_s_x;
					uvw_y += uv_s_y;
					uvw_x += uv_s_x;
					uvw_y += uv_s_y;
					z_way += z_step;
					z_way += z_step;
					continue;
				}
				
				// const cr_a = camera.angle - fovHalf + x * fovStep; // rel_x * fovHalf;
				// const cos  = Math.cos( cr_a );
				// const sin  = Math.sin( cr_a );

				
				// const cr_d    = ( cameraPosition[ 1 ] / ( ( y - heightH ) * heightStep * Math.cos( cr_a - camera.angle )  ) ) * scale * floorCorrect;
				// const world_x = camera.position[ 0 ] + cos * cr_d;
				// const world_y = camera.position[ 2 ] + sin * cr_d;
				
				// const px = Math.abs( ( world_x - ( world_x | 0 ) ) * 63 ) | 0;
				// const py = Math.abs( ( world_y - ( world_y | 0 ) ) * 63 ) | 0;
				//Индексы буфера кадра и текстуры
				const px = ( uvw_x * 63 ) | 0;
				const py = ( uvw_y * 63 ) | 0;
				
				let pixelI = textureYCache[ py | 0 ] + bufferXcache[ px | 0 ];
				
				if( zBuffer[ buffI ] > z ) {
					this.frameBuffer[ buffI ]     = textureData[ pixelI ] - shadow + light[ 0 ];
					this.frameBuffer[ buffI + 1 ] = textureData[ pixelI + 1 ]  - shadow + light[ 1 ];
					this.frameBuffer[ buffI + 2 ] = textureData[ pixelI + 2 ] - shadow + light[ 2 ];
					this.frameBuffer[ buffI + 3 ] = 255;
					zBuffer[ buffI ] = z;
				}
				
				if( zBuffer[ buffI2 ] > z ) {
					this.frameBuffer[ buffI2 ]     = textureData[ pixelI ] - shadow + light[ 0 ];
					this.frameBuffer[ buffI2 + 1 ] = textureData[ pixelI + 1 ] - shadow + light[ 1 ];
					this.frameBuffer[ buffI2 + 2 ] = textureData[ pixelI + 2 ] - shadow + light[ 2 ];
					this.frameBuffer[ buffI2 + 3 ] = 255;
					zBuffer[ buffI2 ] = z;
				}

				uvw_x += uv_s_x;
                uvw_y += uv_s_y;
				uvw_x += uv_s_x;
                uvw_y += uv_s_y;
				z_way += z_step;
				z_way += z_step;
			}
			way1_x += dir3_x;
			way2_x += dir2_x;
			uv1_way_x += step3_u; 
			uv1_way_y += step3_v;
			uv2_way_x += step2_u; 
			uv2_way_y += step2_v;
			z1_way    += z3_step;
			z2_way    += z2_step;
		}
		
	}
}