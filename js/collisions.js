class Collisions {
	ResolveTileCollision( object , tile ) {
		// Вычисляем перекрытие по осям
		const overlapX = Math.min( object.x + object.width  - tile.x , tile.x + tile.width  - object.x );
		const overlapY = Math.min( object.y + object.height - tile.y , tile.y + tile.height - object.y );
		// Решаем по меньшему перекрытию (SAT)
		if ( overlapX < overlapY ) {
			// Горизонтальная коллизия
			object.x          = tile.x + tile.width * ( object.x > tile.x ) - object.width * ( object.x < tile.x );
			object.velocityX  = 0;
			object.direction *= -1;
			object.velocityX  = object.speed * object.direction;
		} else {
			// Вертикальная коллизия
			// Объект над тайлом - СТОИТ НА ТАЙЛЕ
			const ontile      = ( object.y < tile.y ); //Над тайлом
			const untile      = ( object.y > tile.y ); //Под тайлом
			object.y          = tile.y - object.height * ( ontile ) + tile.height * ( untile );
			object.velocityY  = 0;
			object.isOnGround = ontile;
			object.canJump    = ontile;
		}
	}
	CheckCellCollision( box , cell ) {
		for( let w = 0; w < cell.wallsCount; w++ ) {
			const wall = level.walls[ cell.walls[ w ] ];
			//console.log( { x: wall.center[ 0 ] - 0.5 , y: wall.center[ 2 ] - 0.5 , width: 1 , height: 1 } );
			if( this.AABB( box , { x: wall.center[ 0 ] - 0.5 , y: wall.center[ 2 ] - 0.5 , width: 1 , height: 1 } ) ) {
				return wall;
			}
		}
		return false;
	}
	
	// Проверка AABB коллизии
	AABB( rect1, rect2 ) {
		return rect1.x < rect2.x + rect2.width &&
			   rect1.x + rect1.width > rect2.x &&
			   rect1.y < rect2.y + rect2.height &&
			   rect1.y + rect1.height > rect2.y;
	}
}