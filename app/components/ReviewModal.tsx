import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { LightButton, GoldButton } from './Button';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReviewSubmitted: () => void;
}

export function ReviewModal({ isOpen, onClose, onReviewSubmitted }: ReviewModalProps) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleStarClick = (starRating: number) => {
    setRating(starRating);
  };

  const handleSubmit = async () => {
    if (!user) {
      setError('You must be logged in to submit a review');
      return;
    }

    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    if (description.trim().length < 10) {
      setError('Please provide a description (at least 10 characters)');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // First, get the user's ID from the users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (userError || !userData) {
        setError('User profile not found. Please try again.');
        return;
      }

      const { error: insertError } = await supabase
        .from('reviews')
        .insert({
          user_id: userData.id,
          username: user.user_metadata?.full_name || user.email || 'Anonymous',
          rating,
          description: description.trim()
        });

      if (insertError) {
        if (insertError.code === '23505') {
          setError('You have already submitted a review');
        } else {
          setError('Failed to submit review. Please try again.');
        }
        return;
      }

      // Reset form
      setRating(0);
      setDescription('');
      onReviewSubmitted();
      onClose();
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setRating(0);
      setDescription('');
      setError('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-gray-900 rounded-xl p-8 max-w-md w-full border border-yellow-500/20">
        <div className="text-center">
          {/* Header */}
          <div className="mb-6">
            <div className="text-4xl mb-4">⭐</div>
            <h2 className="text-2xl font-bold text-white mb-2">Rate us</h2>
            <p className="text-gray-300 text-sm">
              Share your experience with our casino platform
            </p>
          </div>

          {/* Star Rating */}
          <div className="mb-6">
            <p className="text-white text-sm mb-3">How would you rate your experience?</p>
            <div className="flex justify-center space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleStarClick(star)}
                  className={`text-3xl transition-all duration-200 hover:scale-110 cursor-pointer ${
                    star <= rating ? 'text-yellow-400' : 'text-gray-400'
                  }`}
                  disabled={isSubmitting}
                >
                  {star <= rating ? '⭐' : '☆'}
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-yellow-400 text-sm mt-2">
                {rating === 1 && 'Poor'}
                {rating === 2 && 'Fair'}
                {rating === 3 && 'Good'}
                {rating === 4 && 'Very Good'}
                {rating === 5 && 'Excellent'}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="mb-6">
            <label htmlFor="description" className="block text-white text-sm mb-2 text-left">
              Tell us about your experience
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Share your thoughts about the games, interface, or overall experience..."
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500 transition-colors resize-none"
              rows={4}
              maxLength={500}
              disabled={isSubmitting}
            />
            <div className="text-right text-gray-400 text-xs mt-1">
              {description.length}/500
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <GoldButton
              onClick={handleSubmit}
              disabled={isSubmitting || rating === 0 || description.trim().length < 10}
              className="w-full"
            >
              {isSubmitting ? 'Submitting...' : 'Submit review'}
            </GoldButton>
            
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 