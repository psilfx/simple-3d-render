function VectorNormalize3F( vector1 ) {
	let len = 1 / Math.hypot( vector1[ 0 ] , vector1[ 1 ] , vector1[ 2 ] );
	return MultiplyVector3F( vector1 , len );
}
function CreateVector3F( x = 0 , y = 0 , z = 0 ) {
	let vector3F = new Float16Array( 3 );
		vector3F[ 0 ] = x;
		vector3F[ 1 ] = y;
		vector3F[ 2 ] = z;
	return vector3F;
}
function CreateVector2F( x = 0 , y = 0 ) {
	let vector2F = new Float16Array( 2 );
		vector2F[ 0 ] = x;
		vector2F[ 1 ] = y;
	return vector2F;
}
function CreateVector3I( x = 0 , y = 0 , z = 0 ) {
	let vector3I = new Int16Array( 3 );
		vector3I[ 0 ] = x;
		vector3I[ 1 ] = y;
		vector3I[ 2 ] = z;
	return vector3I;
}
function DotVectors( vector1 , vector2 ) {
	return ( vector1[ 0 ] * vector2[ 0 ] ) + ( vector1[ 1 ] * vector2[ 1 ] ) + ( vector1[ 2 ] * vector2[ 2 ] );
}
function CrossVectorsF( vector1 , vector2 ) {
	let vector3F = new Float16Array( 3 );
		vector3F[ 0 ] = vector1[ 2 ] * vector2[ 1 ] - vector1[ 1 ] * vector2[ 2 ];
		vector3F[ 1 ] = vector1[ 0 ] * vector2[ 2 ] - vector1[ 2 ] * vector2[ 0 ];
		vector3F[ 2 ] = vector1[ 1 ] * vector2[ 0 ] - vector1[ 0 ] * vector2[ 1 ];
	return vector3F;
}
function CrossVectorsI( vector1 , vector2 ) {
	let vector3I = new Int16Array( 3 );
		vector3I[ 0 ] = vector1[ 2 ] * vector2[ 1 ] - vector1[ 1 ] * vector2[ 2 ];
		vector3I[ 1 ] = vector1[ 0 ] * vector2[ 2 ] - vector1[ 2 ] * vector2[ 0 ];
		vector3I[ 2 ] = vector1[ 1 ] * vector2[ 0 ] - vector1[ 0 ] * vector2[ 1 ];
	return vector3I;
}
function DistanceVectorsF( vector1 , vector2 ) {
	let subtract = SubtractVectorsF( vector1 , vector2 );
	return Math.hypot( subtract[ 0 ] , subtract[ 1 ] , subtract[ 2 ] );
}
function DistanceVectors2F( vector1 , vector2 ) {
	let subtract = SubtractVectorsF( vector1 , vector2 );
	return Math.hypot( subtract[ 0 ] , subtract[ 1 ] , 0 );
}
function DistanceVectorsI( vector1 , vector2 ) {
	let subtract = SubtractVectorsI( vector1 , vector2 );
	return Math.hypot( subtract[ 0 ] , subtract[ 1 ] , subtract[ 2 ] );
}
function SubtractVectors2F( vector1 , vector2 ) {
	let vector2F = new Float16Array( 2 );
		vector2F[ 0 ] = vector1[ 0 ] - vector2[ 0 ];
		vector2F[ 1 ] = vector1[ 1 ] - vector2[ 1 ];
	return vector2F;
}
function SubtractVectorsF( vector1 , vector2 ) {
	let vector3F = new Float16Array( 3 );
		vector3F[ 0 ] = vector1[ 0 ] - vector2[ 0 ];
		vector3F[ 1 ] = vector1[ 1 ] - vector2[ 1 ];
		vector3F[ 2 ] = vector1[ 2 ] - vector2[ 2 ];
	return vector3F;
}
function SubtractVectorsI( vector1 , vector2 ) {
	let vector3I = new Int16Array( 3 );
		vector3I[ 0 ] = vector1[ 0 ] - vector2[ 0 ];
		vector3I[ 1 ] = vector1[ 1 ] - vector2[ 1 ];
		vector3I[ 2 ] = vector1[ 2 ] - vector2[ 2 ];
	return vector3I;
}
function DevideVector3F( vector1 , devider ) {
	let vector3F = new Float16Array( 3 );
		vector3F[ 0 ] = vector1[ 0 ] / devider;
		vector3F[ 1 ] = vector1[ 1 ] / devider;
		vector3F[ 2 ] = vector1[ 2 ] / devider;
	return vector3F;
}
function DevideVector2F( vector1 , devider ) {
	let vector2F = new Float16Array( 2 );
		vector2F[ 0 ] = vector1[ 0 ] / devider;
		vector2F[ 1 ] = vector1[ 1 ] / devider;
	return vector2F;
}
function MultiplyVector2F( vector1 , multiply ) {
	let vector2F = new Float16Array( 2 );
		vector2F[ 0 ] = vector1[ 0 ] * multiply;
		vector2F[ 1 ] = vector1[ 1 ] * multiply;
	return vector2F;
}
function MultiplyVector3F( vector1 , multiply ) {
	let vector3F = new Float16Array( 3 );
		vector3F[ 0 ] = vector1[ 0 ] * multiply;
		vector3F[ 1 ] = vector1[ 1 ] * multiply;
		vector3F[ 2 ] = vector1[ 2 ] * multiply;
	return vector3F;
}
function PlusVector2F( vector1 , vector2  ) {
	let vector2F      = new Float16Array( 2 );
		vector2F[ 0 ] = vector1[ 0 ] + vector2[ 0 ];
		vector2F[ 1 ] = vector1[ 1 ] + vector2[ 1 ];
	return vector2F;
}
function PlusVector3F( vector1 , vector2  ) {
	let vector3F      = new Float16Array( 3 );
		vector3F[ 0 ] = vector1[ 0 ] + vector2[ 0 ];
		vector3F[ 1 ] = vector1[ 1 ] + vector2[ 1 ];
		vector3F[ 2 ] = vector1[ 2 ] + vector2[ 2 ];
	return vector3F;
}