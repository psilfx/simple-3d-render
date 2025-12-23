class Wall {
	normals;
	points;
	texture;
	
	sidesCenter;
	center;
	
	transformMod;
	transformedPoints;
	transformedNormals;
	visibleSides;
	visiblePoints;
	uvPoints;
	visible = false;
	
	projPoints;
	
	angle = 0;
	
	height = 0;
	width  = 0;
	
	links; //Соединения
	closestLinks = 0;
	
	drawedPoints;
	distance = 0;
	
	constructor( pointStart , pointEnd , width , height , texture ) {
		const wallLength        = DistanceVectorsF( pointStart , pointEnd );
		this.width              = width;
		this.height             = height;
		this.texture            = texture;
		this.transformMod       = CreateVector2F();
		this.transformedPoints  = [ CreateVector3F() , CreateVector3F() , CreateVector3F() , CreateVector3F() , CreateVector3F() , CreateVector3F() , CreateVector3F() , CreateVector3F() , CreateVector3F() ];
		this.transformedNormals = [ CreateVector3F() , CreateVector3F() , CreateVector3F() , CreateVector3F() ];
		this.projPoints         = [ CreateVector3F() , CreateVector3F() , CreateVector3F() , CreateVector3F() ];
		this.drawedPoints       = [ CreateVector2F() , CreateVector2F() , CreateVector2F() , CreateVector2F() ];
		this.uvPoints           = [ CreateVector2F( wallLength , height ) , CreateVector2F( width , height ) , CreateVector2F( wallLength , height ) , CreateVector2F( width , height )  ];
		this.visibleSides       = [ false , false , false , false ];
		this.visiblePoints      = [ false , false , false , false ];
		this.CreateWallPoints( pointStart , pointEnd );
		this.CalcCenter();
		this.CreateWallNormals();
		this.SetTransformCoords();
		this.Transform();
		this.CreateLinks();
	}
	
	CreateWallPoints( p1 , p2 ) {
		let subtract = SubtractVectorsF( p2 , p1 );
		if( Math.abs( subtract[ 0 ] ) > Math.abs( subtract[ 2 ] ) ) {
			this.points = [ p1 , p2 , CreateVector3F( p1[ 0 ] , p1[ 1 ] , p1[ 2 ] + this.width ) , CreateVector3F( p2[ 0 ] , p2[ 1 ] , p2[ 2 ] + this.width ) ];
		} else {
			this.points = [ p1 , p2 , CreateVector3F( p1[ 0 ] + this.width , p1[ 1 ] , p1[ 2 ] ) , CreateVector3F( p2[ 0 ] + this.width , p2[ 1 ] , p2[ 2 ] ) ];
		}
	}
	CreateWallNormals() {
		this.normals = [];
		for( let s = 0; s < 4; s++ ) {
			this.normals[ s ] = VectorNormalize3F( SubtractVectorsF( this.center , this.sidesCenter[ s ] ) );
		}
		this.normals[ 4 ] = CreateVector3F( 0 , 1 , 0 ); //Потолок
		this.normals[ 5 ] = CreateVector3F( 0 , -1 , 0 ); //Пол
	}
	CreateLinks() {
		this.links = [ [ 2 , 0 , 1 ] , [ 0 , 1 , 3 ] , [ 0 , 2 , 3 ] , [ 1 , 3 , 2 ] ];
	}
	
	SetTransformCoords() {
		this.transformMod[ 0 ] = Math.cos( this.angle );
		this.transformMod[ 1 ] = Math.sin( this.angle );
	}
	
	Rotate( angle ) {
		this.angle = angle;
		this.SetTransformCoords();
		this.Transform();
	}
	
	CalcCenter() {
		this.sidesCenter      = [];
		//Стороны перед/зад
		this.sidesCenter[ 0 ] = PlusVector3F( this.points[ 0 ] , MultiplyVector3F( SubtractVectorsF( this.points[ 1 ] , this.points[ 0 ] ) , 0.5 ) );
		this.sidesCenter[ 1 ] = PlusVector3F( this.points[ 2 ] , MultiplyVector3F( SubtractVectorsF( this.points[ 3 ] , this.points[ 2 ] ) , 0.5 ) );
		//Считаем для лева/право
		let subtract          = MultiplyVector3F( SubtractVectorsF( this.sidesCenter[ 1 ] , this.sidesCenter[ 0 ] ) , 0.5 );
		this.sidesCenter[ 2 ] = PlusVector3F( this.points[ 0 ] , subtract );
		this.sidesCenter[ 3 ] = PlusVector3F( this.points[ 1 ] , subtract );
		//Центр стены
		this.center           = PlusVector3F( this.sidesCenter[ 0 ] , subtract );
	}
	SetCenter( vector3f ) {
		this.center = vector3f;
	}
	Transform() {
		for( let p = 0; p < 4; p++ ) {
			let point = this.points[ p ];
			//Поворачиваем стороны
			let modCoords = SubtractVectorsF( point , this.center );
			this.transformedPoints[ p ][ 0 ] = this.center[ 0 ] + ( modCoords[ 0 ] * this.transformMod[ 0 ] + modCoords[ 2 ] * this.transformMod[ 1 ] );
			this.transformedPoints[ p ][ 1 ] = this.center[ 1 ];
			this.transformedPoints[ p ][ 2 ] = this.center[ 2 ] + ( -modCoords[ 0 ] * this.transformMod[ 1 ] + modCoords[ 2 ] * this.transformMod[ 0 ] );
			//Поворачиваем нормали ( добавил сюда, чтобы не создавать ещё один цикл)
			this.transformedNormals[ p ][ 0 ] = this.normals[ p ][ 0 ]  * this.transformMod[ 0 ] + this.normals[ p ][ 2 ] * this.transformMod[ 1 ];
			this.transformedNormals[ p ][ 2 ] = -this.normals[ p ][ 0 ] * this.transformMod[ 1 ] + this.normals[ p ][ 2 ] * this.transformMod[ 0 ];
		}
		for( let p = 0; p < 4; p++ ) {
			let point = this.sidesCenter[ p ];
			//Поворачиваем стороны
			let modCoords = SubtractVectorsF( point , this.center );
			this.transformedPoints[ p + 4 ][ 0 ] = this.center[ 0 ] + ( modCoords[ 0 ] * this.transformMod[ 0 ] + modCoords[ 2 ] * this.transformMod[ 1 ] );
			this.transformedPoints[ p + 4 ][ 1 ] = this.center[ 1 ];
			this.transformedPoints[ p + 4 ][ 2 ] = this.center[ 2 ] + ( -modCoords[ 0 ] * this.transformMod[ 1 ] + modCoords[ 2 ] * this.transformMod[ 0 ] );
		}
		this.transformedPoints[ 8 ][ 0 ] = this.center[ 0 ];
		this.transformedPoints[ 8 ][ 1 ] = this.center[ 1 ];
		this.transformedPoints[ 8 ][ 2 ] = this.center[ 2 ];
		//console.log( this.transformedNormals[ 0 ] );
	}
	UpdateVision() {
		let front = VectorNormalize3F( SubtractVectorsF( this.center , cameraPosition ) );
		//let normal = CreateVector3F( -camNormal[ 0 ] , -camNormal[ 1 ] , -camNormal[ 2 ] );
		
		this.visibleSides[ 0 ] = DotVectors( front , this.transformedNormals[ 0 ] );
		this.visibleSides[ 1 ] = DotVectors( front , this.transformedNormals[ 1 ] );
		this.visibleSides[ 2 ] = DotVectors( front , this.transformedNormals[ 2 ] );
		this.visibleSides[ 3 ] = DotVectors( front , this.transformedNormals[ 3 ] );
		this.visible = DotVectors( front , camera.normal );
	}
	IsVisible( point ) {
		const vx = ( point[ 0 ] >= 0 && point[ 0 ] <= width );
		const vy = ( point[ 1 ] >= 0 && point[ 1 ] <= height );
		return ( vx && vy );
	}
	Update() {
		this.projPoints[ 0 ] = render.ProjectPoint( this.transformedPoints[ 0 ] , cameraPosition , this.height );
		this.projPoints[ 1 ] = render.ProjectPoint( this.transformedPoints[ 1 ] , cameraPosition , this.height );
		this.projPoints[ 2 ] = render.ProjectPoint( this.transformedPoints[ 2 ] , cameraPosition , this.height );
		this.projPoints[ 3 ] = render.ProjectPoint( this.transformedPoints[ 3 ] , cameraPosition , this.height );
		this.projPoints[ 4 ] = render.ProjectPoint( this.transformedPoints[ 4 ] , cameraPosition , this.height );
		this.projPoints[ 5 ] = render.ProjectPoint( this.transformedPoints[ 5 ] , cameraPosition , this.height );
		this.projPoints[ 6 ] = render.ProjectPoint( this.transformedPoints[ 6 ] , cameraPosition , this.height );
		this.projPoints[ 7 ] = render.ProjectPoint( this.transformedPoints[ 7 ] , cameraPosition , this.height );
		this.projPoints[ 8 ] = render.ProjectPoint( this.transformedPoints[ 8 ] , cameraPosition , this.height );
		this.UpdateVision();
	}

	Draw() {
		if( this.visible <= 0 ) return;
		// let light1 = Math.max( 255 - 255 * Math.min( this.visibleSides[ 0 ] , 1 ) , 0 );
		// let light2 = Math.max( 255 - 255 * Math.min( this.visibleSides[ 1 ] , 1 ) , 0 );
		// let light3 = 255 - 255 * Math.min( this.visibleSides[ 2 ] , 1 );
		// let light4 = 255 - 255 * Math.min( this.visibleSides[ 3 ] , 1 );
		// let lights = [ light1 , light1 , light2 , light2 ];
		const shadow = ( 155 * ( this.distance * distInvCache[ visDist ] ) ) | 0;
		let	drawPoints1 = render.GetWallDrawPoints( this.projPoints[ 0 ] , this.projPoints[ 1 ] );
		let	drawPoints3 = render.GetWallDrawPoints( this.projPoints[ 2 ] , this.projPoints[ 3 ] );
		let	drawPoints5 = render.GetWallDrawPoints( this.projPoints[ 4 ] , this.projPoints[ 8 ] );
		let	drawPoints6 = render.GetWallDrawPoints( this.projPoints[ 5 ] , this.projPoints[ 8 ] );
		let	drawPoints7 = render.GetWallDrawPoints( this.projPoints[ 6 ] , this.projPoints[ 8 ] );
		let	drawPoints8 = render.GetWallDrawPoints( this.projPoints[ 7 ] , this.projPoints[ 8 ] );
		
		//console.log( this.projPoints[ 0 ] );
		if( this.visibleSides[ 0 ] > 0 ) {
			//Квадрат
			let point1 = CreatePointUVZ( drawPoints1[ 0 ][ 0 ] , drawPoints1[ 0 ][ 1 ] , 0                       , 0 , drawPoints1[ 0 ][ 2 ] );
			let point2 = CreatePointUVZ( drawPoints1[ 1 ][ 0 ] , drawPoints1[ 1 ][ 1 ] , this.uvPoints[ 0 ][ 0 ] , 0 , drawPoints1[ 1 ][ 2 ] );
			let point3 = CreatePointUVZ( drawPoints1[ 2 ][ 0 ] , drawPoints1[ 2 ][ 1 ] , 0                       , this.height , drawPoints1[ 2 ][ 2 ] );
			let point4 = CreatePointUVZ( drawPoints1[ 3 ][ 0 ] , drawPoints1[ 3 ][ 1 ] , this.uvPoints[ 0 ][ 0 ] , this.height , drawPoints1[ 3 ][ 2 ] );
			//Центральные точки
			let point5 = CreatePointUVZ( drawPoints5[ 0 ][ 0 ] , drawPoints5[ 0 ][ 1 ] , this.uvPoints[ 0 ][ 0 ] * 0.5 , 0 , drawPoints5[ 0 ][ 2 ] );
			let point6 = CreatePointUVZ( drawPoints5[ 2 ][ 0 ] , drawPoints5[ 2 ][ 1 ] , this.uvPoints[ 0 ][ 0 ] * 0.5 , this.height , drawPoints5[ 2 ][ 2 ] );
			
			render.RenderWallPolygonOpt( point1 , point5 , point3 , point6 , this.texture.data , shadow );
			render.RenderWallPolygonOpt( point5 , point2 , point6 , point4 , this.texture.data , shadow );
		}		
		
		if( this.visibleSides[ 2 ] > 0 ) {
			let point1 = CreatePointUVZ( drawPoints1[ 0 ][ 0 ] , drawPoints1[ 0 ][ 1 ] , 0                       , 0 , drawPoints1[ 0 ][ 2 ] );
			let point2 = CreatePointUVZ( drawPoints3[ 0 ][ 0 ] , drawPoints3[ 0 ][ 1 ] , this.width , 0 , drawPoints3[ 0 ][ 2 ] );
			let point3 = CreatePointUVZ( drawPoints1[ 2 ][ 0 ] , drawPoints1[ 2 ][ 1 ] , 0                       , this.height , drawPoints1[ 2 ][ 2 ] );
			let point4 = CreatePointUVZ( drawPoints3[ 2 ][ 0 ] , drawPoints3[ 2 ][ 1 ] , this.width , this.height , drawPoints3[ 2 ][ 2 ] );
			//Центральные точки
			let point5 = CreatePointUVZ( drawPoints7[ 0 ][ 0 ] , drawPoints7[ 0 ][ 1 ] , this.width * 0.5 , 0 , drawPoints7[ 0 ][ 2 ] );
			let point6 = CreatePointUVZ( drawPoints7[ 2 ][ 0 ] , drawPoints7[ 2 ][ 1 ] , this.width * 0.5 , this.height , drawPoints7[ 2 ][ 2 ] );
			render.RenderWallPolygonOpt( point1 , point5 , point3 , point6 , this.texture.data , shadow );
			render.RenderWallPolygonOpt( point5 , point2 , point6 , point4 , this.texture.data , shadow );
		}
		
		if( this.visibleSides[ 1 ] > 0 ) {
			let point1 = CreatePointUVZ( drawPoints3[ 0 ][ 0 ] , drawPoints3[ 0 ][ 1 ] , 0                       , 0 , drawPoints3[ 0 ][ 2 ] );
			let point2 = CreatePointUVZ( drawPoints3[ 1 ][ 0 ] , drawPoints3[ 1 ][ 1 ] , this.uvPoints[ 0 ][ 0 ] , 0 , drawPoints3[ 1 ][ 2 ] );
			let point3 = CreatePointUVZ( drawPoints3[ 2 ][ 0 ] , drawPoints3[ 2 ][ 1 ] , 0                       , this.height , drawPoints3[ 2 ][ 2 ] );
			let point4 = CreatePointUVZ( drawPoints3[ 3 ][ 0 ] , drawPoints3[ 3 ][ 1 ] , this.uvPoints[ 0 ][ 0 ] , this.height , drawPoints3[ 3 ][ 2 ] );
			//Центральные точки
			let point5 = CreatePointUVZ( drawPoints6[ 0 ][ 0 ] , drawPoints6[ 0 ][ 1 ] , this.uvPoints[ 0 ][ 0 ] * 0.5 , 0 , drawPoints6[ 0 ][ 2 ] );
			let point6 = CreatePointUVZ( drawPoints6[ 2 ][ 0 ] , drawPoints6[ 2 ][ 1 ] , this.uvPoints[ 0 ][ 0 ] * 0.5 , this.height , drawPoints6[ 2 ][ 2 ] );
			render.RenderWallPolygonOpt( point1 , point5 , point3 , point6 , this.texture.data , shadow );
			render.RenderWallPolygonOpt( point5 , point2 , point6 , point4 , this.texture.data , shadow );
		} 
		
		if( this.visibleSides[ 3 ] > 0 ) {
			 render.RenderWallPolygonOpt( drawPoints1[ 1 ] , drawPoints3[ 1 ] , drawPoints1[ 3 ] , drawPoints3[ 3 ] , this.texture.data , shadow , this.uvPoints[ 1 ][ 0 ] , this.uvPoints[ 1 ][ 1 ] );
			 
			let point1 = CreatePointUVZ( drawPoints1[ 1 ][ 0 ] , drawPoints1[ 1 ][ 1 ] , 0                       , 0 , drawPoints1[ 1 ][ 2 ] );
			let point2 = CreatePointUVZ( drawPoints3[ 1 ][ 0 ] , drawPoints3[ 1 ][ 1 ] , this.width , 0 , drawPoints3[ 1 ][ 2 ] );
			let point3 = CreatePointUVZ( drawPoints1[ 3 ][ 0 ] , drawPoints1[ 3 ][ 1 ] , 0                       , this.height , drawPoints1[ 3 ][ 2 ] );
			let point4 = CreatePointUVZ( drawPoints3[ 3 ][ 0 ] , drawPoints3[ 3 ][ 1 ] , this.width , this.height , drawPoints3[ 3 ][ 2 ] );
			//Центральные точки
			let point5 = CreatePointUVZ( drawPoints8[ 0 ][ 0 ] , drawPoints8[ 0 ][ 1 ] , this.width * 0.5 , 0 , drawPoints8[ 0 ][ 2 ] );
			let point6 = CreatePointUVZ( drawPoints8[ 2 ][ 0 ] , drawPoints8[ 2 ][ 1 ] , this.width * 0.5 , this.height , drawPoints8[ 2 ][ 2 ] );
			render.RenderWallPolygonOpt( point1 , point5 , point3 , point6 , this.texture.data , shadow );
			render.RenderWallPolygonOpt( point5 , point2 , point6 , point4 , this.texture.data , shadow );
		} 
		
		if( !this.visibleSides[ 0 ] || !this.visibleSides[ 1 ] ) return;
		//Потолок
		if( drawPoints1[ 0 ][ 1 ] > heightH && 
			drawPoints1[ 1 ][ 1 ] > heightH && 
			drawPoints3[ 0 ][ 1 ] > heightH && 
			drawPoints3[ 1 ][ 1 ] > heightH ) {
				
				
				
				let point1 = CreatePointUVZ( drawPoints1[ 0 ][ 0 ] , drawPoints1[ 0 ][ 1 ] , 0                       , 0 , drawPoints1[ 0 ][ 2 ] );
				let point2 = CreatePointUVZ( drawPoints1[ 1 ][ 0 ] , drawPoints1[ 1 ][ 1 ] , this.uvPoints[ 0 ][ 0 ] , 0 , drawPoints1[ 1 ][ 2 ] );
				let point3 = CreatePointUVZ( drawPoints3[ 0 ][ 0 ] , drawPoints3[ 0 ][ 1 ] , 0                       , this.width , drawPoints3[ 0 ][ 2 ] );
				let point4 = CreatePointUVZ( drawPoints3[ 1 ][ 0 ] , drawPoints3[ 1 ][ 1 ] , this.uvPoints[ 0 ][ 0 ] , this.width , drawPoints3[ 1 ][ 2 ] );
				let point5 = CreatePointUVZ( drawPoints5[ 0 ][ 0 ] , drawPoints5[ 0 ][ 1 ] , this.uvPoints[ 0 ][ 0 ] * 0.5 , 0 , drawPoints5[ 0 ][ 2 ] );
				let point6 = CreatePointUVZ( drawPoints6[ 0 ][ 0 ] , drawPoints6[ 0 ][ 1 ] , this.uvPoints[ 0 ][ 0 ] * 0.5 , this.width , drawPoints6[ 0 ][ 2 ] );
				let point7 = CreatePointUVZ( drawPoints7[ 0 ][ 0 ] , drawPoints7[ 0 ][ 1 ] , 0 , this.width * 0.5 , drawPoints7[ 0 ][ 2 ] );
				let point8 = CreatePointUVZ( drawPoints8[ 0 ][ 0 ] , drawPoints8[ 0 ][ 1 ] , this.uvPoints[ 0 ][ 0 ] , this.width * 0.5 , drawPoints8[ 0 ][ 2 ] );
				let point9 = CreatePointUVZ( drawPoints8[ 1 ][ 0 ] , drawPoints8[ 1 ][ 1 ] , this.uvPoints[ 0 ][ 0 ] * 0.5 , this.width * 0.5 , drawPoints8[ 1 ][ 2 ] );
				
				//render.RenderTexturedFloorDoomOpt( point1 , point2 , point3 , point4 , this.texture.data , shadow );
				render.RenderTriangleScanline( point1 , point5 , point9 , this.texture.data , shadow );
				render.RenderTriangleScanline( point9 , point7 , point1 , this.texture.data , shadow );
				render.RenderTriangleScanline( point7 , point3 , point6 , this.texture.data , shadow );
				render.RenderTriangleScanline( point6 , point9 , point7 , this.texture.data , shadow );
				render.RenderTriangleScanline( point5 , point9 , point2 , this.texture.data , shadow );
				render.RenderTriangleScanline( point2 , point8 , point9 , this.texture.data , shadow );
				render.RenderTriangleScanline( point6 , point4 , point9 , this.texture.data , shadow );
				render.RenderTriangleScanline( point9 , point8 , point4 , this.texture.data , shadow );
			} 
		//Пол
		if( drawPoints1[ 2 ][ 1 ] < heightH && 
			drawPoints1[ 3 ][ 1 ] < heightH && 
			drawPoints3[ 2 ][ 1 ] < heightH && 
			drawPoints3[ 3 ][ 1 ] < heightH ) {

				let point1 = CreatePointUVZ( drawPoints1[ 2 ][ 0 ] , drawPoints1[ 2 ][ 1 ] , 0                       , 0 , drawPoints1[ 2 ][ 2 ] );
				let point2 = CreatePointUVZ( drawPoints1[ 3 ][ 0 ] , drawPoints1[ 3 ][ 1 ] , this.uvPoints[ 0 ][ 0 ] , 0 , drawPoints1[ 3 ][ 2 ] );
				let point3 = CreatePointUVZ( drawPoints3[ 2 ][ 0 ] , drawPoints3[ 2 ][ 1 ] , 0                       , this.width , drawPoints3[ 2 ][ 2 ] );
				let point4 = CreatePointUVZ( drawPoints3[ 3 ][ 0 ] , drawPoints3[ 3 ][ 1 ] , this.uvPoints[ 0 ][ 0 ] , this.width , drawPoints3[ 3 ][ 2 ] );
				let point5 = CreatePointUVZ( drawPoints5[ 2 ][ 0 ] , drawPoints5[ 2 ][ 1 ] , this.uvPoints[ 0 ][ 0 ] * 0.5 , 0 , drawPoints5[ 2 ][ 2 ] );
				let point6 = CreatePointUVZ( drawPoints6[ 2 ][ 0 ] , drawPoints6[ 2 ][ 1 ] , this.uvPoints[ 0 ][ 0 ] * 0.5 , this.width , drawPoints6[ 2 ][ 2 ] );
				let point7 = CreatePointUVZ( drawPoints7[ 2 ][ 0 ] , drawPoints7[ 2 ][ 1 ] , 0 , this.width * 0.5 , drawPoints7[ 2 ][ 2 ] );
				let point8 = CreatePointUVZ( drawPoints8[ 2 ][ 0 ] , drawPoints8[ 2 ][ 1 ] , this.uvPoints[ 0 ][ 0 ] , this.width * 0.5 , drawPoints8[ 2 ][ 2 ] );
				let point9 = CreatePointUVZ( drawPoints8[ 3 ][ 0 ] , drawPoints8[ 3 ][ 1 ] , this.uvPoints[ 0 ][ 0 ] * 0.5 , this.width * 0.5 , drawPoints8[ 3 ][ 2 ] );
				
				//render.RenderTexturedFloorDoomOpt( point1 , point2 , point3 , point4 , this.texture.data , shadow );
				render.RenderTriangleScanline( point1 , point5 , point9 , this.texture.data , shadow );
				render.RenderTriangleScanline( point9 , point7 , point1 , this.texture.data , shadow );
				render.RenderTriangleScanline( point7 , point3 , point6 , this.texture.data , shadow );
				render.RenderTriangleScanline( point6 , point9 , point7 , this.texture.data , shadow );
				render.RenderTriangleScanline( point5 , point9 , point2 , this.texture.data , shadow );
				render.RenderTriangleScanline( point2 , point8 , point9 , this.texture.data , shadow );
				render.RenderTriangleScanline( point6 , point4 , point9 , this.texture.data , shadow );
				render.RenderTriangleScanline( point9 , point8 , point4 , this.texture.data , shadow );
				//render.RenderTexturedFloorDoomOpt( point1 , point2 , point3 , point4 , this.texture.data , shadow );
				//render.RenderTexturedFloorDoomOpt( drawPoints1[ 2 ] , drawPoints1[ 3 ] , drawPoints3[ 2 ] , drawPoints3[ 3 ] , texture.data , lights );
				//render.RenderTriangleScanline( drawPoints1[ 2 ] , drawPoints1[ 3 ] , drawPoints3[ 2 ] , texture.data );
				//render.RenderTriangleScanline( drawPoints3[ 2 ] , drawPoints3[ 3 ] , drawPoints1[ 3 ] , texture.data );
			} 
		
	}
	// Clip ( p1 , p2 ) {
		// const intersection = CreateVector3F();
		// // Вектор от камеры к точкам
		// const p1_x = p1[ 0 ] - cameraPosition[ 0 ];
		// const p1_z = p1[ 2 ] - cameraPosition[ 2 ];
		// const p2_x = p2[ 0 ] - cameraPosition[ 0 ]; 
		// const p2_z = p2[ 2 ] - cameraPosition[ 2 ];
		
		// // Dot products с направлением камеры
		// const dot1 = p1_x * camNormal[ 0 ] + p1_z * camNormal[ 2 ];
		// const dot2 = p2_x * camNormal[ 0 ] + p2_z * camNormal[ 2 ];
		
		// // P1 находится на расстоянии dot1 от плоскости
		// // P2 находится на расстоянии dot2 от плоскости
		// // Плоскость находится на расстоянии 0 (прямо перед камерой)
		
		// // t = расстояние от P1 до плоскости / общее расстояние между точками
		// const t = dot1 / ( dot1 - dot2 );
		
		// intersection[ 0 ] = p1[ 0 ] + t * ( p2[ 0 ] - p1[ 0 ] );
		// intersection[ 2 ] = p1[ 2 ] + t * ( p2[ 2 ] - p1[ 2 ] );
		
		// return intersection;
	// }
}