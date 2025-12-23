class Cell {
	key;
	position;
	center;
	centerTop;
	centerBottom;
	centerLeft;
	centerRight;
	walls;
	wallsCount = 0;
	texture;
	line_t; //Верхняя линия
	line_b; //Нижняя линия
	porjectPoints;
	uvPoints;
	shadow;
	drawed = false;
	distance = 0;
	constructor( x = 0 , y = 0 , key = 0 ) {
		this.key           = key;
		this.position      = CreateVector2I( x , y );
		this.center        = CreateVector3F( x + 0.5 , 0 , y + 0.5 );
		this.centerTop     = CreateVector3F( x + 0.5 , 0 , y );
		this.centerBottom  = CreateVector3F( x + 0.5 , 0 , y + 1 );
		this.centerLeft    = CreateVector3F( x       , 0 , y + 0.5 );
		this.centerRight   = CreateVector3F( x + 1   , 0 , y + 0.5 );
		this.walls         = new Int8Array( 10 ); //Максимум 10 стенок на клетку
		this.line_t        = [ CreateVector3F( x , 0 , y ) , CreateVector3F( x + 1 , 0 , y ) ];
		this.line_b        = [ CreateVector3F( x , 0 , y + 1 ) , CreateVector3F( x + 1 , 0 , y + 1 ) ];
		this.porjectPoints = [];
		this.uvPoints      = [ CreateVector2F( 0 , 0 ) , CreateVector2F( 1 , 0 ) , CreateVector2F( 0 , 1 ) , CreateVector2F( 1 , 1 ) ];
		this.shadow        = [ 0 , 0 , 0 , 0 ];
		this.wallsCount    = 0;
	}
	AddWall( w_index ) {
		this.walls[ this.wallsCount ] = w_index;
		this.wallsCount++;
	}
	Update() {
		this.drawed = false;
		this.porjectPoints[ 0 ] = render.ProjectPoint( this.line_t[ 0 ] , cameraPosition , 1 );
		this.porjectPoints[ 1 ] = render.ProjectPoint( this.line_t[ 1 ] , cameraPosition , 1 );
		this.porjectPoints[ 2 ] = render.ProjectPoint( this.line_b[ 0 ] , cameraPosition , 1 );
		this.porjectPoints[ 3 ] = render.ProjectPoint( this.line_b[ 1 ] , cameraPosition , 1 );
		this.porjectPoints[ 4 ] = render.ProjectPoint( this.center      , cameraPosition , 1 );
		this.porjectPoints[ 5 ] = render.ProjectPoint( this.centerTop   , cameraPosition , 1 );
		this.porjectPoints[ 6 ] = render.ProjectPoint( this.centerBottom, cameraPosition , 1 );
		this.porjectPoints[ 7 ] = render.ProjectPoint( this.centerLeft  , cameraPosition , 1 );
		this.porjectPoints[ 8 ] = render.ProjectPoint( this.centerRight , cameraPosition , 1 );
		
	}
	
	Draw() {
		if( this.drawed ) return;
		this.drawed = true;
		const shadow = ( 155 * ( this.distance * distInvCache[ visDist ] ) ) | 0;
		let	drawPoints1 = render.GetWallDrawPoints( this.porjectPoints[ 0 ] , this.porjectPoints[ 1 ] );
		let	drawPoints2 = render.GetWallDrawPoints( this.porjectPoints[ 2 ] , this.porjectPoints[ 3 ] );
		let	drawCLeft   = render.GetWallDrawPoints( this.porjectPoints[ 7 ] , this.porjectPoints[ 4 ] );
		let	drawCRight  = render.GetWallDrawPoints( this.porjectPoints[ 4 ] , this.porjectPoints[ 8 ] );
		let	drawCTop    = render.GetWallDrawPoints( this.porjectPoints[ 5 ] , this.porjectPoints[ 4 ] );
		let	drawCBottom = render.GetWallDrawPoints( this.porjectPoints[ 4 ] , this.porjectPoints[ 6 ] );
		
		let point1 = CreatePointUVZ( drawPoints1[ 2 ][ 0 ] , drawPoints1[ 2 ][ 1 ] , this.uvPoints[ 0 ][ 0 ] , this.uvPoints[ 0 ][ 1 ] , drawPoints1[ 2 ][ 2 ] );
		let point2 = CreatePointUVZ( drawPoints1[ 3 ][ 0 ] , drawPoints1[ 3 ][ 1 ] , this.uvPoints[ 1 ][ 0 ] , this.uvPoints[ 1 ][ 1 ] , drawPoints1[ 3 ][ 2 ] );
		let point3 = CreatePointUVZ( drawPoints2[ 2 ][ 0 ] , drawPoints2[ 2 ][ 1 ] , this.uvPoints[ 2 ][ 0 ] , this.uvPoints[ 2 ][ 1 ] , drawPoints2[ 2 ][ 2 ] );
		let point4 = CreatePointUVZ( drawPoints2[ 3 ][ 0 ] , drawPoints2[ 3 ][ 1 ] , this.uvPoints[ 3 ][ 0 ] , this.uvPoints[ 3 ][ 1 ] , drawPoints2[ 3 ][ 2 ] );
		let center = CreatePointUVZ( drawCLeft[ 3 ][ 0 ]   , drawCLeft[ 3 ][ 1 ] , 0.5 , 0.5 , drawCLeft[ 3 ][ 2 ] );
		let left   = CreatePointUVZ( drawCLeft[ 2 ][ 0 ]   , drawCLeft[ 2 ][ 1 ] , 0 , 0.5 , drawCLeft[ 2 ][ 2 ] );
		let right  = CreatePointUVZ( drawCRight[ 3 ][ 0 ]  , drawCRight[ 3 ][ 1 ] , 1 , 0.5 , drawCRight[ 3 ][ 2 ] );
		let top    = CreatePointUVZ( drawCTop[ 2 ][ 0 ]    , drawCTop[ 2 ][ 1 ] , 0.5 , 0 , drawCTop[ 2 ][ 2 ] );
		let bottom = CreatePointUVZ( drawCBottom[ 3 ][ 0 ] , drawCBottom[ 3 ][ 1 ] , 0.5 , 1 , drawCBottom[ 3 ][ 2 ] );
		// render.RenderTriangleScanline( point1 , point2 , point3 , this.texture.data , shadow );
		// render.RenderTriangleScanline( point4 , point3 , point2 , this.texture.data , shadow );
		//if( drawPoints1[ 2 ][ 0 ] < 0 || drawPoints1[ 2 ][ 0 ] > width ) return;
		//if( drawPoints1[ 3 ][ 0 ] < 0 || drawPoints1[ 3 ][ 0 ] > width ) return;
		//if( drawPoints2[ 2 ][ 0 ] < 0 || drawPoints2[ 2 ][ 0 ] > width ) return;
		//if( drawPoints2[ 3 ][ 0 ] < 0 || drawPoints2[ 3 ][ 0 ] > width ) return;
		//render.RenderTexturedFloorDoomOpt( point1 , point2 , point3 , point4 , this.texture.data , this.shadow );
		render.RenderTriangleScanline( point1 , top    , center , this.texture.data , shadow );
		render.RenderTriangleScanline( point1 , left   , center , this.texture.data , shadow );
		render.RenderTriangleScanline( point2 , top    , center , this.texture.data , shadow );
		render.RenderTriangleScanline( point2 , right  , center , this.texture.data , shadow );
		render.RenderTriangleScanline( point3 , bottom , center , this.texture.data , shadow );
		render.RenderTriangleScanline( point3 , left   , center , this.texture.data , shadow );
		render.RenderTriangleScanline( point4 , bottom , center , this.texture.data , shadow );
		render.RenderTriangleScanline( point4 , right  , center , this.texture.data , shadow );
		// render.RenderTriangleScanline( center , point2 , point4 , this.texture.data );
		// render.RenderTriangleScanline( point3 , point4 , center , this.texture.data );
		// render.RenderTriangleScanline( center , point3 , point1 , this.texture.data );
		if( this.wallsCount <= 0 ) return;
		this.walls.sort( ( a , b ) => {
			
			if( a == 0 || b == 0 ) return; 
			return level.walls[ b ].center[ 1 ] - level.walls[ a ].center[ 1 ];
		})
		for( let w = 0; w < this.wallsCount; w++ ) {
			level.walls[ this.walls[ w ] ].Update();
			level.walls[ this.walls[ w ] ].distance = this.distance;
			level.walls[ this.walls[ w ] ].Draw();
		}
		//render.RenderTriangleScanline( point1 , point2 , point3 , texture.data );
		//render.RenderTriangleScanline( point3 , point4 , point2 , texture.data );
		
	}
}
class Level {
	x = 0;
	y = 0;
	walls;
	wallsCount;
	cells;
	constructor( x = 0 , y = 0 ) {
		this.x     = x | 0;
		this.y     = y | 0;
		this.cells = [];
		this.walls = [];
		this.wallsCount = 0;
		for( let y = 0; y < this.y; y++ ) {
			for( let x = 0; x < this.x; x++ ) {
				let key           = this.GetCellKey( x , y );
				this.cells[ key ] = new Cell( x , y , key );
				this.cells[ key ].texture = texture;
			}
		}
	}
	AddWall( start , end , width , height , texture ) {
		this.wallsCount++;
		let key  = this.wallsCount;
		this.walls[ key ] = new Wall( start , end , width , height , texture );
		let cell = this.GetCell( start[ 0 ] | 0 , start[ 2 ] | 0 );
			cell.AddWall( key );
		return this.walls[ key ];
		//const dist = Math.sqrt( Math.pow( end[ 0 ] - start[ 0 ] ) + Math.pow( end[ 2 ] - start[ 2 ] ) );
	}
	Update() {
		//this.cells.forEach( ( element ) => { element.Update() } );
	}
	SetCellTexture( x , y , texture ) {
		const cell = this.GetCell( x , y );
		if( cell ) cell.texture = texture;
	}
	GetCellKey( x , y ) {
		return ( y * this.x + x ) | 0;
	}
	GetCell( x , y ) {
		return this.cells[ this.GetCellKey( x , y ) ];
	}
	Draw() {
		this.cells.forEach( ( element ) => { element.Draw() } );
		
	}
}