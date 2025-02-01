/**
 * Convert a union type to an intersection type
 */
export type UnionToIntersection<Union> = (
  Union extends unknown
		? (distributedUnion: Union) => void
		: never
) extends ((mergedIntersection: infer Intersection) => void)
	? Intersection & Union
	: never;