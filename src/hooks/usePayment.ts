import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { 
  initiateMpesaPayment, 
  initiateCardPayment, 
  checkPaymentStatus,
  PaymentResponse,
  PaymentStatus
} from '../lib/intasend';

interface UsePaymentProps {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  onStatusChange?: (status: string) => void;
}

export const usePayment = ({ 
  onSuccess, 
  onError, 
  onStatusChange 
}: UsePaymentProps = {}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | string>(PaymentStatus.PENDING);

  // Process M-Pesa payment
  const processMpesaPayment = useCallback(async (
    phoneNumber: string, 
    amount: number, 
    orderId: string
  ): Promise<PaymentResponse> => {
    setIsLoading(true);
    setError(null);
    setPaymentStatus(PaymentStatus.PROCESSING);
    onStatusChange?.(PaymentStatus.PROCESSING);

    try {
      const result = await initiateMpesaPayment(phoneNumber, amount, orderId);
      
      if (result.success) {
        setPaymentStatus(PaymentStatus.PENDING);
        onStatusChange?.(PaymentStatus.PENDING);
        toast.success('M-Pesa payment initiated. Please check your phone to complete the payment.');
        onSuccess?.(result.data);
      } else {
        throw new Error(result.error || 'Failed to initiate M-Pesa payment');
      }
      
      return result;
    } catch (error: any) {
      console.error('M-Pesa payment error:', error);
      const errorMessage = error.message || 'Failed to process M-Pesa payment';
      setError(errorMessage);
      setPaymentStatus(PaymentStatus.FAILED);
      onStatusChange?.(PaymentStatus.FAILED);
      toast.error(errorMessage);
      onError?.(error);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [onSuccess, onError, onStatusChange]);

  // Process card payment
  const processCardPayment = useCallback(async (
    cardDetails: any,
    amount: number,
    email: string,
    phoneNumber: string,
    orderId?: string
  ): Promise<PaymentResponse> => {
    setIsLoading(true);
    setError(null);
    setPaymentStatus(PaymentStatus.PROCESSING);
    onStatusChange?.(PaymentStatus.PROCESSING);

    try {
      const result = await initiateCardPayment(
        cardDetails,
        amount,
        email,
        phoneNumber,
        orderId
      );
      
      if (result.success) {
        setPaymentStatus(PaymentStatus.COMPLETE);
        onStatusChange?.(PaymentStatus.COMPLETE);
        toast.success('Card payment processed successfully!');
        onSuccess?.(result.data);
      } else {
        throw new Error(result.error || 'Failed to process card payment');
      }
      
      return result;
    } catch (error: any) {
      console.error('Card payment error:', error);
      const errorMessage = error.message || 'Failed to process card payment';
      setError(errorMessage);
      setPaymentStatus(PaymentStatus.FAILED);
      onStatusChange?.(PaymentStatus.FAILED);
      toast.error(errorMessage);
      onError?.(error);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [onSuccess, onError, onStatusChange]);

  // Check payment status
  const verifyPayment = useCallback(async (invoiceId: string): Promise<PaymentResponse> => {
    if (!invoiceId) {
      const error = new Error('No invoice ID provided');
      setError(error.message);
      return { success: false, error: error.message };
    }

    setIsLoading(true);
    setError(null);
    setPaymentStatus(PaymentStatus.PROCESSING);
    onStatusChange?.(PaymentStatus.PROCESSING);

    try {
      const result = await checkPaymentStatus(invoiceId);
      
      if (result.success) {
        const status = result.status || result.data?.state;
        setPaymentStatus(status);
        onStatusChange?.(status);
        
        if (result.data?.isComplete) {
          toast.success('Payment completed successfully!');
          onSuccess?.(result.data);
        } else if (result.data?.isFailed) {
          toast.error('Payment failed. Please try again.');
        }
      } else {
        throw new Error(result.error || 'Failed to verify payment status');
      }
      
      return result;
    } catch (error: any) {
      console.error('Payment verification error:', error);
      const errorMessage = error.message || 'Failed to verify payment status';
      setError(errorMessage);
      setPaymentStatus(PaymentStatus.FAILED);
      onStatusChange?.(PaymentStatus.FAILED);
      toast.error(errorMessage);
      onError?.(error);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [onSuccess, onError, onStatusChange]);

  // Reset payment state
  const resetPayment = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setPaymentStatus(PaymentStatus.PENDING);
    onStatusChange?.(PaymentStatus.PENDING);
  }, [onStatusChange]);

  return {
    isLoading,
    error,
    paymentStatus,
    processMpesaPayment,
    processCardPayment,
    verifyPayment,
    resetPayment,
    isProcessing: paymentStatus === PaymentStatus.PROCESSING,
    isComplete: [
      PaymentStatus.COMPLETE, 
      'COMPLETED', 
      'SUCCESS', 
      'PAID'
    ].includes(paymentStatus as string),
    isPending: [
      PaymentStatus.PENDING, 
      'PENDING', 
      'PROCESSING'
    ].includes(paymentStatus as string),
    isFailed: [
      PaymentStatus.FAILED, 
      'FAILED', 
      'ERROR', 
      'DECLINED', 
      'CANCELLED'
    ].includes(paymentStatus as string)
  };
};

export default usePayment;
