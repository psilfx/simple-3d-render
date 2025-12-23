class Controls {
	left    = false;
	right   = false;
	up      = false;
	down    = false;
	esc     = false;
	spell   = false;
	restart = false;
	fullscr = false;
	debug   = false;
	
	arrows  = false; //Нажата какая либо из стрелок
	
	mouse     = false;
	mouseMove = { x : 0 , y : 0 };
	
	Input( key , bool ) {
		switch ( key ) {
			case 87: //Верх
				this.up   = bool;
			break;
			case 83: //Низ
				this.down = bool;
			break;
			case 65: //Лево
				this.left = bool;
			break;
			case 68: //Право
				this.right = bool;
			break;
			case 90: //Заклинание z
				this.spell = bool;
			break;
			case 82: //Перезапуск r
				this.restart = bool;
			break;
			case 70: //Полный экран
				this.fullscr = bool;
			break;
			case 27: //Escape
				this.esc = bool;
			break;
			case 68: //Debug клавиша d
				this.debug = bool;
			break;
		}
		this.arrows = ( this.up || this.down || this.left || this.right );
	}
	Mouse( x , y ) {
		this.mouse = true;
		this.mouseMove.x = x;
		this.mouseMove.y = y;
	}
	MouseButton( buttonId , val ) {
		this.mouseButton   = val;
		this.mouseButtonId = buttonId;
	}
	Update() {
		const forward = 1 * ( this.up ) + ( -1 ) * ( this.down );
		const strafe  = -0.7 * ( this.left ) + 0.7 * ( this.right );
		const movef   = ( strafe ) ? forward * 0.5 : forward;
		const rotate  = rotSpeed * ( this.mouseMove.x > 0 ? 1 : -1 ) * ( this.mouse );
		if( strafe )           camAnim.UpdateY();
		if( movef && !strafe ) camAnim.Update();
		camera.MoveForward( movef ) ;
		camera.MoveStrafe( strafe );
		camera.Rotate( rotate );
		this.mouse = false;
	}
}