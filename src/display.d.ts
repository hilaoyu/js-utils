export interface DisplayStatic  {
	typeWidth(type : string): Number;
	windowWidth(): Number;
	prevType(type : string): String|null;
	nextType(type : string): String|null;
	is(type ?: string): String|Boolean;
	lt(type : string): Boolean;
	gt(type : string): Boolean;

}

export const Display:DisplayStatic
export default Display
