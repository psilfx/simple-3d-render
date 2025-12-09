class Camera {
	//angle = 1.57 * 0.5;
	angle = 0;
	position;
	leftView;
	rightView;
	normal  = new Float16Array( 3 );
	normalC = new Float16Array( 3 );
	up      = new Float16Array( 3 );
	visibleCells   = [];
	processedCells = [];
	constructor( position ) {
		this.position  = position;
		this.up        = CreateVector3F( 0 , 1 , 0 );
		this.leftView  = CreateVector2F( 0 , 0 );
		this.rightView = CreateVector2F( 0 , 0 );
	}
	SetNormal() {
		this.normal[ 0 ]    = Math.cos( this.angle );
		this.normal[ 1 ]    = 0;
		this.normal[ 2 ]    = Math.sin( this.angle );
		this.normalC[ 0 ]   = Math.cos( this.angle - 1.57 );
		this.normalC[ 1 ]   = 0;
		this.normalC[ 2 ]   = Math.sin( this.angle - 1.57 );
		this.leftView[ 0 ]  = visDist * Math.cos( this.angle - fovHalf );
		this.leftView[ 1 ]  = visDist * Math.sin( this.angle - fovHalf );
		this.rightView[ 0 ] = visDist * Math.cos( this.angle + fovHalf );
		this.rightView[ 1 ] = visDist * Math.sin( this.angle + fovHalf );
	}
	Rotate() {
		this.SetNormal();
	}
	MoveForward( direction = 1 ) {
		this.position[ 0 ] += ( speed * this.normal[ 0 ] ) * direction;
		this.position[ 2 ] += ( speed * this.normal[ 2 ] ) * direction;
	}
	MoveStrafe( direction = 1 ) {
		
		let cross = CrossVectorsF( this.normal , this.up );
		this.position[ 0 ] -= ( speed * cross[ 0 ] ) * direction;
		this.position[ 2 ] -= ( speed * cross[ 2 ] ) * direction;
	}
	IsPointInFrustum( px , py , left , right ) {
        // Вектор от камеры к точке
        const dx = px - ( this.position[ 0 ] | 0 );
        const dy = py - ( this.position[ 2 ] | 0 );
        
        // Проекция на нормали пирамиды
        const dotLeft  = dx * left[ 0 ]  + dy * left[ 1 ];
        const dotRight = dx * right[ 0 ] + dy * right[ 1 ];
        
        // Точка внутри, если проекции положительны
        return dotLeft >= 0 && dotRight >= 0;
    }
	PointInTiangle( px , py , left , right ) {
		const as_x = px - this.position[ 0 ] | 0;
		const as_y = py - this.position[ 2 ] | 0;
		
		const s_ab = ( left[ 0 ] - this.position[ 0 ] ) * as_y - ( left[ 1 ] - this.position[ 2 ] ) * as_x >= 0;

		if ( ( right[ 0 ] - this.position[ 0 ] ) * as_y - ( right[ 1 ] - this.position[ 2 ] ) * as_x > 0 == s_ab ) return false;
		if ( ( right[ 0 ] - left[ 0 ] ) * ( py - left[ 1 ] ) - ( right[ 1 ] - left[ 1 ] ) * ( px - left[ 0 ] ) >= 0 != s_ab ) return false;
		return true;
	}
	triangleContains( x , y , left , right ) {

		let det = ( left[ 0 ] - this.position[ 0 ] ) * ( right[ 1 ] - this.position[ 2 ] ) - ( left[ 1 ] - this.position[ 2 ] ) * ( right[ 0 ] -  this.position[ 0 ] );

		return  det * (( left[ 0 ] - this.position[ 0 ] ) * ( y - this.position[ 2 ] ) - ( left[ 1 ] - this.position[ 2 ] ) * ( x - this.position[ 0 ] )) >= 0 &&
				det * (( right[ 0 ] - left[ 0 ] ) * ( y - left[ 1 ] ) - ( right[ 1 ] -  left[ 1 ] ) * ( x - left[ 0 ] )) >= 0 &&
				det * (( this.position[ 0 ] - right[ 0 ] ) * ( y - right[ 1 ] ) - ( this.position[ 2 ] - right[ 1 ] ) * ( x - right[ 0 ] )) >= 0    

	}
	
	GetVisibleCellsRayBased() {
		this.visibleCells = [];
		this.processedCells.fill( false );
		// Делим пирамиду на лучи
		const rayCount  = 4; // Количество лучей
		const leftAngle = this.angle - fovHalf;
		const angleStep = 0.19634954084936207;
		let   angleWay  = leftAngle;
		for ( let i = 0; i <= rayCount; i++ ) {
			const dirX = Math.cos( angleWay );
			const dirY = Math.sin( angleWay );
			
			// Идём по лучу
			let x = this.position[ 0 ];
			let y = this.position[ 2 ];
			
			for ( let step = 0; step < visDist; step++ ) {
				x += dirX;
				y += dirY;
				
				const cellX = x | 0;
				const cellY = y | 0;
				
				let checkX = cellX;
				let checkY = cellY;
				
				if ( checkX < 0 || checkX >= level.x || checkY < 0 || checkY >= level.y ) continue;
				let cell = level.GetCell( checkX , checkY );
				if( cell && !this.processedCells[ cell.key ] ) {
					this.processedCells[ cell.key ] = true;
					cell.distance = Math.abs( this.position[ 0 ] - checkX + 0.5 ) + Math.abs( this.position[ 2 ] - checkY + 0.5 );
					this.visibleCells.push( cell );
				}
				checkX = cellX + 1;
				checkY = cellY;
				cell   = level.GetCell( checkX , checkY );
				let in_level = ( checkX < 0 || checkX >= level.x || checkY < 0 || checkY >= level.y );
				if( cell && !this.processedCells[ cell.key ] && !in_level ) {
					this.processedCells[ cell.key ] = true;
					cell.distance = Math.abs( this.position[ 0 ] - checkX + 0.5 ) + Math.abs( this.position[ 2 ] - checkY + 0.5 );
					this.visibleCells.push( cell );
				}
				checkX   = cellX - 1;
				checkY   = cellY;
				cell     = level.GetCell( checkX , checkY );
				in_level = ( checkX < 0 || checkX >= level.x || checkY < 0 || checkY >= level.y );
				if( cell && !this.processedCells[ cell.key ] && !in_level ) {
					this.processedCells[ cell.key ] = true;
					cell.distance = Math.abs( this.position[ 0 ] - checkX + 0.5 ) + Math.abs( this.position[ 2 ] - checkY + 0.5 );
					this.visibleCells.push( cell );
				}
				checkX = cellX;
				checkY = cellY + 1;
				cell = level.GetCell( checkX , checkY );
				in_level = ( checkX < 0 || checkX >= level.x || checkY < 0 || checkY >= level.y );
				if( cell && !this.processedCells[ cell.key ] && !in_level ) {
					this.processedCells[ cell.key ] = true;
					cell.distance = Math.abs( this.position[ 0 ] - checkX + 0.5 ) + Math.abs( this.position[ 2 ] - checkY + 0.5 );
					this.visibleCells.push( cell );
				}
				checkX   = cellX;
				checkY   = cellY - 1;
				cell     = level.GetCell( checkX , checkY );
				in_level = ( checkX < 0 || checkX >= level.x || checkY < 0 || checkY >= level.y );
				if( cell && !this.processedCells[ cell.key ] && !in_level ) {
					this.processedCells[ cell.key ] = true;
					cell.distance = Math.abs( this.position[ 0 ] - checkX + 0.5 ) + Math.abs( this.position[ 2 ] - checkY + 0.5 );
					this.visibleCells.push( cell );
				}
			}
			angleWay += angleStep;
		}
	}
	GetVisibleCells() {
		this.visibleCells = [];
		
		// const left   = CreateVector2F( this.position[ 0 ] + this.leftView[ 0 ] , this.position[ 2 ] + this.leftView[ 1 ] );
		// const right  = CreateVector2F( this.position[ 0 ] + this.rightView[ 0 ] , this.position[ 2 ] + this.rightView[ 1 ] );

		// const dir1_x  = left[ 0 ]  - this.position[ 0 ];
		// const dir2_x  = right[ 0 ] - this.position[ 0 ];
		// const dir1_y  = left[ 1 ]  - this.position[ 2 ];
		// const dir2_y  = right[ 1 ] - this.position[ 2 ];
		
		// const dist1   = Math.max( Math.abs( dir1_x ) , Math.abs( dir1_y ) );
		// const dist2   = Math.max( Math.abs( dir2_x ) , Math.abs( dir2_y ) );
		// const dist    = Math.max( dist1 , dist2 );
		// const distI   = distInvCache[ dist | 0 ];
		
		// const step1_x = dir1_x * distI;
		// const step1_y = dir1_y * distI;
		// const step2_x = dir2_x * distI;
		// const step2_y = dir2_y * distI;
		
		// let way1_x = 0;
		// let way1_y = 0;
		// let way2_x = 0;
		// let way2_y = 0;
		
		// const start_x = this.position[ 0 ];
		// const start_y = this.position[ 2 ];
		
		// for( let d = 0; d < dist; d++ ) {
			// //Считаем старт лини от основания
			// const in_start_x = start_x + way1_x;
			// const in_start_y = start_y + way1_y;
			// const in_end_x   = start_x + way2_x;
			// const in_end_y   = start_y + way2_y;
			
			// //Считаем направление закраски линии
			// const dir_x = in_end_x - in_start_x;
			// const dir_y = in_end_y - in_start_y;
			
			// const in_dist  = Math.max( Math.abs( dir_x ) , Math.abs( dir_y ) );
			// const in_distI = distInvCache[ in_dist | 0 ];
			
			// const step_x = dir_x * in_distI;
			// const step_y = dir_y * in_distI;
			
			// //Подсчёт прохода
			// let way_x = 0;
			// let way_y = 0;
			
			// let cell = level.GetCell( in_start_x | 0 , in_start_y | 0 )
			// if ( cell ) this.visibleCells.push( cell );
				// cell = level.GetCell( in_end_x | 0 , in_end_y | 0 )
			// if ( cell ) this.visibleCells.push( cell );
			
			// way1_x += step1_x;
			// way1_y += step1_y;
			// way2_x += step2_x;
			// way2_y += step2_y;
		// }
		// return;
		
		//Квадратная область вокруг камеры
       
		const left   = CreateVector2F( this.position[ 0 ] + this.leftView[ 0 ] , this.position[ 2 ] + this.leftView[ 1 ] );
		const right  = CreateVector2F( this.position[ 0 ] + this.rightView[ 0 ] , this.position[ 2 ] + this.rightView[ 1 ] );
		
		const startX = Math.min( left[ 0 ] , right[ 0 ] , this.position[ 0 ] );
        const endX   = Math.max( left[ 0 ] , right[ 0 ] , this.position[ 0 ] );
        const startY = Math.min( left[ 1 ] , right[ 1 ] , this.position[ 2 ] );
        const endY   = Math.max( left[ 1 ] , right[ 1 ] , this.position[ 2 ] );
		// const startX = Math.max( 0, this.position[ 0 ] - visDist );
        // const endX   = Math.min( level.x , this.position[ 0 ] + visDist );
        // const startY = Math.max( 0, this.position[ 2 ] - visDist );
        // const endY   = Math.min( level.y , this.position[ 2 ] + visDist );
		
		 // Быстрая проверка клеток
        for ( let y = startY | 0; y < endY | 0; y++ ) {
			if( y >= level.y || y < 0 ) continue;
            for ( let x = startX | 0; x < endX | 0; x++ ) {
				if( x >= level.x || x < 0 ) continue;
				// Проверка пирамиды видимости
				if ( !this.PointInTiangle( x , y , left , right ) ) continue;
				const cell = level.GetCell( x , y );
				if ( cell ) {
					
					cell.distance = Math.max( Math.abs( this.position[ 0 ] - x ) , Math.abs( this.position[ 2 ] - y ) );
					this.visibleCells.push( cell );
				} 
            }
        }
	}
	Update() {
		
		//this.GetVisibleCells();
		this.GetVisibleCellsRayBased();
		this.visibleCells.sort( ( a , b ) => b.distance - a.distance );
		//this.visibleCells.forEach( ( cell ) => { cell.Update() } );
	}
	Draw() {
		
		this.visibleCells.forEach( ( cell ) => { 
			cell.Update();  //В целях оптимизона, там всёравно только проекции, всё что связано с отображением
			cell.Draw();
		} 
		);
	}
	DrawMap() {
		let cellWidth = 10;
		for( let c = 0; c < level.cells.length; c++ ) {
			let cell = level.cells[ c ];
			let c_x  = cell.position[ 0 ] * cellWidth;
			let c_y  = cell.position[ 1 ] * cellWidth;
			context.fillStyle = "green";
			context.fillRect( c_x , c_y , cellWidth , cellWidth );
		}
		for( let c = 0; c < this.visibleCells.length; c++ ) {
			let cell = this.visibleCells[ c ];
			if( !cell ) continue;
			let c_x  = cell.position[ 0 ] * cellWidth;
			let c_y  = cell.position[ 1 ] * cellWidth;
			context.fillStyle = "orange";
			context.fillRect( c_x , c_y , cellWidth , cellWidth );
		}
		context.fillStyle = "red";
		context.fillRect( this.position[ 0 ] * cellWidth , this.position[ 2 ] * cellWidth , cellWidth , cellWidth );
		
		const p2   = CreateVector2F( ( this.position[ 0 ] + visDist * Math.cos( this.angle - fovHalf ) ) * cellWidth , ( this.position[ 2 ] + visDist * Math.sin( this.angle - fovHalf ) ) * cellWidth );
		const p4   = CreateVector2F( ( this.position[ 0 ] + visDist * Math.cos( this.angle + fovHalf ) ) * cellWidth , ( this.position[ 2 ] + visDist * Math.sin( this.angle + fovHalf ) ) * cellWidth );
		
		context.strokeStyle = "red";
		context.beginPath();
        context.moveTo( this.position[ 0 ] * cellWidth , this.position[ 2 ] * cellWidth );
        context.lineTo( p2[ 0 ], p2[ 1 ] );
        context.lineTo( p4[ 0 ], p4[ 1 ] );
        context.lineTo( this.position[ 0 ] * cellWidth , this.position[ 2 ] * cellWidth );
        context.stroke();
	}
}