class Texture {
	width  = 64;
	height = 64;
	stride = 256;
	data   = new Uint8Array( 64 * 64 * 4 );
	src    = "";
	loaded = false;
	constructor( src ) {
		this.src = src;
	}
	Load() {
		let img        = new Image();
			img.src    = this.src;
			img.onload = () => {
				this.loaded = true;
				//Канвас для загрузки текстуры
				this.width         = img.width;
				this.height        = img.height;
				this.stride        = this.width * 4;
				this.data          = new Uint8Array( this.width * this.height * 4 );
				let tcontext       = tcanvas.getContext( '2d' , { willReadFrequently: true }  );
					tcanvas.width  = this.width;
					tcanvas.height = this.height;
					tcontext.clearRect( 0 , 0 , tcanvas.width, tcanvas.height );
					tcontext.drawImage( img , 0 , 0 );
				//Сохраняет пиксели изображения
				let imageData = tcontext.getImageData( 0 , 0 , this.width , this.height );
				let pixelData = imageData.data;
				for( let p = 0; p < pixelData.length; p++ ) {
					this.data[ p ] = pixelData[ p ];
				}
			}
	}
}