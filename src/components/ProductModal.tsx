import React, { useState, useEffect } from 'react';
import { X, Star, ShoppingCart, Heart, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Product } from '../types/index';
import { useCart } from '../contexts/CartContext';
import { useWishlist } from '../contexts/WishlistContext';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Review } from '../types/index';
import WhatsAppInquiryButton from './WhatsAppInquiryButton';


interface ProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSignInRequired?: () => void; // Callback to open sign-in modal
}

const ProductModal: React.FC<ProductModalProps> = ({ product, isOpen, onClose }) => {
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [reviews, setReviews] = React.useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = React.useState(false);
  const [reviewError, setReviewError] = React.useState<string | null>(null);
  const [rating, setRating] = React.useState(0);
  const [comment, setComment] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [pendingReview, setPendingReview] = React.useState<{ rating: number; comment: string } | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [subcategoryName, setSubcategoryName] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    if (product) {
      const fetchCategoryData = async () => {
        if (product.category_id) {
          const { data, error } = await supabase
            .from('categories')
            .select('name')
            .eq('id', product.category_id)
            .single();
          if (!error && data) {
            setCategoryName(data.name);
          }
        }
        if (product.subcategory_id) {
          const { data, error } = await supabase
            .from('subcategories')
            .select('name')
            .eq('id', product.subcategory_id)
            .single();
          if (!error && data) {
            setSubcategoryName(data.name);
          }
        }
      };

      fetchCategoryData();
    }
  }, [product]);

  useEffect(() => {
    if (product) {
      setCurrentImageIndex(0);
    }
  }, [product]);

  React.useEffect(() => {
    if (product?.id) {
      console.log('ProductModal: Product changed, fetching reviews for:', product.id);
      fetchReviews();
      
      // Check for pending review data for this product
      const pendingReviewData = localStorage.getItem('pendingReview');
      console.log('ProductModal: Checking for pending review data:', pendingReviewData);
      
      if (pendingReviewData) {
        try {
          const pending = JSON.parse(pendingReviewData);
          console.log('ProductModal: Parsed pending review data:', pending);
          
          if (pending.productId === product.id) {
            console.log('ProductModal: Found matching pending review, restoring data');
            // Restore the pending review data
            setRating(pending.rating);
            setComment(pending.comment);
            setPendingReview({ rating: pending.rating, comment: pending.comment });
            console.log('ProductModal: Restored rating:', pending.rating, 'comment:', pending.comment);
            // Clear the localStorage data
            localStorage.removeItem('pendingReview');
            console.log('ProductModal: Cleared pending review from localStorage');
          } else {
            console.log('ProductModal: Pending review product ID mismatch:', pending.productId, 'vs', product.id);
          }
        } catch (error) {
          console.error('ProductModal: Error parsing pending review data:', error);
        }
      } else {
        console.log('ProductModal: No pending review data found');
      }
    }
    // eslint-disable-next-line
  }, [product?.id]);

  // Check for pending review after login
  React.useEffect(() => {
    if (user && profile && pendingReview && product) {
      submitPendingReview();
    }
  }, [user, profile, pendingReview, product]);

  async function fetchReviews() {
    setLoadingReviews(true);
    setReviewError(null);
    
    console.log('Fetching reviews for product:', product!.id);
    
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        profiles!reviews_user_id_fkey (
          id,
          first_name,
          last_name
        )
      `)
      .eq('product_id', product!.id)
      .order('created_at', { ascending: false });
    
    console.log('Supabase query result:', { data, error });
    
    if (error) {
      console.error('Error fetching reviews:', error);
      setReviewError('Failed to load reviews');
    } else {
      console.log('Reviews fetched successfully:', data);
    }
    
    setReviews(data || []);
    setLoadingReviews(false);
  }

  async function submitPendingReview() {
    if (!user || !profile || !pendingReview || !product) return;
    
    console.log('Submitting pending review:', { user_id: user.id, product_id: product.id, ...pendingReview });
    
    setSubmitting(true);
    setReviewError(null);
    const { data, error } = await supabase.from('reviews').insert({
      user_id: user.id,
      product_id: product.id,
      rating: pendingReview.rating,
      comment: pendingReview.comment,
    });
    
    console.log('Pending review submission result:', { data, error });
    
    setSubmitting(false);
    if (error) {
      console.error('Error submitting pending review:', error);
      setReviewError('Failed to submit review');
    } else {
      console.log('Pending review submitted successfully, refreshing reviews...');
      setPendingReview(null);
      fetchReviews();
    }
  }

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    
    // Check if user is logged in first
    if (!user || !profile) {
      console.log('User not logged in, storing pending review and redirecting to sign-in');
      
      // Store pending review data in localStorage with current page info
      const pendingReviewData = {
        productId: product!.id,
        rating,
        comment,
        currentPage: window.location.pathname + window.location.search, // Store full current URL
        timestamp: Date.now()
      };
      console.log('Storing pending review data:', pendingReviewData);
      localStorage.setItem('pendingReview', JSON.stringify(pendingReviewData));
      
      setRating(0);
      setComment('');
      onClose(); // Close the product modal
      
      // Navigate to sign-in with return URL
      navigate(`/auth?returnTo=product&productId=${product!.id}&returnPage=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }

    // Only validate rating and comment for logged-in users
    if (rating < 1 || rating > 5) {
      setReviewError('Please select a rating.');
      return;
    }
    
    console.log('Submitting review:', { user_id: user.id, product_id: product!.id, rating, comment });
    
    setSubmitting(true);
    setReviewError(null);
    const { data, error } = await supabase.from('reviews').insert({
      user_id: user.id,
      product_id: product!.id,
      rating,
      comment,
    });
    
    console.log('Review submission result:', { data, error });
    
    setSubmitting(false);
    if (error) {
      console.error('Error submitting review:', error);
      setReviewError('Failed to submit review');
    } else {
      console.log('Review submitted successfully, refreshing reviews...');
      setRating(0);
      setComment('');
      fetchReviews();
    }
  }

  // Calculate average rating
  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  if (!isOpen || !product) return null;

  const handleAddToCart = () => {
    addToCart(product);
  };

  const handleWishlistToggle = () => {
    if (isInWishlist(product.id)) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
    }
  };

  const discountPercentage = product.original_price 
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[95vh] overflow-y-auto transition-all duration-300">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Product Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Product Image */}
            <div className="space-y-4">
              <div className="relative flex items-center justify-center">
                <img
                  src={product.product_images && product.product_images.length > 0 ? product.product_images[currentImageIndex].image_url : product.image_url as string}
                  alt={product.name}
                  className="w-full h-full max-w-full max-h-[600px] object-contain rounded-xl bg-gray-50 border"
                />
                
                {product.product_images && product.product_images.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentImageIndex((prevIndex) => (prevIndex === 0 ? product.product_images!.length - 1 : prevIndex - 1))}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/50 hover:bg-white/80 rounded-full p-2 transition-colors"
                    >
                      <ChevronLeft className="w-6 h-6 text-gray-800" />
                    </button>
                    <button
                      onClick={() => setCurrentImageIndex((prevIndex) => (prevIndex === product.product_images!.length - 1 ? 0 : prevIndex + 1))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/50 hover:bg-white/80 rounded-full p-2 transition-colors"
                    >
                      <ChevronRight className="w-6 h-6 text-gray-800" />
                    </button>
                  </>
                )}
                
                {/* Badges */}
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  {product.is_bestseller && (
                    <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                      Bestseller
                    </span>
                  )}
                  {discountPercentage > 0 && (
                    <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                      -{discountPercentage}% OFF
                    </span>
                  )}
                </div>
              </div>
              {product.product_images && product.product_images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {product.product_images.map((image, index) => (
                    <img
                      key={index}
                      src={image.image_url}
                      alt={`${product.name} thumbnail ${index + 1}`}
                      className={`w-20 h-20 object-cover rounded-lg cursor-pointer border-2 ${currentImageIndex === index ? 'border-blue-600' : 'border-transparent'}`}
                      onClick={() => setCurrentImageIndex(index)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="space-y-6">
              <div>
                <p className="text-sm text-blue-600 font-medium uppercase tracking-wide">
                  {subcategoryName || categoryName || ''}
                </p>
                <h1 className="text-3xl font-bold text-gray-900 mt-2">
                  {product.name}
                </h1>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < Math.floor(product.rating)
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-lg font-semibold text-gray-900">
                  {product.rating.toFixed(1)}
                </span>
                <span className="text-gray-600">
                  ({product.review_count.toLocaleString()} reviews)
                </span>
              </div>

              {/* Price */}
              <div className="space-y-2">
                <div className="flex flex-col gap-2">
                  {product.original_price && (
                    <span className="text-2xl text-gray-500 line-through">
                      KES {product.original_price.toLocaleString()}
                    </span>
                  )}
                  <span className="text-4xl font-bold text-gray-900">
                    KES {product.price.toLocaleString()}
                  </span>
                </div>
                {discountPercentage > 0 && (
                  <p className="text-green-600 font-semibold">
                    You save KES {(product.original_price! - product.price).toLocaleString()} ({discountPercentage}%)
                  </p>
                )}
              </div>

              {/* Stock Status */}
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${product.stock_quantity > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className={`font-medium ${product.stock_quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {product.stock_quantity > 0 ? 'In Stock' : 'Out of Stock'}
                </span>
              </div>
              <div className="mt-4">
                {/* WhatsApp Inquiry Button */}
                <WhatsAppInquiryButton product={product} />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={handleAddToCart}
                  disabled={product.stock_quantity <= 0}
                  className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-xl font-semibold text-lg transition-all ${
                    product.stock_quantity > 0
                      ? 'bg-blue-600 hover:bg-blue-700 text-white transform hover:scale-105'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <ShoppingCart className="w-5 h-5" />
                  Add to Cart
                </button>
                <button 
                  onClick={handleWishlistToggle}
                  className="px-6 py-4 border-2 border-gray-300 rounded-xl hover:border-red-500 hover:text-red-500 transition-colors"
                >
                  <Heart className={`w-5 h-5 ${isInWishlist(product.id) ? 'text-red-500 fill-current' : ''}`} />
                </button>
              </div>

              {/* Benefits */}
              {/* <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Truck className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700">Free shipping on orders over $99</span>
                </div>
                <div className="flex items-center gap-3">
                  <RotateCcw className="w-5 h-5 text-blue-600" />
                  <span className="text-gray-700">30-day return policy</span>
                </div>
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-purple-600" />
                  <span className="text-gray-700">2-year manufacturer warranty</span>
                </div>
              </div> */}
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <div className="mt-8 border-t pt-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Description</h3>
              <ul className="space-y-4 list-disc pl-5 text-gray-700">
                {product.description.split(/✅/).filter(point => point.trim() !== '').map((point, index) => (
                  <li key={index} className="leading-relaxed">{point.trim()}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Specifications */}
          {product.specifications && Object.keys(product.specifications).length > 0 && (
            <div className="mt-8 border-t pt-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Specifications</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(product.specifications).map(([key, value]) => (
                  <div key={key} className="flex justify-between py-3 border-b border-gray-200 last:border-b-0">
                    <span className="font-medium text-gray-900">{key}</span>
                    <span className="text-gray-700">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviews Section */}
          <div className="mt-10 border-t pt-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Customer Reviews</h3>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-5 h-5 ${i < Math.round(averageRating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                  />
                ))}
              </div>
              <span className="text-lg font-semibold text-gray-900">{averageRating.toFixed(1)}</span>
              <span className="text-gray-600">({reviews.length} reviews)</span>
            </div>
            {/* Review Form */}
            <form onSubmit={submitReview} className="mb-8 bg-gray-50 p-4 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium">Your Rating:</span>
                {[1,2,3,4,5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setRating(star)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`w-6 h-6 ${star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                    />
                  </button>
                ))}
              </div>
              <textarea
                className="w-full border rounded-lg p-2 mb-2"
                rows={3}
                placeholder="Write your review..."
                value={comment}
                onChange={e => setComment(e.target.value)}
                required={!!user}
              />
              {reviewError && <div className="text-red-500 mb-2">{reviewError}</div>}
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : (user ? 'Submit Review' : 'Sign In to Review')}
              </button>
            </form>
            {/* Reviews List */}
            {loadingReviews ? (
              <div>Loading reviews...</div>
            ) : reviews.length === 0 ? (
              <div className="text-gray-500">No reviews yet. Be the first to review this product!</div>
            ) : (
              <ul className="space-y-6">
                {reviews.map((review) => (
                  <li key={review.id} className="bg-white rounded-xl p-4 shadow border">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-lg font-bold text-gray-700">
                        {review.profiles?.first_name?.[0] ?? 'U'}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">
                          {review.profiles ? `${review.profiles.first_name} ${review.profiles.last_name}` : 'User'}
                        </div>
                        <div className="flex items-center gap-1">
                          {[1,2,3,4,5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${star <= review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                            />
                          ))}
                        </div>
                      </div>
                      <span className="ml-auto text-xs text-gray-500">{new Date(review.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="text-gray-800 mt-2">{review.comment}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductModal;
