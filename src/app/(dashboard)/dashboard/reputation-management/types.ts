export interface GbpReviewRow {
  id: number;
  locationId: number;
  googleReviewId: string;
  authorName: string;
  authorPhotoUrl: string | null;
  rating: number;
  comment: string | null;
  replyText: string | null;
  replyUpdatedAt: Date | string | null;
  syncStatus: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  location: { id: number; name: string };
}
