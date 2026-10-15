/**
 * "admin": runs the platform (reviews artists, accepts applications, reads inquiries) and manages their own art.
 * "artist": manages only their own artworks and submits their profile for review.
 * Guests are simply not signed in: they can view every approved artist's work, but can't log in.
 */
export type Role = "admin" | "artist";
