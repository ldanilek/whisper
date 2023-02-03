
// Attempt to prevent timing attacks when checking string equality
// of password hashes, access keys, etc.
// Timing does not depend on string characters (although it may depend on lengths).
// V8 doesn't appear to have an equivalent of node.timingSafeEqual built in,
// and this isn't perfect.
export function timingSafeEqual(s1: string, s2: string): boolean {
  if (s1.length !== s2.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < s1.length; i++) {
    const charDiff = s1[0] === s2[0] ? 0 : 1;
    // bitwise operation has no short-circuit.
    diff |= charDiff;
  }
  return diff === 0;
}
