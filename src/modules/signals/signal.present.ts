export interface Author {
  id: number;
  firstName: string | null;
  lastName: string | null;
}

/** Author shown only when the signal is not anonymous. Pure; unit-tested. */
export function presentAuthor(
  isAnonymous: boolean,
  id: number,
  firstName: string | null,
  lastName: string | null,
): Author | null {
  return isAnonymous ? null : { id, firstName, lastName };
}
