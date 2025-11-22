class LineExtractor {
	stride;
	visited;
    constructor() {
        
    }
	Init( imageData ) {
		this.imageData = imageData;
        this.width     = imageData.width;
		this.stride    = this.width * 4;
        this.height    = imageData.height;
        this.visited     = new Uint8Array( imageData.width * imageData.height );
        this.endPoints = []; // Только начала и концы линий
	}

    // Находит только конечные точки линий
    FindLines() {
		let lines = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                let pixel = this.GetPixel( x , y );
				let key   = y * this.width + x;
				if( this.CheckPixel( pixel ) && !this.visited[ key ] ) {
					this.visited[ key ] = 1;
					let direction = this.GetLineDirection( x , y );
					let start     = this.Search( x , y , direction[ 0 ] , direction[ 1 ] );
					let end       = this.Search( x , y , -direction[ 0 ] , -direction[ 1 ] );
					if( start[ 0 ] != end[ 0 ] && start[ 1 ] != end[ 1 ] )lines.push( [ start , end ] );
				}
            }
        }
		return lines;
    }
	GetLineDirection( x , y ) {
		let direction = new Int8Array( 2 ); // 0 - x , 1 - y
		direction[ 0 ] = 0;
		direction[ 1 ] = 0;
		for( let nx = -1; nx < 2; nx++ ) {
			for( let ny = -1; ny < 2; ny++ ) {
				if( nx == 0 && ny == 0 ) continue;
				let pixel = this.GetPixel( x + nx , y + ny );
				if( this.CheckPixel( pixel ) ) {
					direction[ 0 ] = nx;
					direction[ 1 ] = ny;
					return direction;
				}
			}
		}
		return direction;
	}
	GetPixel( x , y ) {
		let pixelPointer = this.stride * y + x * 4;
		let pixel        = new Uint8Array( 4 );
		//
		pixel[ 0 ] = this.imageData.data[ pixelPointer ];
		pixel[ 1 ] = this.imageData.data[ pixelPointer + 1 ];
		pixel[ 2 ] = this.imageData.data[ pixelPointer + 2 ];
		pixel[ 3 ] = this.imageData.data[ pixelPointer + 3 ];
		return pixel;
	}
	Search( x , y , dirX , dirY ) {
		if( dirX == 0 && dirY == 0 ) return [ x , y ];
		let key = y * this.width + x;
		
		let coords    = [ x , y ];
		let nextPixel = this.GetPixel( x + 1 * dirX , y + 1 * dirY );
		if( this.CheckPixel( nextPixel ) ) {
			//console.log( nextPixel );
			coords = this.Search( x + 1 * dirX , y + 1 * dirY , dirX , dirY );
		}
		this.visited[ key ] = 1;
		return coords;
	}
	
	CheckPixel( pixel ) {
		return ( pixel[ 3 ] > 50 );
	}

    
}