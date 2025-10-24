// mesa-magica-pwa-app/src/components/FeedbackModal.tsx
import React, { useState } from "react";
import { submitFeedback, SubmitFeedbackRequest } from "@/api/api";

interface FeedbackModalProps {
  isOpen: boolean;
  orderId: string;
  orderTotal: number;
  onClose: () => void;
  onSubmitted: () => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  orderId,
  orderTotal,
  onClose,
  onSubmitted,
}) => {
  const [step, setStep] = useState<'rating' | 'details' | 'contact' | 'success'>('rating');
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [categories, setCategories] = useState({
    food: 0,
    service: 0,
    ambiance: 0,
    value: 0,
  });
  const [contactMethod, setContactMethod] = useState<'skip' | 'email' | 'phone' | 'google'>('skip');
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleRatingSelect = (value: number) => {
    setRating(value);
  };

  const handleCategoryRating = (category: keyof typeof categories, value: number) => {
    setCategories(prev => ({ ...prev, [category]: value }));
  };

  const handleGoogleSignIn = () => {
    // TODO: Implement Google OAuth
    alert("Google Sign-In will be implemented with backend");
    // For now, simulate success
    setContactMethod('google');
    setEmail('user@gmail.com'); // Mock email
    setStep('success');
    handleSubmit(true);
  };

  const handleSubmit = async (isGoogleAuth: boolean = false) => {
    if (!isGoogleAuth && rating === 0) {
      setError("Please select a rating");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload: SubmitFeedbackRequest = {
        orderId,
        rating,
        comment: comment.trim() || undefined,
        categories: {
          food: categories.food || undefined,
          service: categories.service || undefined,
          ambiance: categories.ambiance || undefined,
          value: categories.value || undefined,
        },
      };

      // Add contact info based on method
      if (contactMethod === 'email' && email) {
        payload.email = email;
        payload.name = name || undefined;
      } else if (contactMethod === 'phone' && phone) {
        payload.phone = phone;
        payload.name = name || undefined;
      } else if (contactMethod === 'google') {
        payload.googleEmail = email;
      }

      const response = await submitFeedback(payload);
      console.log('Feedback submitted:', response);

      // Store in localStorage to prevent re-submission
      localStorage.setItem(`feedback-${orderId}`, JSON.stringify({
        submittedAt: new Date().toISOString(),
        rating,
      }));

      setStep('success');
      
      // Auto-close after 3 seconds
      setTimeout(() => {
        onSubmitted();
        onClose();
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Failed to submit feedback. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (currentRating: number, onSelect?: (value: number) => void, size: 'small' | 'large' = 'large') => {
    const starSize = size === 'large' ? 'w-12 h-12' : 'w-6 h-6';
    const displayRating = onSelect ? (hoveredRating || currentRating) : currentRating;
    
    return (
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onSelect?.(value)}
            onMouseEnter={() => onSelect && setHoveredRating(value)}
            onMouseLeave={() => onSelect && setHoveredRating(0)}
            className={`${starSize} transition-all ${onSelect ? 'cursor-pointer hover:scale-110' : ''}`}
            disabled={!onSelect}
          >
            <svg
              className={`w-full h-full transition-colors ${
                value <= displayRating
                  ? 'text-yellow-400 fill-yellow-400'
                  : 'text-gray-300 dark:text-neutral-700'
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-neutral-900 rounded-t-xl sm:rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-300/70 dark:border-white/20">
          <div>
            <h2 className="text-2xl font-bold">How was your experience?</h2>
            <p className="text-sm text-gray-600 dark:text-neutral-400 mt-1">
              Order #{orderId.slice(0, 8)} • ${orderTotal.toFixed(2)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Step 1: Overall Rating */}
          {step === 'rating' && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-lg font-semibold mb-4">Rate your overall experience</p>
                <div className="flex justify-center mb-4">
                  {renderStars(rating, handleRatingSelect, 'large')}
                </div>
                <p className="text-sm text-gray-600 dark:text-neutral-400">
                  {rating === 0 && "Select a rating"}
                  {rating === 1 && "😞 Poor"}
                  {rating === 2 && "😐 Fair"}
                  {rating === 3 && "🙂 Good"}
                  {rating === 4 && "😊 Very Good"}
                  {rating === 5 && "🤩 Excellent"}
                </p>
              </div>

              {rating > 0 && (
                <button
                  onClick={() => setStep('details')}
                  className="w-full bg-orange-500 text-white py-3 rounded-lg font-medium hover:bg-orange-600 transition-colors"
                >
                  Continue
                </button>
              )}
            </div>
          )}

          {/* Step 2: Detailed Feedback */}
          {step === 'details' && (
            <div className="space-y-6">
              <div>
                <p className="text-lg font-semibold mb-4">Tell us more (optional)</p>
                
                {/* Category Ratings */}
                <div className="space-y-4 mb-6">
                  <div>
                    <p className="text-sm font-medium mb-2">Food Quality</p>
                    <div className="flex justify-center">
                      {renderStars(categories.food, (v) => handleCategoryRating('food', v), 'small')}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Service</p>
                    <div className="flex justify-center">
                      {renderStars(categories.service, (v) => handleCategoryRating('service', v), 'small')}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Ambiance</p>
                    <div className="flex justify-center">
                      {renderStars(categories.ambiance, (v) => handleCategoryRating('ambiance', v), 'small')}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Value for Money</p>
                    <div className="flex justify-center">
                      {renderStars(categories.value, (v) => handleCategoryRating('value', v), 'small')}
                    </div>
                  </div>
                </div>

                {/* Comment */}
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share more details about your experience..."
                  className="w-full rounded-lg border border-zinc-300/70 dark:border-white/20 p-3 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[100px]"
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 dark:text-neutral-500 mt-1 text-right">
                  {comment.length}/500
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep('rating')}
                  className="flex-1 bg-gray-500 text-white py-3 rounded-lg font-medium hover:bg-gray-600 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep('contact')}
                  className="flex-1 bg-orange-500 text-white py-3 rounded-lg font-medium hover:bg-orange-600 transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Contact Information */}
          {step === 'contact' && (
            <div className="space-y-6">
              <div>
                <p className="text-lg font-semibold mb-2">Stay in touch (optional)</p>
                <p className="text-sm text-gray-600 dark:text-neutral-400 mb-4">
                  Help us serve you better by sharing your contact details
                </p>

                <div className="space-y-3">
                  {/* Google Sign-In */}
                  <button
                    onClick={handleGoogleSignIn}
                    className="w-full flex items-center justify-center gap-3 bg-white dark:bg-neutral-800 border-2 border-gray-300 dark:border-neutral-700 text-gray-700 dark:text-neutral-200 py-3 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300 dark:border-neutral-700"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white dark:bg-neutral-900 text-gray-500 dark:text-neutral-400">
                        Or
                      </span>
                    </div>
                  </div>

                  {/* Email Option */}
                  <button
                    onClick={() => setContactMethod('email')}
                    className={`w-full flex items-center justify-center gap-3 border-2 py-3 rounded-lg font-medium transition-colors ${
                      contactMethod === 'email'
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                        : 'border-gray-300 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Share via Email
                  </button>

                  {contactMethod === 'email' && (
                    <div className="space-y-3 pl-4">
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name (optional)"
                        className="w-full rounded-lg border border-zinc-300/70 dark:border-white/20 p-3 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your.email@example.com"
                        className="w-full rounded-lg border border-zinc-300/70 dark:border-white/20 p-3 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  )}

                  {/* Phone Option */}
                  <button
                    onClick={() => setContactMethod('phone')}
                    className={`w-full flex items-center justify-center gap-3 border-2 py-3 rounded-lg font-medium transition-colors ${
                      contactMethod === 'phone'
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                        : 'border-gray-300 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Share via Phone
                  </button>

                  {contactMethod === 'phone' && (
                    <div className="space-y-3 pl-4">
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name (optional)"
                        className="w-full rounded-lg border border-zinc-300/70 dark:border-white/20 p-3 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 (555) 000-0000"
                        className="w-full rounded-lg border border-zinc-300/70 dark:border-white/20 p-3 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  )}

                  {/* Skip Option */}
                  <button
                    onClick={() => setContactMethod('skip')}
                    className="w-full text-gray-600 dark:text-neutral-400 py-2 text-sm hover:underline"
                  >
                    Skip this step
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep('details')}
                  className="flex-1 bg-gray-500 text-white py-3 rounded-lg font-medium hover:bg-gray-600 transition-colors"
                  disabled={loading}
                >
                  Back
                </button>
                <button
                  onClick={() => handleSubmit(false)}
                  className="flex-1 bg-orange-500 text-white py-3 rounded-lg font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Success */}
          {step === 'success' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-2">Thank you!</h3>
              <p className="text-gray-600 dark:text-neutral-400 mb-4">
                Your feedback helps us improve our service
              </p>
              {renderStars(rating, undefined, 'large')}
              <p className="text-sm text-gray-500 dark:text-neutral-500 mt-4">
                Closing in a moment...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;