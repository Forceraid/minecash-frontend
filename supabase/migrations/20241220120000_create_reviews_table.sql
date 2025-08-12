-- Create reviews table for storing user reviews
CREATE TABLE IF NOT EXISTS public.reviews (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  description text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Ensure one review per user
  unique(user_id)
);

-- Add table comment
COMMENT ON TABLE public.reviews IS 'User reviews with star ratings and descriptions. Each user can only submit one review.';

-- Enable Row Level Security
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Select policy: Anyone can read reviews (public display)
CREATE POLICY "Reviews are publicly viewable"
ON public.reviews
FOR SELECT
TO anon, authenticated
USING (true);

-- Insert policy: Only authenticated users can create reviews
CREATE POLICY "Authenticated users can create reviews"
ON public.reviews
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Update policy: Users can only update their own reviews
CREATE POLICY "Users can update their own reviews"  
ON public.reviews
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Delete policy: Users can delete their own reviews
CREATE POLICY "Users can delete their own reviews"
ON public.reviews
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews(created_at desc);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON public.reviews(user_id);