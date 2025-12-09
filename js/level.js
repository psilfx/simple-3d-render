class Cell {
	key;
	position;
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
		
	}
	Draw() {
		if( this.drawed ) return;
		this.drawed = true;
		let	drawPoints1 = render.GetWallDrawPoints( this.porjectPoints[ 0 ] , this.porjectPoints[ 1 ] );
		let	drawPoints2 = render.GetWallDrawPoints( this.porjectPoints[ 2 ] , this.porjectPoints[ 3 ] );
		
		let point1 = CreatePointUV( drawPoints1[ 2 ][ 0 ] , drawPoints1[ 2 ][ 1 ] , this.uvPoints[ 0 ][ 0 ] , this.uvPoints[ 0 ][ 1 ] );
		let point2 = CreatePointUV( drawPoints1[ 3 ][ 0 ] , drawPoints1[ 3 ][ 1 ] , this.uvPoints[ 1 ][ 0 ] , this.uvPoints[ 1 ][ 1 ] );
		let point3 = CreatePointUV( drawPoints2[ 2 ][ 0 ] , drawPoints2[ 2 ][ 1 ] , this.uvPoints[ 2 ][ 0 ] , this.uvPoints[ 2 ][ 1 ] );
		let point4 = CreatePointUV( drawPoints2[ 3 ][ 0 ] , drawPoints2[ 3 ][ 1 ] , this.uvPoints[ 3 ][ 0 ] , this.uvPoints[ 3 ][ 1 ] );
		//if( drawPoints1[ 2 ][ 0 ] < 0 || drawPoints1[ 2 ][ 0 ] > width ) return;
		//if( drawPoints1[ 3 ][ 0 ] < 0 || drawPoints1[ 3 ][ 0 ] > width ) return;
		//if( drawPoints2[ 2 ][ 0 ] < 0 || drawPoints2[ 2 ][ 0 ] > width ) return;
		//if( drawPoints2[ 3 ][ 0 ] < 0 || drawPoints2[ 3 ][ 0 ] > width ) return;
		render.RenderTexturedFloorDoomOpt( point1 , point2 , point3 , point4 , texture.data , this.shadow );
		
		for( let w = 0; w < this.wallsCount; w++ ) {
			level.walls[ this.walls[ w ] ].Update();
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
			}
		}
	}
	AddWall( start , end , width , height ) {
		this.wallsCount++;
		let key  = this.wallsCount;
		this.walls[ key ] = new Wall( start , end , width , height , texture );
		let cell = this.GetCell( start[ 0 ] | 0 , start[ 2 ] | 0 );
			cell.AddWall( key );
		//const dist = Math.sqrt( Math.pow( end[ 0 ] - start[ 0 ] ) + Math.pow( end[ 2 ] - start[ 2 ] ) );
	}
	Update() {
		this.cells.forEach( ( element ) => { element.Update() } );
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